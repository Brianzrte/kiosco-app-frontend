import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { Nav } from "@/components/shell/Nav";
import { OpeningFundBanner } from "@/components/shell/OpeningFundBanner";
import { SectionTransition } from "@/components/shell/SectionTransition";
import { RouteTransitionIndicator } from "@/components/shell/RouteTransitionIndicator";
import { ToastProvider } from "@/components/ui/Toast";
import { Workspace, WorkspaceContent } from "@/components/ui/Workspace";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  // pb-24 clears Nav's fixed mobile bottom tab bar. Admin uses the existing
  // mobile drawer instead, so it does not reserve that space.
  const hasBottomTabBar = !session.roles.includes("admin");
  const isOperator = session.roles.some(
    (role) => role === "admin" || role === "cashier",
  );

  return (
    <ToastProvider>
      <Workspace className="md:grid md:min-h-dvh md:grid-cols-[var(--layout-rail-condensed)_minmax(0,1fr)] xl:grid-cols-[var(--layout-rail)_minmax(0,1fr)]">
        <Nav roles={session.roles} />
        <WorkspaceContent className="min-w-0 overflow-x-clip">
          {isOperator && <OpeningFundBanner />}
          <main
            className={`mx-auto w-full max-w-[var(--layout-workspace)] py-6 md:py-0 ${hasBottomTabBar ? "pb-24" : "pb-6 md:pb-0"}`}
          >
            <RouteTransitionIndicator>
              <SectionTransition>{children}</SectionTransition>
            </RouteTransitionIndicator>
          </main>
        </WorkspaceContent>
      </Workspace>
    </ToastProvider>
  );
}
