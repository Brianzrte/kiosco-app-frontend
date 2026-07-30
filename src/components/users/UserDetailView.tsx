"use client";

import { FormEvent, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";
import { ROLE_META } from "@/lib/roleMeta";
import { Role, User } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { RolesField } from "./RolesField";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function UserDetailView({
  id,
  currentUsername,
}: {
  id: string;
  currentUsername: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<Role[] | null>(null);
  const [rolesPending, setRolesPending] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [confirmRoleChange, setConfirmRoleChange] = useState(false);

  const fetcher = useCallback(() => api<User>(`/users/${id}`), [id]);
  const { data: user, error, reload } = useLoad(fetcher);

  async function deactivate() {
    setDialogError(null);
    setPending(true);
    try {
      await api(`/users/${id}/deactivate`, { method: "PATCH" });
      toast("success", "Usuario desactivado");
      router.push("/users");
      router.refresh();
    } catch (e) {
      setDialogError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  if (error?.status === 404)
    return (
      <ErrorState
        error={new ApiError(404, "El usuario no existe.", "message")}
        onRetry={() => router.push("/users")}
      />
    );
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (user === null) return <LoadingState />;
  if (!user)
    return (
      <ErrorState
        error={new ApiError(404, "Usuario no encontrado.", "message")}
        onRetry={reload}
      />
    );

  const selectedRoles = draftRoles ?? user.roles;
  const isCurrentUser = user.username === currentUsername;
  const isRemovingOwnAdmin =
    isCurrentUser &&
    user.roles.includes("admin") &&
    !selectedRoles.includes("admin");

  async function saveRoles() {
    setRolesError(null);
    setRolesPending(true);
    try {
      await api(`/users/${id}/roles`, {
        method: "PUT",
        body: { roles: selectedRoles },
      });
      toast("success", "Roles actualizados");
      setConfirmRoleChange(false);
      setDraftRoles(null);
      reload();
    } catch (e) {
      setRolesError((e as ApiError).message);
    } finally {
      setRolesPending(false);
    }
  }

  function submitRoles() {
    if (selectedRoles.length === 0) return;
    if (isRemovingOwnAdmin) {
      setConfirmRoleChange(true);
      return;
    }
    void saveRoles();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/users"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          ← Volver a usuarios
        </Link>
      </div>

      <PageHeader
        title={user.username}
        titleAdornment={
          <Badge tone={user.active ? "success" : "neutral"}>
            {user.active ? "Activo" : "Inactivo"}
          </Badge>
        }
        actions={
          user.active && (
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Desactivar usuario
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        {user.roles.map((role) => (
          <Badge key={role} tone={ROLE_META[role].tone}>
            {ROLE_META[role].label}
          </Badge>
        ))}
        <span>Alta: {formatDate(user.created_at)}</span>
      </div>

      <Card>
        <h2 className="text-sm font-medium text-text-secondary">
          Credenciales
        </h2>
        <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
          <div>
            <dt className="text-text-secondary">Usuario</dt>
            <dd className="mt-1 font-medium">{user.username}</dd>
          </div>
          <div>
            <dt className="text-text-secondary">Contraseña</dt>
            <dd className="mt-1 font-medium">
              No se puede editar desde la aplicación.
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-text-secondary">
          El backend no expone un flujo para cambiar el usuario ni la
          contraseña.
        </p>
      </Card>

      <ProfileForm user={user} onSaved={reload} />

      <Card>
        <RolesField roles={selectedRoles} onChange={setDraftRoles} />
        {selectedRoles.length === 0 && (
          <p className="mt-3 text-sm text-error">
            El usuario debe conservar al menos un rol.
          </p>
        )}
        {rolesError && (
          <p role="alert" className="mt-3 text-sm text-error">
            {rolesError}
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <Button
            onClick={submitRoles}
            disabled={selectedRoles.length === 0}
            pending={rolesPending}
          >
            {rolesPending ? "Guardando roles…" : "Guardar roles"}
          </Button>
        </div>
      </Card>

      <Dialog
        open={confirmOpen}
        title="Desactivar usuario"
        onClose={() => setConfirmOpen(false)}
        dismissible={!pending}
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
          {dialogError && (
            <p role="alert" className="text-sm text-error">
              {dialogError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={deactivate} pending={pending}>
              {pending ? "Desactivando…" : "Desactivar usuario"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={confirmRoleChange}
        title="Perder acceso de administración"
        onClose={() => setConfirmRoleChange(false)}
        dismissible={!rolesPending}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">
            Al quitarte el rol Administrador vas a perder el acceso a las
            secciones de administración.
          </p>
          {rolesError && (
            <p role="alert" className="text-sm text-error">
              {rolesError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmRoleChange(false)}
              disabled={rolesPending}
            >
              Cancelar
            </Button>
            <Button onClick={saveRoles} pending={rolesPending}>
              {rolesPending ? "Guardando…" : "Confirmar cambio"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function ProfileForm({ user, onSaved }: { user: User; onSaved: () => void }) {
  const toast = useToast();
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [phone, setPhone] = useState(user.phone);
  const [address, setAddress] = useState(user.address);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api(`/users/${user.id}`, {
        method: "PUT",
        body: { first_name: firstName, last_name: lastName, phone, address },
      });
      toast("success", "Perfil actualizado");
      onSaved();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <h2 className="text-sm font-medium text-text-secondary">
          Datos de perfil
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Nombre"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
          <Input
            label="Apellido"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
          <Input
            label="Teléfono"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <Input
            label="Dirección"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" pending={pending}>
            {pending ? "Guardando…" : "Guardar perfil"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
