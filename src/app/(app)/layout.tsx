import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { Nav } from "@/components/shell/Nav";
import { ToastProvider } from "@/components/ui/Toast";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <ToastProvider>
      <Nav role={session.role} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        {children}
      </main>
    </ToastProvider>
  );
}
