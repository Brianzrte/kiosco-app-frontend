import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { Nav } from "@/components/shell/Nav";
import { SectionTransition } from "@/components/shell/SectionTransition";
import { ToastProvider } from "@/components/ui/Toast";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // pb-24 exists to clear Nav's fixed mobile bottom tab bar. `admin` never
  // gets that bar (nav-mobile-admin-drawer: a menu drawer replaces it
  // instead, opened from the header) — matches Nav.tsx's own
  // `useDrawerNav = isAdmin` check, so this stays in sync with that
  // decision rather than duplicating a role list of its own.
  const hasBottomTabBar = !session.roles.includes("admin");

  return (
    <ToastProvider>
      <Nav roles={session.roles} />
      <main
        className={`mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8 md:pb-8 ${hasBottomTabBar ? "pb-24" : "pb-6"}`}
      >
        <SectionTransition>{children}</SectionTransition>
      </main>
    </ToastProvider>
  );
}
