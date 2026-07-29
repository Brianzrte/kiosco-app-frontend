import { ReceivingDetailView } from "@/components/receiving/ReceivingDetailView";
import { requireRole } from "@/lib/roles";
export default async function ReceivingDetailPage({ params }: { params: Promise<{ id: string }> }) { await requireRole(["receiving", "admin"]); const { id } = await params; return <ReceivingDetailView id={id} />; }
