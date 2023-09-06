defmodule FieldPublicationWeb.AdminLive.UserManagement do
  use FieldPublicationWeb, :live_view

  alias FieldPublication.User

  @impl true
  def render(assigns) do
    ~H"""
    <.header>
      Listing Users
      <:actions>
        <.link patch={~p"/admin/users/new"}>
          <.button>New User</.button>
        </.link>
      </:actions>
    </.header>

    <table class="w-[40rem] mt-11 sm:w-full">
      <thead  class="text-sm text-left leading-6 text-zinc-500">
        <tr>
          <th>Username</th>
          <th class="relative p-0 pb-4"><span class="sr-only"><%= gettext("Actions") %></span></th>
        </tr>
      </thead>
      <tbody class="relative divide-y divide-zinc-100 border-t border-zinc-200 text-sm leading-6 text-zinc-700">
        <%= for user <- @users do %>
        <tr class="group hover:bg-zinc-50">
          <td><%= user.name %></td>
          <td>
            <div class="relative whitespace-nowrap py-4 text-right text-sm font-medium">
              <span class="relative ml-4 font-semibold leading-6 text-zinc-900 hover:text-zinc-700">
                <.link navigate={~p"/admin/users/#{user.name}/new_password"}>New password</.link>
              </span>
              <span class="relative ml-4 font-semibold leading-6 text-zinc-900 hover:text-zinc-700">
                <.link phx-click={JS.push("delete", value: %{id: user.name}) |> hide("##{user.name}")}
                  data-confirm="Are you sure?">
                  Delete
                </.link>
              </span>
            </div>
          </td>
        </tr>
        <% end %>
      </tbody>
    </table>

    <.modal :if={@live_action in [:new, :new_password]} id="user-modal" show on_cancel={JS.patch(~p"/admin/users")}>
      <.live_component
        module={FieldPublicationWeb.AdminLive.UserFormComponent}
        id={@user.name || :new}
        title={@page_title}
        action={@live_action}
        user={@user}
        patch={~p"/admin/users"}
      />
    </.modal>
    """
  end

  @impl true
  def mount(_params, _session, socket) do
    {
      :ok,
      assign(socket, :users, User.list())
    }
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  defp apply_action(socket, :index, _params) do
    socket
    |> assign(:page_title, "Listing Projects")
  end

  defp apply_action(socket, :new_password, %{"name" => name}) do

    socket
    |> assign(:page_title, "Edit User '#{name}'")
    |> assign(:user, User.get(name))
  end

  defp apply_action(socket, :new, _params) do
    socket
    |> assign(:page_title, "New user")
    |> assign(:user, %User.InputSchema{})
  end

  defp apply_action(socket, :delete, params) do

    IO.inspect(params)
    socket
    |> assign(:page_title, "Listing Projects")
  end

  @impl true
  def handle_event("delete", %{"id" => name}, socket) do
    User.delete(name)
    {
      :noreply,
      socket |> assign(:users, User.list())
    }
  end

  @impl true
  def handle_info({FieldPublicationWeb.AdminLive.UserFormComponent, {:saved, _user}}, socket) do
    {:noreply, assign(socket, :users, User.list())}
  end
end
