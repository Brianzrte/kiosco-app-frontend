import { UsersView } from "@/components/users/UsersView";
import { requireRole } from "@/lib/roles";

export default async function UsersPage() {
  await requireRole(["admin"]);
  return <UsersView />;
}
