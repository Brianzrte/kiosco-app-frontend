"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/Button";
import { IconAlert } from "@/components/ui/icons";
import { useToast } from "@/components/ui/Toast";
import { ApiError, api } from "@/lib/api";
import {
  appendSupplierAssociation,
  hasSupplierAssociation,
} from "@/lib/purchasing";
import { ProductSuppliersList } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";

export function SupplierAssociationCheck({
  productId,
  supplierId,
  toast,
}: {
  productId: string;
  supplierId: string;
  toast: ReturnType<typeof useToast>;
}) {
  const fetcher = useCallback(
    () => api<ProductSuppliersList>(`/products/${productId}/suppliers`),
    [productId],
  );
  const { data, error, reload } = useLoad(fetcher);
  const [associating, setAssociating] = useState(false);
  const [associateError, setAssociateError] = useState<string | null>(null);
  const [associated, setAssociated] = useState(false);

  if (error) {
    return (
      <div>
        <p className="flex items-center gap-2 text-sm text-error">
          <IconAlert className="size-4 shrink-0" />
          No se pudo verificar la asociación con el proveedor: {error.message}
        </p>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2"
          onClick={reload}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  // Loading ("verificando asociación"): render nothing so no warning or its
  // absence flashes while the check is in flight (design.md, UI states).
  if (!data) return null;

  if (associated || hasSupplierAssociation(data.suppliers, supplierId)) {
    return null;
  }

  async function associate() {
    setAssociating(true);
    setAssociateError(null);
    try {
      const current = await api<ProductSuppliersList>(
        `/products/${productId}/suppliers`,
      );
      const payload = appendSupplierAssociation(current.suppliers, supplierId);
      await api<ProductSuppliersList>(`/products/${productId}/suppliers`, {
        method: "PUT",
        body: payload,
      });
      setAssociated(true);
      toast("success", "Proveedor asociado al producto");
    } catch (cause) {
      setAssociateError((cause as ApiError).message);
    } finally {
      setAssociating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-app border border-warning/40 bg-warning/10 p-3">
      <p className="flex items-center gap-2 text-sm text-text-primary">
        <IconAlert className="size-4 shrink-0 text-warning" />
        El producto seleccionado no está asociado a este proveedor, ¿desea
        asociarlo?
      </p>
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          pending={associating}
          onClick={associate}
        >
          Asociar producto al proveedor
        </Button>
      </div>
      {associateError && <p className="text-sm text-error">{associateError}</p>}
    </div>
  );
}
