import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { homeFor } from "@/lib/nav";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold text-primary">
          Kiosco
        </h1>
        <p className="mb-8 text-center text-sm text-text-secondary">
          Iniciá sesión para operar
        </p>
        <LoginForm />
      </div>
    </div>
  );
}
