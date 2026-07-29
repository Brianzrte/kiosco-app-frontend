import { ReceivingListView } from "@/components/receiving/ReceivingListView";
import { requireRole } from "@/lib/roles";
export default async function ReceivingPage() { await requireRole(["receiving", "admin"]); return <ReceivingListView />; }
