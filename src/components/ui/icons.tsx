import { SVGProps } from "react";

/**
 * Hand-authored line-icon set (visual-redesign, add-visual-redesign-tokens).
 * One consistent language — 24x24 viewBox, 1.75 stroke, round caps/joins,
 * no fill except the occasional solid accent dot — so nav, POS payment
 * chips and dashboard stat tiles read as one system instead of borrowing
 * mismatched icon styles. Purely decorative next to text everywhere they're
 * used (nav labels, payment chip labels, stat card captions), so every icon
 * is `aria-hidden`; nothing communicates state through the icon alone.
 *
 * No icon library was added for this — the surface needed (~13 icons) is
 * small and fixed, and the project has no icon dependency today.
 */

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconCart(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 8H6" />
      <circle cx="9.5" cy="20" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="20" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Icon>
  );
}

export function IconBox(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Z" />
      <path d="M3 7.5 12 12l9-4.5" />
      <path d="M12 12v9" />
    </Icon>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </Icon>
  );
}

export function IconTruck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 7.5h11v8H2z" />
      <path d="M13 10.5h3.7l3.3 3v2h-7z" />
      <circle cx="6.7" cy="18" r="1.6" />
      <circle cx="16.8" cy="18" r="1.6" />
    </Icon>
  );
}

export function IconTag(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.6 3H5a2 2 0 0 0-2 2v7.6a2 2 0 0 0 .6 1.4l8.4 8.4a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L12.6 3Z" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16.3 5.6a3.2 3.2 0 0 1 0 6.1" />
      <path d="M21 20c0-2.7-1.8-5-4.3-5.7" />
    </Icon>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M3 20h18" />
    </Icon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </Icon>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Icon>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  );
}

export function IconCash(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.6" />
    </Icon>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Icon>
  );
}

export function IconCardPay(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </Icon>
  );
}

export function IconTransfer(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8h13" />
      <path d="M13 4l4 4-4 4" />
      <path d="M21 16H8" />
      <path d="M11 12l-4 4 4 4" />
    </Icon>
  );
}

export function IconBarcode(props: IconProps) {
  return (
    <Icon {...props} strokeWidth={2}>
      <path d="M3 5v14" />
      <path d="M7 5v14" />
      <path d="M10.5 5v14" />
      <path d="M13 5v14" />
      <path d="M17 5v14" />
      <path d="M21 5v14" />
    </Icon>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.5 2.5L16 9.5" />
    </Icon>
  );
}

export function IconInfoCircle(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconX(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Icon>
  );
}

export function IconPower(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3v9" />
      <path d="M7.1 5.8a8 8 0 1 0 9.8 0" />
    </Icon>
  );
}

export function IconUserOff(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6 1.5 0 2.9.5 4 1.4" />
      <path d="M15 15l6 6" />
      <path d="M21 15l-6 6" />
    </Icon>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Icon>
  );
}

// One line branching into two — "split payment" in the POS payment panel.
export function IconSplit(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v5" />
      <path d="M12 9 7 14v6" />
      <path d="M12 9l5 5v6" />
    </Icon>
  );
}

// Cart quantity stepper (PosView). Interactive when used inside a button —
// like IconEye below, aria-hidden is left as the base default since the
// button itself carries the aria-label.
export function IconMinus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

// Remove-line action (PosView cart). Always paired with the "Quitar" text
// label — iconography.md: a destructive action never goes icon-only.
export function IconTrash(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Icon>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m4 16.5-.8 3.3 3.3-.8L18.8 6.7a2.1 2.1 0 0 0-3-3L4 16.5Z" />
      <path d="m14.5 5.5 4 4" />
    </Icon>
  );
}

// Password visibility toggle (LoginForm). Interactive when used inside a
// button, unlike the rest of this file — the caller sets its own
// aria-label/aria-hidden as appropriate instead of hardcoding it here.
export function IconEye(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a15.6 15.6 0 0 1-4 4.6" />
      <path d="M6.5 6.7C3.8 8.6 2 12 2 12s3.5 7 10 7a9.9 9.9 0 0 0 3.4-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </Icon>
  );
}

// Keypad grid inside a body, matching IconCash/IconCardPay's rect+glyph
// language — "calcular vuelto" in the POS payment panel.
export function IconCalculator(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M7 7h10" />
      <circle cx="7.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="16" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="16" r="0.9" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// Clock face — "Pendiente" status badge on purchase orders
// (redesign-frontend-purchasing-section). Paths copied literally from the
// Claude Design mockup (PurchasingHub.dc.html / PurchaseOrderDetail.dc.html).
export function IconClock(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Icon>
  );
}

// Three uneven text lines — "Describir el producto" tab in the add-uncataloged-
// item form (redesign-frontend-purchasing-section). Path copied literally
// from AddUncatalogedItem.dc.html; distinct from IconMenu (three equal
// full-width lines), which is the app's nav hamburger.
export function IconTextLines(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </Icon>
  );
}

// Two uneven horizontal lines — "Recibí menos" line action in the purchase
// order reception detail (redesign-frontend-purchasing-section). Path copied
// literally from PurchaseOrderDetail.dc.html.
export function IconPartialLines(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8h16" />
      <path d="M4 16h9" />
    </Icon>
  );
}
