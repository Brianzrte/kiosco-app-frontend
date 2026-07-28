import { requireRole } from "@/lib/roles";
import { UserDetailView } from "@/components/users/UserDetailView";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireRole(["admin"]);
  const { id } = await params;
  return <UserDetailView id={id} currentUsername={session.username ?? ""} />;
}
