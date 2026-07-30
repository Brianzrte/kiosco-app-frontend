import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { homeFor } from "@/lib/nav";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.roles));

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div
        aria-hidden="true"
        className="aurora-blob pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-secondary/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="aurora-blob pointer-events-none absolute -bottom-32 -right-16 size-96 rounded-full bg-primary-light blur-3xl"
        style={{ animationDelay: "-7s" }}
      />

      <div className="section-enter relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-app bg-gradient-to-br from-primary to-secondary-hover text-xl font-bold text-text-inverse shadow-soft-lg">
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
