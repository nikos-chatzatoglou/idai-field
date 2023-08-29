defmodule FieldPublication.Replication do
  alias Phoenix.PubSub

  defmodule LogEntry do
    @enforce_keys [:name, :severity, :timestamp, :msg]
    defstruct [:name, :severity, :timestamp, :msg]
  end

  alias FieldPublication.{
    Replication.CouchReplication,
    FileService,
    Replication.Parameters
  }

  require Logger

  def start(%Parameters{} = params, broadcast_channel) do

    Task.Supervisor.start_child(FieldPublication.Replication.Supervisor, fn() ->
      replicate(params, broadcast_channel)
    end)
  end

  defp replicate(%Parameters{
      local_project_name: project_name
    } = parameters, channel) do

    publication_name = "#{project_name}_publication_#{Date.utc_today()}"

    broadcast(channel, %LogEntry{
      name: :started,
      severity: :ok,
      timestamp: DateTime.utc_now(),
      msg: "Starting database replication for #{project_name} as #{publication_name}."
    })

    parameters
    |> CouchReplication.start(publication_name, channel)
    |> case do
      {:ok, :completed} ->
        broadcast(channel, %LogEntry{
          name: :database_replication_finished,
          severity: :ok,
          timestamp: DateTime.utc_now(),
          msg: "Database replication has finished."
        })

        {:ok, %{couch_result: :successful}}
      {:error, name} = error ->
        broadcast(channel, %LogEntry{
          name: name,
          severity: :error,
          timestamp: DateTime.utc_now(),
          msg: "Database replication has failed."
        })

        error
    end
    |> case do
      {:ok, previous_results} ->
        parameters
        |> run_file_replication(publication_name, channel)
        |> case do
          {:error, name} = error ->
            broadcast(channel, %LogEntry{
              name: name,
              severity: :error,
              timestamp: DateTime.utc_now(),
              msg: "File replication has failed."
            })

            error
          {:ok, file_results} ->
            broadcast(channel, %LogEntry{
              name: :file_replication_finished,
              severity: :ok,
              timestamp: DateTime.utc_now(),
              msg: "File replication has finished."
            })

            {:ok, Map.put(previous_results, :file_results, file_results)}
        end
      error ->
        error
    end
    |> case do
      {:ok, previous_results} ->
        create_publication_metadata(project_name, publication_name)
        |> case do
          {:error, name} ->
            broadcast(channel, %LogEntry{
              name: name,
              severity: :ok,
              timestamp: DateTime.utc_now(),
              msg: "Publication's project configuration recreated."
            })

          {:ok, _val} ->
            broadcast(channel, %LogEntry{
              name: :publication_configuration_recreated,
              severity: :ok,
              timestamp: DateTime.utc_now(),
              msg: "Publication's project configuration recreated."
            })

            {:ok, Map.put(previous_results, :project_configuration_recreation, :success)}
          end
      error ->
        error
    end
    |> then(fn(result_or_error) ->
      broadcast(channel, {:result, result_or_error})
    end)
  end

  defp run_file_replication(%Parameters{
    source_url: source_url,
    source_project_name: source_project_name,
    source_user: source_user,
    source_password: source_password
  }, publication_name, broadcast_channel) do
    Logger.debug("Replicating images of #{source_url} as #{publication_name}")

    headers = [
      {"Content-Type", "application/json"},
      {"Authorization", "Basic #{"#{source_user}:#{source_password}" |> Base.encode64()}"}
    ]

    files_url = "#{source_url}/files/#{source_project_name}"

    Finch.build(
      :get,
      files_url,
      headers
    )
    |> Finch.request(FieldPublication.Finch)
    |> case do
      {:ok, %Finch.Response{body: body, status: 200}} ->
        target_path = FileService.get_publication_path(publication_name)

        File.mkdir_p!(target_path)

        {:ok, file_counter_pid} = Agent.start_link(fn -> %{overall: :nil, counter: 0} end)


        result =
          body
          |> Jason.decode!()
          |> Stream.reject(fn {_key, value} ->
            case value do
              %{"deleted" => true} ->
                true

              _ ->
                false
            end
          end)
          |> then(fn(file_list) ->

            file_count =
              file_list
              |> Enum.count()

            broadcast(broadcast_channel, %LogEntry{
              name: :overall_files,
              severity: :ok,
              timestamp: DateTime.utc_now(),
              msg: "#{file_count} files will get replicated"
            })

            Agent.update(file_counter_pid, fn state -> Map.put(state, :overall, file_count) end)

            file_list
          end)
          |> Enum.map(&write_file(&1, files_url, headers, target_path, file_counter_pid, broadcast_channel))

        {:ok, result}

      {:ok, %Finch.Response{status: 401}} ->
        {:error, :unauthorized}

      {:ok, %Finch.Response{status: 404}} ->
        {:error, :not_found}
    end
    |> case do
      {:ok, _} = success ->
        success
      {:error, _} = error ->
        error
    end
  end

  defp write_file({uuid, %{"variants" => variants}}, url, headers, project_directory, file_counter_pid, broadcast_channel) do
    status =
      variants
      |> Enum.map(fn %{"name" => variant_name} ->
        file_path = "#{project_directory}/#{variant_name}/#{uuid}"

        unless File.exists?(file_path) do
          Finch.build(
            :get,
            "#{url}/#{uuid}?type=#{variant_name}" |> IO.inspect(),
            headers
          )
          |> Finch.request(FieldPublication.Finch)
          |> case do
            {:ok, %Finch.Response{body: data, status: 200}} ->
              File.mkdir_p!("#{project_directory}/#{variant_name}")
              %{variant_name => File.write!(file_path, data)}
          end
        else
          :already_present
        end
      end)

    Agent.update(file_counter_pid, fn state -> Map.put(state, :counter, state[:counter] + 1) end)

    broadcast(broadcast_channel, {:file_processing, Agent.get(file_counter_pid, fn state -> state end)})

    %{uuid: uuid, status: status}
  end

  defp create_publication_metadata(project_name, publication_name) do

    url = Application.get_env(:field_publication, :couchdb_url)

    {:ok, full_config} = create_full_configuration(url, publication_name)

    metadata = %{
      publication_name => %{
        date: DateTime.to_iso8601(DateTime.now!("Etc/UTC")),
        configuration: full_config
      }
    }

    CouchService.retrieve_document(project_name)
    |> case do
      {:ok, %Finch.Response{status: 404}} ->
        CouchService.store_document(project_name, metadata)
      {:ok, %Finch.Response{body: body, status: 200}} ->
        updated =
          body
          |> Jason.decode!()
          |> then(fn(existing) ->
            existing
            |> Map.merge(metadata)
          end)

        CouchService.store_document(project_name, updated)
    end
  end

  defp create_full_configuration(url, publication_name) do
    System.cmd(
      "node",
      [
        Application.app_dir(
          :field_publication,
          "priv/publication_enricher/dist/createFullConfiguration.js"
        ),
        publication_name,
        url,
        Application.get_env(:field_publication, :couchdb_admin_name),
        Application.get_env(:field_publication, :couchdb_admin_password)
      ]
    )
    |> case do
      {full_configuration, 0} ->
        {:ok, Jason.decode!(full_configuration)}
    end
  end

  defp broadcast(channel, %LogEntry{severity: severity, msg: msg} = log_entry) do
    case severity do
      :error ->
        Logger.error(msg)
      _ ->
        Logger.debug(msg)
    end

    PubSub.broadcast(FieldPublication.PubSub, channel, {:replication_log, log_entry})
  end

  defp broadcast(channel, {:result, result}) do
    PubSub.broadcast(FieldPublication.PubSub, channel, {:replication_result, result})
  end

  defp broadcast(channel, {:file_processing, data}) do
    PubSub.broadcast(FieldPublication.PubSub, channel, {:file_processing, data})
  end
end
