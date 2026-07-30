import { redirect } from "next/navigation";
import { requireRole } from "@/lib/roles";

export default async function ReceivingPage() {
  await requireRole(["receiving", "inventory", "admin"]);
  redirect("/purchasing");
}
