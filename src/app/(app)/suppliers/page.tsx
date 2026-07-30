import { redirect } from "next/navigation";
import { requireRole } from "@/lib/roles";

export default async function SuppliersPage() {
  await requireRole(["admin", "inventory"]);
  redirect("/purchasing/suppliers");
}
