import Link from "next/link";

/**
 * Navigation card to a detail report. When `disabledReason` is set, this
 * renders as a non-interactive `div` with no `href` — never a `<Link>` to a
 * page that cannot load, per `ui-reports-dashboard`'s "unavailable report is
 * disabled, not hidden" requirement.
 */
export function ReportNavCard({
  href,
  title,
  description,
  disabledReason,
}: {
  href: string;
  title: string;
  description: string;
  disabledReason?: string;
}) {
  const content = (
    <>
      <p className="font-medium text-text-primary">{title}</p>
      <p className="mt-1 text-sm text-text-secondary">
        {disabledReason ?? description}
      </p>
    </>
  );

  if (disabledReason) {
    return (
      <div
        aria-disabled="true"
        className="rounded-app border border-border bg-surface-2 p-5 opacity-70"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="block rounded-app border border-border bg-surface p-5 shadow-soft transition-colors hover:border-border-hover hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {content}
    </Link>
  );
}
