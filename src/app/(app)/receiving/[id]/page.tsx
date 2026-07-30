import { redirect } from "next/navigation";
import { requireRole } from "@/lib/roles";

export default async function ReceivingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["cashier", "receiving", "inventory", "admin"]);
  const { id } = await params;
  redirect(`/purchasing/${id}`);
}
