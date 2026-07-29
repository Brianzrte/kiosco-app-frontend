import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { homeFor } from "@/lib/nav";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.roles));

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-app bg-primary text-lg font-bold text-text-inverse shadow-soft">
            M
          </span>
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Mini Moni
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Iniciá sesión para operar
            </p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
