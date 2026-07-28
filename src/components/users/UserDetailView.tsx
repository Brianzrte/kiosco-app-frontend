"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { ApiError, api } from "@/lib/api";
import { Role, User } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { UserForm } from "./UserForm";

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

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (user === null) return <LoadingState />;
  if (!user)
    return (
      <ErrorState
        error={new ApiError(404, "Usuario no encontrado.", "message")}
        onRetry={reload}
      />
    );

  const isCurrentUser = user.username === currentUsername;

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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{user.username}</h1>
          <Badge tone={user.active ? "success" : "neutral"}>
            {user.active ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        {user.active && (
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Desactivar usuario
          </Button>
        )}
      </div>

      <p className="text-sm text-text-secondary">
        {roleLabels[user.role]} · Alta: {formatDate(user.created_at)}
      </p>

      <UserForm user={user} />

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
    </div>
  );
}
