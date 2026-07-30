import { Tone } from "@/components/ui/Badge";
import { Role } from "./types";

export type RoleMeta = { label: string; description: string; tone: Tone };

// Fixed per-role tone, not pastelFor(id): roles are a small closed set (4
// values) where a stable, deliberate assignment reads better than a hashed
// one — the same reasoning pastelFor itself doesn't apply to (that one's for
// open-ended entity ids, e.g. categories). Same pastel Badge language as
// categories, since a role is a category of user, not a state (color-system.md,
// "Puede: codificar categorías de forma decorativa").
export const ROLE_META: Record<Role, RoleMeta> = {
  admin: {
    label: "Administrador",
    description: "Accede a todas las secciones y configura el sistema.",
    tone: "pastel-pink",
  },
  cashier: {
    label: "Cajero",
    description: "Registra ventas desde la caja.",
    tone: "pastel-blue",
  },
  inventory: {
    label: "Encargado de inventario",
    description: "Gestiona productos y existencias.",
    tone: "pastel-green",
  },
  receiving: {
    label: "Recepción",
    description: "Carga stock y recibe pedidos, sin editar el catálogo.",
    tone: "pastel-peach",
  },
};

export const ROLE_OPTIONS = (Object.keys(ROLE_META) as Role[]).map((value) => ({
  value,
  ...ROLE_META[value],
}));
