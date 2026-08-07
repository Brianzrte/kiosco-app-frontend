"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type ExpenseAction = {
  href: string;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary";
};

const actionsByScreen: Record<
  "hub" | "new" | "categories" | "payroll",
  readonly ExpenseAction[]
> = {
  hub: [
    {
      href: "/expenses/new",
      label: "Registrar egreso",
      pendingLabel: "Abriendo registro…",
    },
    {
      href: "/expenses/payroll",
      label: "Sueldos",
      pendingLabel: "Abriendo sueldos…",
      variant: "secondary",
    },
    {
      href: "/expenses/categories",
      label: "Rubros",
      pendingLabel: "Abriendo rubros…",
      variant: "secondary",
    },
  ],
  new: [
    {
      href: "/expenses",
      label: "Volver a Egresos",
      pendingLabel: "Volviendo a Egresos…",
      variant: "secondary",
    },
  ],
  categories: [
    {
      href: "/expenses",
      label: "Volver a Egresos",
      pendingLabel: "Volviendo a Egresos…",
      variant: "secondary",
    },
  ],
  payroll: [
    {
      href: "/expenses",
      label: "Volver a Egresos",
      pendingLabel: "Volviendo a Egresos…",
      variant: "secondary",
    },
  ],
};

/**
 * Acciones de navegación de primer nivel de Egresos. No son links para que
 * puedan comunicar el estado pendiente inmediatamente y bloquear una segunda
 * activación hasta que la nueva ruta tome el control.
 */
export function ExpensesContextualActions({
  screen,
}: {
  screen: keyof typeof actionsByScreen;
}) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const actions = actionsByScreen[screen];

  function navigate(action: ExpenseAction) {
    if (pendingHref) return;
    setPendingHref(action.href);
    router.push(action.href);
  }

  return (
    <>
      {actions.map((action) => {
        const pending = pendingHref === action.href;
        return (
          <Button
            key={action.href}
            variant={action.variant ?? "primary"}
            pending={pending}
            disabled={pendingHref !== null}
            className="motion-reduce:transition-none motion-reduce:active:scale-100"
            onClick={() => navigate(action)}
          >
            {pending ? action.pendingLabel : action.label}
          </Button>
        );
      })}
      <span aria-live="polite" className="sr-only">
        {pendingHref
          ? actions.find((action) => action.href === pendingHref)?.pendingLabel
          : ""}
      </span>
    </>
  );
}
