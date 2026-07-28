import Link from "next/link";
import { requireRole } from "@/lib/roles";
import { UserForm } from "@/components/users/UserForm";

export default async function NewUserPage() {
  await requireRole(["admin"]);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/users"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          ← Volver a usuarios
        </Link>
      </div>
      <h1 className="text-xl font-semibold">Crear usuario</h1>
      <UserForm />
    </div>
  );
}
