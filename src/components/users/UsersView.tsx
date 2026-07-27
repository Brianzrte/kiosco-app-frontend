"use client";

import { FormEvent, useCallback, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import { Role, User } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

const roleOptions: { value: Role; label: string; description: string }[] = [
  {
    value: "cashier",
    label: "Cajero",
    description: "Registra ventas desde la caja.",
  },
  {
    value: "inventory",
    label: "Encargado de inventario",
    description: "Gestiona productos y existencias.",
  },
  {
    value: "admin",
    label: "Administrador",
    description: "Accede a todas las secciones y configura el sistema.",
  },
];

const roleLabels: Record<Role, string> = {
  admin: "Administrador",
  cashier: "Cajero",
  inventory: "Inventario",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function UsersView({ currentUsername }: { currentUsername: string }) {
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  // limit=100: cubre el tamaño de kiosco (1-5 personas) hasta que exista
  // paginación real en esta pantalla (add-frontend-users, sección 7).
  const fetcher = useCallback(
    () =>
      api<{ users: User[]; total: number }>("/users?limit=100").then(
        (res) => res.users,
      ),
    [],
  );
  const { data: users, error, reload } = useLoad(fetcher);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Usuarios</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Administrá quién puede acceder al kiosco y con qué permisos.
          </p>
        </div>
        <Button onClick={() => setFormOpen((open) => !open)}>
          {formOpen ? "Cerrar alta" : "Crear usuario"}
        </Button>
      </div>

      {formOpen && (
        <CreateUserForm
          onCreated={() => {
            setFormOpen(false);
            reload();
            toast("success", "Usuario creado");
          }}
        />
      )}

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : users === null ? (
        <ListSkeleton rows={4} />
      ) : users.length === 0 ? (
        <EmptyState message="Todavía no hay usuarios registrados." />
      ) : (
        <UsersList users={users} onDeactivate={setUserToDeactivate} />
      )}

      {userToDeactivate && (
        <DeactivateUserDialog
          key={userToDeactivate.id}
          user={userToDeactivate}
          isCurrentUser={userToDeactivate.username === currentUsername}
          onClose={() => setUserToDeactivate(null)}
          onDeactivated={() => {
            setUserToDeactivate(null);
            reload();
            toast("success", "Usuario desactivado");
          }}
        />
      )}
    </div>
  );
}

function CreateUserForm({ onCreated }: { onCreated: () => void }) {
  const usernameRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("cashier");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setUsernameError(null);
    setFormError(null);
    setPending(true);
    try {
      await api<User>("/users", {
        method: "POST",
        body: { username: username.trim(), password, role },
      });
      setPassword("");
      onCreated();
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError.status === 409) {
        setUsernameError(apiError.message);
        usernameRef.current?.focus();
      } else {
        setFormError(apiError.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <form onSubmit={submit} className="flex flex-col gap-5">
        <div>
          <h2 className="font-semibold">Dar de alta un usuario</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Elegí el acceso adecuado para la tarea que realizará.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            ref={usernameRef}
            label="Usuario"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            error={usernameError ?? undefined}
            required
          />
          <div>
            <Input
              label="Contraseña"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="mt-2 text-sm font-medium text-primary hover:text-primary-hover"
            >
              {showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            </button>
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Rol</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {roleOptions.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-app border p-4 transition-colors ${
                  role === option.value
                    ? "border-primary bg-primary-light/50"
                    : "border-border hover:border-border-hover"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium">
                  {option.label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-text-secondary">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        {formError && (
          <p role="alert" className="text-sm text-error">
            {formError}
          </p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!username.trim() || !password}
            pending={pending}
          >
            {pending ? "Creando…" : "Crear usuario"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function UsersList({
  users,
  onDeactivate,
}: {
  users: User[];
  onDeactivate: (user: User) => void;
}) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <li
            key={user.id}
            className={`rounded-app border border-border bg-surface p-4 shadow-soft ${
              user.active ? "" : "text-text-secondary"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-text-primary">{user.username}</p>
                <p className="mt-1 text-sm">{roleLabels[user.role]}</p>
              </div>
              <UserStatus active={user.active} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-xs">Alta: {formatDate(user.created_at)}</p>
              {user.active && (
                <Button variant="danger" onClick={() => onDeactivate(user)}>
                  Desactivar
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Rol</Th>
              <Th>Estado</Th>
              <Th>Alta</Th>
              <Th className="text-right">Acción</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className={
                  user.active ? "hover:bg-surface-2" : "text-text-secondary"
                }
              >
                <Td className="font-medium text-text-primary">
                  {user.username}
                </Td>
                <Td>{roleLabels[user.role]}</Td>
                <Td>
                  <UserStatus active={user.active} />
                </Td>
                <Td>{formatDate(user.created_at)}</Td>
                <Td className="text-right">
                  {user.active && (
                    <Button variant="danger" onClick={() => onDeactivate(user)}>
                      Desactivar
                    </Button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}

function UserStatus({ active }: { active: boolean }) {
  return (
    <Badge tone={active ? "success" : "neutral"}>
      {active ? "Activo" : "Inactivo"}
    </Badge>
  );
}

function DeactivateUserDialog({
  user,
  isCurrentUser,
  onClose,
  onDeactivated,
}: {
  user: User;
  isCurrentUser: boolean;
  onClose: () => void;
  onDeactivated: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deactivate() {
    setError(null);
    setPending(true);
    try {
      await api<void>(`/users/${user.id}/deactivate`, { method: "PATCH" });
      onDeactivated();
    } catch (error) {
      setError((error as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      title="Desactivar usuario"
      onClose={pending ? () => {} : onClose}
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-text-secondary">
          Vas a desactivar a{" "}
          <strong className="font-semibold text-text-primary">
            {user.username}
          </strong>
          . No se puede deshacer desde la aplicación.
        </p>
        {isCurrentUser && (
          <p className="rounded-app bg-warning/15 px-3 py-2 text-sm text-text-primary">
            Vas a perder el acceso de inmediato al continuar.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={deactivate} pending={pending}>
            {pending ? "Desactivando…" : "Desactivar usuario"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
