defmodule FieldHub.Issues do
  alias FieldHub.{
    CouchService,
    FileStore,
    Project
  }

  @severity_ranking [:info, :warning, :error]

  defmodule Issue do
    @moduledoc """
    Simple struct for Issues.

    __Keys__
    - `type` an atom identifying the issue type.
    - `severity` severity of the issue, one of `[:info, :warning, :error]`.
    - `data` is expected to be a #{Map}, with arbitrary values that may provide some metadata concerning the Issue.
    """
    @enforce_keys [:type, :severity, :data]
    defstruct [:type, :severity, :data]
  end

  require Logger

  @moduledoc """
  Bundles a suite of evaluation functions that search for issues within projects.

  Field Hub concerns itself only with issues that can be derived from checking the projects' configurations.
  """

  @doc """
  Runs all defined evaluation functions on a project and returns a combined list of #{Issue}.

  __Parameters__
  - `project_identifier` the project's name.
  """
  def evaluate_all(project_identifier) do
    try do
      [
        evaluate_project_document(project_identifier),
        evaluate_images(project_identifier),
        evaluate_identifiers(project_identifier),
        evaluate_relations(project_identifier)
      ]
      |> Enum.concat()
    rescue
      e ->
        stack_trace = Exception.format(:error, e, __STACKTRACE__)
        Logger.error("Unexpected error while evaluating project '#{project_identifier}':")
        Logger.error(stack_trace)

        [
          %Issue{
            type: :unexpected_error,
            severity: :error,
            data: %{
              stack_trace: String.split(stack_trace, "\n")
            }
          }
        ]
    end
  end

  @doc """
  Checks if project's `project` document is present, and if a default map layer has been set. The latter can be used
  downstream by other applications as a default map background.

  __Parameters__
  - `project_identifier` the project's name.
  """
  def evaluate_project_document(project_identifier) do
    project_identifier
    |> Project.get_documents(["project"])
    |> case do
      [{:error, %{reason: :not_found}}] ->
        [
          %Issue{
            type: :no_project_document,
            severity: :error,
            data: %{reason: "Document with id 'project' not found."}
          }
        ]

      [{:error, %{reason: :deleted}}] ->
        [
          %Issue{
            type: :no_project_document,
            severity: :error,
            data: %{reason: "Document with id 'project' got deleted at some point."}
          }
        ]

      [{:ok, %{"resource" => resource} = _doc}] ->
        case resource do
          %{"relations" => %{"hasDefaultMapLayer" => []}} ->
            [%Issue{type: :no_default_project_map_layer, severity: :info, data: %{}}]

          %{"relations" => %{"hasDefaultMapLayer" => _values}} ->
            []

          _ ->
            [%Issue{type: :no_default_project_map_layer, severity: :info, data: %{}}]
        end
    end
  end

  @doc """
  Checks if all original images have been uploaded and compares thumbnail and original image file sizes (original images are
  expected to be larger in general). Also evaluates if copyright was set for all images.

  __Parameters__
  - `project_identifier` the project's name.
  """
  def evaluate_images(project_identifier) do
    try do
      project_identifier
      |> FileStore.file_index()
    rescue
      e -> e
    end
    |> case do
      %File.Error{reason: :enoent, path: path} ->
        [
          %Issue{
            type: :file_directory_not_found,
            severity: :error,
            data: %{path: path}
          }
        ]

      file_index ->
        project_identifier
        |> CouchService.get_docs_by_category(
          ["Image", "Photo", "Drawing"] ++ get_custom_image_categories(project_identifier)
        )
        |> Stream.map(fn image_document ->
          [
            compare_images_db_and_filestore(file_index, image_document),
            evaluate_image_copyright(image_document)
          ]
        end)
        |> Enum.concat()
        |> Enum.reject(fn val ->
          case val do
            :ok -> true
            _ -> false
          end
        end)
    end
  end

  defp compare_images_db_and_filestore(file_store_data, image_document) do
    issue_base_data = extract_image_metadata(image_document)

    file_store_data
    |> Map.get(issue_base_data.uuid)
    |> case do
      nil ->
        # Image data completely missing for document uuid.
        %Issue{
          type: :missing_original_image,
          severity: :warning,
          data: issue_base_data
        }

      %{variants: [%{name: :thumbnail_image}]} ->
        # Only thumbnail present for document uuid.
        %Issue{
          type: :missing_original_image,
          severity: :warning,
          data: issue_base_data
        }

      %{variants: [_, _] = variants} ->
        # If two variants (thumbnail and original) are present, check their sizes.
        thumbnail_size =
          variants
          |> Enum.find(fn %{name: variant_name} ->
            variant_name == :thumbnail_image
          end)
          |> Map.get(:size)

        original_size =
          variants
          |> Enum.find(fn %{name: variant_name} ->
            variant_name == :original_image
          end)
          |> Map.get(:size)

        case thumbnail_size do
          val when val >= original_size ->
            # Original image files should not be smaller than thumbnails.
            %Issue{
              type: :image_variants_size,
              severity: :info,
              data:
                Map.merge(
                  issue_base_data,
                  %{original_size: original_size, thumbnail_size: thumbnail_size}
                )
            }

          _ ->
            # Otherwise :ok.
            :ok
        end

      _ ->
        # Only original image found is :ok.
        :ok
    end
  end

  defp evaluate_image_copyright(%{
         "resource" => %{
           "imageRights" => _image_rights,
           "draughtsmen" => _draughtsmen
         }
       }) do
    :ok
  end

  defp evaluate_image_copyright(doc) do
    %Issue{
      type: :missing_image_copyright,
      severity: :warning,
      data: extract_image_metadata(doc)
    }
  end

  defp get_custom_image_categories(project_identifier) do
    project_identifier
    |> CouchService.get_docs_by_category(["Configuration"])
    |> Enum.to_list()
    |> case do
      [configuration] ->
        configuration["resource"]["forms"]
        |> Enum.map(fn {key, value} ->
          case value do
            %{"parent" => "Image"} ->
              key

            _ ->
              :reject
          end
        end)
        |> Enum.reject(fn val -> val == :reject end)

      _ ->
        []
    end
  end

  @doc """
  Checks for non unique `identifier` values.

  Every document in a Field project should have a unique value in `resource.identifier`. There may be some rare edge cases
  where two documents get the same identifier when two users create them separately. Field Hub as the central syncing target
  checks for these cases.

  __Parameters__
  - `project_identifier` the project's name.
  """
  def evaluate_identifiers(project_identifier) do
    query = %{
      selector: %{},
      fields: [
        "_id",
        "resource.identifier"
      ]
    }

    CouchService.get_find_query_stream(project_identifier, query)
    |> Enum.group_by(fn %{"resource" => %{"identifier" => identifier}} ->
      identifier
    end)
    |> Enum.filter(fn {_identifier, documents} ->
      case documents do
        [_single_doc] ->
          false

        _multiple_docs ->
          true
      end
    end)
    |> case do
      [] ->
        []

      groups ->
        Enum.map(groups, fn {identifier, docs} ->
          ids = Enum.map(docs, fn %{"_id" => id} -> id end)

          documents =
            Project.get_documents(project_identifier, ids)
            |> Enum.map(fn {:ok, doc} ->
              doc
            end)

          %Issue{
            type: :non_unique_identifiers,
            severity: :error,
            data: %{identifier: identifier, documents: documents}
          }
        end)
    end
  end

  @doc """
  Checks for unresolveable relations between documents.

  Historically, unresolveable relations were created by accident while directly manipulating the database (basically: deleting documents
  not through the iSkavo application, but directly in CouchDB/PouchDB).

  Unresolveable relations can also be created by incomplete synchronisation.

  __Parameters__
  - `project_identifier` the project's name.
  """
  def evaluate_relations(project_identifier) do
    query = %{
      selector: %{},
      fields: [
        "_id",
        "resource.relations"
      ]
    }

    uuid_relations_pairs =
      CouchService.get_find_query_stream(project_identifier, query)
      |> Enum.map(fn %{"_id" => uuid, "resource" => %{"relations" => relations}} ->
        referenced_uuids =
          relations
          |> Enum.map(fn {_relation_type, uuids} ->
            Enum.map(uuids, fn uuid ->
              uuid
            end)
          end)
          |> List.flatten()

        {uuid, referenced_uuids}
      end)

    all_existing_uuids =
      Enum.map(uuid_relations_pairs, fn {uuid, _relations} ->
        uuid
      end)

    all_referenced_uuids =
      Enum.reduce(uuid_relations_pairs, [], fn {_uuid, relations}, acc ->
        acc ++ relations
      end)
      |> Enum.uniq()

    all_missing_uuids = all_referenced_uuids -- all_existing_uuids

    uuid_relations_pairs
    |> Enum.reduce(%{}, fn {uuid, locally_referenced}, acc ->
      locally_referenced_not_missing = locally_referenced -- all_missing_uuids

      case locally_referenced -- locally_referenced_not_missing do
        [] ->
          acc

        missing_but_referenced ->
          referencing_document =
            project_identifier
            |> Project.get_documents([uuid])
            |> then(fn [ok: doc] ->
              doc
            end)

          missing_but_referenced
          |> Enum.reduce(%{}, fn missing, inner ->
            Map.update(inner, missing, [referencing_document], fn existing ->
              existing ++ [referencing_document]
            end)
          end)
          |> Map.merge(acc, fn _key, value_a, value_b ->
            value_a ++ value_b
          end)
      end
    end)
    |> Enum.map(fn {missing_uuid, referencing_documents} ->
      referenced_metadata =
        referencing_documents
        |> Enum.map(&extract_relation(&1, missing_uuid))

      %Issue{
        type: :unresolved_relation,
        severity: :error,
        data: %{
          missing: missing_uuid,
          referencing_docs: referenced_metadata
        }
      }
    end)
  end

  @doc """
  Sorts a list of issues by severity in the order `#{inspect(Enum.reverse(@severity_ranking))}`.

  __Parameters__
  - `issues` the list of issues.
  """
  def sort(issues) do
    issues
    |> Enum.sort(fn %{severity: severity_a}, %{severity: severity_b} ->
      Enum.find_index(
        @severity_ranking,
        fn val -> val == severity_a end
      ) >
        Enum.find_index(
          @severity_ranking,
          fn val -> val == severity_b end
        )
    end)
  end

  defp extract_core_metadata(%{
         "created" => created,
         "modified" => modified,
         "resource" => %{
           "id" => uuid,
           "category" => category,
           "identifier" => identifier
         }
       }) do
    %{
      uuid: uuid,
      category: category,
      identifier: identifier,
      created: parse_changes(created),
      modified: Enum.map(modified, &parse_changes/1)
    }
  end

  defp parse_changes(%{"date" => date, "user" => user}) do
    %{
      date: date,
      user: user
    }
  end

  defp extract_relation(%{"resource" => %{"relations" => relations}} = db_doc, referenced_uuid) do
    relations =
      relations
      |> Enum.map(fn {relation_type, ids} ->
        if referenced_uuid in ids do
          relation_type
        else
          :not_found
        end
      end)
      |> Enum.reject(fn val -> val == :not_found end)

    Map.merge(extract_core_metadata(db_doc), %{relations: relations})
  end

  defp extract_image_metadata(
         %{
           "created" => %{
             "user" => created_by,
             "date" => created
           },
           "resource" => %{
             "id" => uuid,
             "category" => category,
             "identifier" => file_name
           }
         } = _doc
       ) do
    %{
      uuid: uuid,
      file_type: category,
      file_name: file_name,
      created_by: created_by,
      created: created
    }
  end
end
