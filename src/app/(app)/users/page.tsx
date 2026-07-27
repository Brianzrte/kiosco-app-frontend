import { UsersView } from "@/components/users/UsersView";
import { requireRole } from "@/lib/roles";

export default async function UsersPage() {
  const session = await requireRole(["admin"]);
  return <UsersView currentUsername={session.username ?? ""} />;
}
