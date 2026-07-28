"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, Td, Th } from "@/components/ui/Table";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { api } from "@/lib/api";
import { computeTotalPages } from "@/lib/pagination";
import { Role, User } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

const PAGE_SIZE = 20;

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
  const users = data?.users ?? null;
  const totalPages = data ? computeTotalPages(data.total, PAGE_SIZE) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Usuarios</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Administrá quién puede acceder al kiosco y con qué permisos.
          </p>
        </div>
        <Link href="/users/new">
          <Button>Crear usuario</Button>
        </Link>
      </div>

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
          <UsersList users={users} />
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
    </div>
  );
}

function UsersList({ users }: { users: User[] }) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {users.map((user) => (
          <li key={user.id}>
            <Link
              href={`/users/${user.id}`}
              className={`block rounded-app border border-border bg-surface p-4 shadow-soft transition-colors hover:border-border-hover ${
                user.active ? "" : "text-text-secondary"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-text-primary">
                    {user.username}
                  </p>
                  <p className="mt-1 text-sm">{roleLabels[user.role]}</p>
                </div>
                <UserStatus active={user.active} />
              </div>
              <p className="mt-4 text-xs">Alta: {formatDate(user.created_at)}</p>
            </Link>
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
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className={user.active ? "hover:bg-surface-2" : "text-text-secondary"}
              >
                <Td className="font-medium">
                  <Link
                    href={`/users/${user.id}`}
                    className="text-primary hover:text-primary-hover"
                  >
                    {user.username}
                  </Link>
                </Td>
                <Td>{roleLabels[user.role]}</Td>
                <Td>
                  <UserStatus active={user.active} />
                </Td>
                <Td>{formatDate(user.created_at)}</Td>
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
