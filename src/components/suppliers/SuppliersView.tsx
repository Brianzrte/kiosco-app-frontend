"use client";

import {
  FormEvent,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { CollapsibleSearch } from "@/components/ui/CollapsibleSearch";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td, Th } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/ui/states";
import { IconSearch } from "@/components/ui/icons";
import { api, ApiError } from "@/lib/api";
import { computeTotalPages, pageWindow } from "@/lib/pagination";
import { Supplier, SuppliersList } from "@/lib/types";
import { useLoad } from "@/lib/useLoad";
import { useViewportPageSize } from "@/lib/useViewportPageSize";

type DialogState = "create" | "edit" | "deactivate" | null;

export function SuppliersView() {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [visitFrequencyDays, setVisitFrequencyDays] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const fetcher = useCallback(() => api<SuppliersList>("/suppliers"), []);
  const { data, error, reload } = useLoad(fetcher);

  useEffect(() => {
    if (!dialog || dialog === "deactivate") return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [dialog]);

  const suppliers = data?.suppliers ?? null;
  const filtered = useMemo(() => {
    if (!suppliers) return [];
    const term = search.trim().toLocaleLowerCase("es-AR");
    if (!term) return suppliers;
    return suppliers.filter((supplier) =>
      supplier.name.toLocaleLowerCase("es-AR").includes(term),
    );
  }, [suppliers, search]);
  const { pageSize, mobileListRef, desktopListRef } = useViewportPageSize({
    itemCount: filtered.length,
    onPageReset: () => setPage(1),
    defaultPageSize: 15,
  });
  const totalPages = computeTotalPages(filtered.length, pageSize);
  const visibleSuppliers = pageWindow(filtered, page, pageSize);

  function openDialog(
    next: Exclude<DialogState, null>,
    event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    supplier?: Supplier,
  ) {
    triggerRef.current = event.currentTarget;
    setSelected(supplier ?? null);
    setName(supplier?.name ?? "");
    setPhone(supplier?.phone ?? "");
    setAddress(supplier?.address ?? "");
    setVisitFrequencyDays(supplier?.visit_frequency_days?.toString() ?? "");
    setVisitNotes(supplier?.visit_notes ?? "");
    setNotes(supplier?.notes ?? "");
    setFormError(null);
    setDialog(next);
  }

  function closeDialog() {
    if (pending) return;
    setDialog(null);
    setSelected(null);
    setFormError(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setFormError(null);
    setPending(true);
    try {
      const contactPayload = {
        ...(phone.trim() ? { phone: phone.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(visitFrequencyDays ? { visit_frequency_days: parseInt(visitFrequencyDays, 10) } : {}),
        ...(visitNotes.trim() ? { visit_notes: visitNotes.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      if (dialog === "create") {
        await api<Supplier>("/suppliers", {
          method: "POST",
          body: { name: name.trim(), ...contactPayload },
        });
        toast("success", "Proveedor creado");
      } else if (selected) {
        await api<Supplier>(`/suppliers/${selected.id}`, {
          method: "PUT",
          body: { name: name.trim(), ...contactPayload },
        });
        toast("success", "Proveedor actualizado");
      }
      setDialog(null);
      setSelected(null);
      reload();
      requestAnimationFrame(() => triggerRef.current?.focus());
    } catch (cause) {
      setFormError((cause as ApiError).message);
      inputRef.current?.focus();
    } finally {
      setPending(false);
    }
  }

  async function deactivate() {
    if (!selected) return;
    setFormError(null);
    setPending(true);
    try {
      await api<Supplier>(`/suppliers/${selected.id}/deactivate`, {
        method: "PATCH",
      });
      toast("success", "Proveedor desactivado");
      setDialog(null);
      setSelected(null);
      reload();
      requestAnimationFrame(() => triggerRef.current?.focus());
    } catch (cause) {
      setFormError((cause as ApiError).message);
    } finally {
      setPending(false);
    }
  }

  function onRowKeyDown(event: KeyboardEvent<HTMLElement>, supplier: Supplier) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    router.push(`/purchasing/suppliers/${supplier.id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Proveedores"
        description="Administrá quienes abastecen el kiosco. Desactivar conserva el historial de compras."
        actions={
          <Button onClick={(event) => openDialog("create", event)}>
            Nuevo proveedor
          </Button>
        }
      />

      <CollapsibleSearch open={searchOpen || !!search} onOpenChange={setSearchOpen} label="Buscar proveedor">
        <Input icon={<IconSearch />} placeholder="Buscar proveedor por nombre" aria-label="Buscar proveedor por nombre" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="sm:max-w-sm" inputMode="search" />
      </CollapsibleSearch>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : suppliers === null ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          message={
            suppliers.length === 0
              ? "Todavía no hay proveedores. Creá el primero para preparar pedidos."
              : "Ningún proveedor coincide con la búsqueda."
          }
          action={
            suppliers.length === 0 ? (
              <Button onClick={(event) => openDialog("create", event)}>
                Crear proveedor
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="md:hidden">
            <ul ref={mobileListRef} className="flex flex-col gap-3">
              {visibleSuppliers.map((supplier) => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onOpen={() => router.push(`/purchasing/suppliers/${supplier.id}`)}
                  onDeactivate={(event) => {
                    event.stopPropagation();
                    openDialog("deactivate", event, supplier);
                  }}
                  onKeyDown={(event) => onRowKeyDown(event, supplier)}
                />
              ))}
            </ul>
          </div>
          <div ref={desktopListRef} className="hidden md:block">
            <Table>
              <thead>
                <tr>
                  <Th>Proveedor</Th>
                  <Th>Estado</Th>
                  <Th className="text-right">Acciones</Th>
                </tr>
              </thead>
              <tbody>
                {visibleSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/purchasing/suppliers/${supplier.id}`)}
                    onKeyDown={(event) => onRowKeyDown(event, supplier)}
                    className={`cursor-pointer transition-colors duration-[var(--motion-fast)] ease-[var(--ease-standard)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                      supplier.active
                        ? "hover:bg-surface-hover"
                        : "text-text-secondary"
                    }`}
                  >
                    <Td className="font-medium">{supplier.name}</Td>
                    <Td>
                      <SupplierStatus supplier={supplier} />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            openDialog("edit", event, supplier);
                          }}
                        >
                          Editar
                        </Button>
                        {supplier.active && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="border border-error/40 !text-error hover:!bg-error/10"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDialog("deactivate", event, supplier);
                            }}
                          >
                            Desactivar
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">Página {page} de {totalPages} · {filtered.length} proveedores</p>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</Button>
                <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={dialog === "create" || dialog === "edit"}
        title={dialog === "create" ? "Nuevo proveedor" : "Editar proveedor"}
        onClose={closeDialog}
        dismissible={!pending}
      >
        <form onSubmit={save} className="flex flex-col gap-4">
          <Input
            ref={inputRef}
            label="Nombre"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={formError ?? undefined}
            required
            disabled={pending}
          />
          <Input label="Teléfono" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} disabled={pending} />
          <Input label="Dirección" value={address} onChange={(event) => setAddress(event.target.value)} disabled={pending} />
          <Input label="Frecuencia de visita (días)" type="number" min="1" inputMode="numeric" value={visitFrequencyDays} onChange={(event) => setVisitFrequencyDays(event.target.value)} disabled={pending} />
          <Input label="Notas de visita" value={visitNotes} onChange={(event) => setVisitNotes(event.target.value)} disabled={pending} />
          <Input label="Notas generales" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={pending} />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={closeDialog}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" pending={pending} disabled={!name.trim()}>
              {dialog === "create" ? "Crear proveedor" : "Guardar cambios"}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={dialog === "deactivate"}
        title="Desactivar proveedor"
        onClose={closeDialog}
        dismissible={!pending}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Vas a desactivar a{" "}
            <strong className="text-text-primary">{selected?.name}</strong>.
            Seguirá visible en el historial, pero no se podrá elegir en pedidos
            nuevos.
          </p>
          {formError && <p className="text-sm text-error">{formError}</p>}
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={closeDialog}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={deactivate} pending={pending}>
              Desactivar proveedor
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function SupplierStatus({ supplier }: { supplier: Supplier }) {
  return (
    <Badge tone={supplier.active ? "success" : "neutral"}>
      {supplier.active ? "Activo" : "Inactivo"}
    </Badge>
  );
}

function SupplierCard({
  supplier,
  onOpen,
  onDeactivate,
  onKeyDown,
}: {
  supplier: Supplier;
  onOpen: (event: MouseEvent<HTMLElement>) => void;
  onDeactivate: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className={`cursor-pointer rounded-app border border-border bg-surface p-4 shadow-soft transition-colors hover:border-border-hover focus-visible:ring-2 focus-visible:ring-primary ${
        supplier.active ? "" : "text-text-secondary"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 font-medium text-text-primary">{supplier.name}</p>
        <SupplierStatus supplier={supplier} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(event);
          }}
        >
          Editar
        </Button>
        {supplier.active && (
          <Button
            size="sm"
            variant="ghost"
            className="border border-error/40 !text-error hover:!bg-error/10"
            onClick={onDeactivate}
          >
            Desactivar
          </Button>
        )}
      </div>
    </li>
  );
}
