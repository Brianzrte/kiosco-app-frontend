"use client";

import { KeyboardEvent, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { IconUserOff } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { computeTotalPages } from "@/lib/pagination";
import { ROLE_META } from "@/lib/roleMeta";
import { User } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function UsersView() {
  const [page, setPage] = useState(1);

  const fetcher = useCallback(
    () =>
      api<{ users: User[]; total: number }>(
        `/users?limit=${PAGE_SIZE}&page=${page}`,
      ),
    [page],
  );
  const { data, error, reload } = useLoad(fetcher);
  const [deactivating, setDeactivating] = useState<User | null>(null);
  const [pending, setPending] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const users = data?.users ?? null;
  const totalPages = data ? computeTotalPages(data.total, PAGE_SIZE) : 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Usuarios"
        description="Administrá quién puede acceder al kiosco y con qué permisos."
        actions={
          <Link href="/users/new">
            <Button>Crear usuario</Button>
          </Link>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : users === null ? (
        <ListSkeleton rows={4} />
      ) : users.length === 0 ? (
        <EmptyState
          message="Todavía no hay usuarios registrados."
          action={
            <Link href="/users/new">
              <Button>Crear usuario</Button>
            </Link>
          }
        />
      ) : (
        <>
          <UsersList users={users} onDeactivate={setDeactivating} />
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
              <span>
                Página {page} de {totalPages} · {data?.total} usuarios
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <Dialog
        open={deactivating !== null}
        title="Desactivar usuario"
        onClose={() => setDeactivating(null)}
        dismissible={!pending}
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-text-secondary">
            Vas a desactivar a{" "}
            <strong className="font-semibold text-text-primary">
              {deactivating?.username}
            </strong>
            . No se puede deshacer desde la aplicación.
          </p>
          {dialogError && (
            <p role="alert" className="text-sm text-error">
              {dialogError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setDeactivating(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              pending={pending}
              onClick={async () => {
                if (!deactivating) return;
                setDialogError(null);
                setPending(true);
                try {
                  await api(`/users/${deactivating.id}/deactivate`, {
                    method: "PATCH",
                  });
                  setDeactivating(null);
                  reload();
                } catch (e) {
                  setDialogError((e as ApiError).message);
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "Desactivando…" : "Desactivar"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function UsersList({
  users,
  onDeactivate,
}: {
  users: User[];
  onDeactivate: (user: User) => void;
}) {
  const router = useRouter();
  function activate(user: User) {
    router.push(`/users/${user.id}`);
  }
  function onRowKeyDown(event: KeyboardEvent<HTMLElement>, user: User) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate(user);
    }
  }
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <li
            key={user.id}
            role="button"
            tabIndex={0}
            onClick={() => activate(user)}
            onKeyDown={(event) => onRowKeyDown(event, user)}
            className={`cursor-pointer rounded-app border border-border bg-surface p-4 shadow-soft transition-colors hover:border-border-hover focus-visible:ring-2 focus-visible:ring-primary ${
              user.active ? "" : "text-text-secondary"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-text-primary">{user.username}</p>
                <RoleBadges roles={user.roles} className="mt-1" />
              </div>
              <div className="flex items-center gap-2">
                <UserStatus active={user.active} />
                {user.active && (
                  <Button
                    variant="ghost"
                    iconOnly
                    className="border border-error/40 !text-error hover:!bg-error/10"
                    aria-label={`Desactivar ${user.username}`}
                    title="Desactivar"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeactivate(user);
                    }}
                  >
                    <IconUserOff className="size-4.5" />
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-4 text-xs">Alta: {formatDate(user.created_at)}</p>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <thead>
            <tr>
              <Th>Usuario</Th>
              <Th>Roles</Th>
              <Th>Estado</Th>
              <Th>Alta</Th>
              <Th>
                <span className="sr-only">Acciones</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                role="button"
                tabIndex={0}
                onClick={() => activate(user)}
                onKeyDown={(event) => onRowKeyDown(event, user)}
                className={`cursor-pointer transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${user.active ? "hover:bg-surface-hover" : "text-text-secondary"}`}
              >
                <Td className="font-medium">{user.username}</Td>
                <Td>
                  <RoleBadges roles={user.roles} />
                </Td>
                <Td>
                  <UserStatus active={user.active} />
                </Td>
                <Td>{formatDate(user.created_at)}</Td>
                <Td>
                  {user.active && (
                    <Button
                      variant="ghost"
                      iconOnly
                      size="sm"
                      className="border border-error/40 !text-error hover:!bg-error/10"
                      aria-label={`Desactivar ${user.username}`}
                      title="Desactivar"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeactivate(user);
                      }}
                    >
                      <IconUserOff className="size-4" />
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

function RoleBadges({
  roles,
  className = "",
}: {
  roles: User["roles"];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {roles.map((role) => (
        <Badge key={role} tone={ROLE_META[role].tone}>
          {ROLE_META[role].label}
        </Badge>
      ))}
    </div>
  );
}
