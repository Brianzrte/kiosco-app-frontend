import { Role } from "./types";

export type RoleMeta = { label: string; description: string };

export const ROLE_META: Record<Role, RoleMeta> = {
  admin: {
    label: "Administrador",
    description: "Accede a todas las secciones y configura el sistema.",
  },
  cashier: {
    label: "Cajero",
    description: "Registra ventas desde la caja.",
  },
  inventory: {
    label: "Encargado de inventario",
    description: "Gestiona productos y existencias.",
  },
  receiving: {
    label: "Recepción",
    description: "Carga stock y recibe pedidos, sin editar el catálogo.",
  },
};

export const ROLE_OPTIONS = (Object.keys(ROLE_META) as Role[]).map((value) => ({
  value,
  ...ROLE_META[value],
}));
