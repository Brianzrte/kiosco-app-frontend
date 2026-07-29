"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { Product, Role } from "@/lib/types";
import { ProductForm } from "./ProductForm";

export function ProductDetail({ id, roles }: { id: string; roles: Role[] }) {
  const router = useRouter();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const fetcher = useCallback(() => api<Product>(`/products/${id}`), [id]);
  const { data: product, error, reload } = useLoad(fetcher);

  async function deactivate() {
    setPending(true);
    try {
      await api(`/products/${id}/deactivate`, { method: "POST" });
      toast("success", "Producto desactivado");
      router.push("/products");
      router.refresh();
    } catch (e) {
      setConfirmOpen(false);
      toast("error", (e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  async function activate() {
    setPending(true);
    try {
      await api(`/products/${id}/activate`, { method: "POST" });
      toast("success", "Producto activado");
      reload();
    } catch (e) {
      toast("error", (e as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!product) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{product.name}</h1>
          {product.active ? (
            <Badge tone="success">Activo</Badge>
          ) : (
            <Badge tone="neutral">Inactivo</Badge>
          )}
        </div>
        {product.active ? (
          <Button variant="secondary" onClick={() => setConfirmOpen(true)}>
            Desactivar producto
          </Button>
        ) : (
          roles.includes("admin") && (
            <Button variant="primary" onClick={activate} pending={pending}>
              {pending ? "Activando…" : "Activar producto"}
            </Button>
          )
        )}
      </div>

      <ProductForm product={product} />

      <Dialog
        open={confirmOpen}
        title="Desactivar producto"
        onClose={() => setConfirmOpen(false)}
      >
        <p className="mb-6 text-sm text-text-secondary">
          El producto “{product.name}” no se podrá vender hasta que se reactive.
          No se elimina del historial.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button variant="primary" onClick={deactivate} pending={pending}>
            {pending ? "Desactivando…" : "Desactivar"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
