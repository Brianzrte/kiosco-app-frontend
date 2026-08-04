"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { IconPower } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { api, ApiError } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import { formatMoney } from "@/lib/money";
import { Product, Role } from "@/lib/types";
import { ProductForm } from "./ProductForm";
import { ProductSuppliersPanel } from "./ProductSuppliersPanel";

export function ProductDetail({ id, roles }: { id: string; roles: Role[] }) {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [parentProduct, setParentProduct] = useState<Product | null>(null);

  const fetcher = useCallback(() => api<Product>(`/products/${id}`), [id]);
  const { data: product, error, reload } = useLoad(fetcher);

  useEffect(() => {
    if (!product?.parent_product_id) return;
    api<Product>(`/products/${product.parent_product_id}`)
      .then(setParentProduct)
      .catch(() => setParentProduct(null));
  }, [product?.parent_product_id]);

  async function deactivate() {
    setPending(true);
    try {
      await api(`/products/${id}/deactivate`, { method: "POST" });
      toast("success", "Producto desactivado");
      setConfirmOpen(false);
      reload();
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
      <PageHeader
        title={product.name}
        titleAdornment={<>{product.parent_product_id && <Badge tone="neutral">Por unidad</Badge>}{product.active ? <Badge tone="success">Activo</Badge> : <Badge tone="neutral">Inactivo</Badge>}</>}
        actions={
          product.active ? (
            <Button variant="ghost" size="sm" iconOnly aria-label="Desactivar producto" title="Desactivar producto" className="text-error hover:!bg-error/10" onClick={() => setConfirmOpen(true)}><IconPower className="size-4" /></Button>
          ) : (
            roles.includes("admin") && (
              <Button variant="primary" onClick={activate} pending={pending}>
                {pending ? "Activando…" : "Activar producto"}
              </Button>
            )
          )
        }
      />

      {product.parent_product_id ? (
        <section className="flex flex-col gap-3 rounded-app border border-border bg-surface p-6 shadow-soft">
          <p className="text-sm text-text-secondary">
            Este producto se genera desde el producto por paquete. Sus datos se actualizan desde ahí.
          </p>
          {parentProduct && !parentProduct.active && (
            <p className="text-sm text-warning">El producto por paquete está inactivo.</p>
          )}
          <Link href={`/products/${product.parent_product_id}`} className="font-medium text-primary underline underline-offset-2">
            {parentProduct ? `Ver ${parentProduct.name}` : "Ver producto por paquete"}
          </Link>
        </section>
      ) : (
        <>
          {product.unit_product && (
            <section className="flex flex-col gap-2 rounded-app border border-border bg-surface p-4 shadow-soft">
              <p className="text-sm text-text-secondary">También se vende por unidad:</p>
              <Link href={`/products/${product.unit_product.id}`} className="font-medium text-primary underline underline-offset-2">
                {product.unit_product.name} — {product.unit_product.sku} · {formatMoney(product.unit_product.price)}
              </Link>
            </section>
          )}
          <ProductForm product={product} roles={roles} />
        </>
      )}

      {!product.parent_product_id && <ProductSuppliersPanel productId={id} />}

      <Dialog
        open={confirmOpen}
        title="Desactivar producto"
        onClose={() => setConfirmOpen(false)}
      >
        <p className="mb-6 text-sm text-text-secondary">
          El producto “{product.name}” no se podrá vender hasta que se reactive.
          No se elimina del historial.
          {product.unit_product && ` El producto por unidad (${product.unit_product.name}) también va a quedar inactivo.`}
          {product.parent_product_id && " El producto por paquete sigue activo."}
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button variant="danger" onClick={deactivate} pending={pending}>
            {pending ? "Desactivando…" : "Desactivar"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
