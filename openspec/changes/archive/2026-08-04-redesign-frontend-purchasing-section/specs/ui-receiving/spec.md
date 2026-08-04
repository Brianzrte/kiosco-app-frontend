## REMOVED Requirements

### Requirement: Receiving section restricted to Receiving and Admin
**Reason**: The capability mandated a receiving section at `/receiving`, which no longer exists as a surface: `src/app/(app)/receiving/page.tsx` is a one-line `redirect("/purchasing")` and `src/components/receiving/ReceivingListView.tsx` is a dead re-export of the purchasing hub. The section is `/purchasing`, shared by Admin, Inventory and Receiving, and its role adaptation is already normative there.
**Migration**: Covered by `ui-suppliers-purchasing` → "Role-adaptive purchasing actions" (which roles see which action, and that a Receiving-only user gets no creation or supplier-management affordance) and "Legacy purchasing routes keep redirecting" (the `/receiving` and `/suppliers` stubs are preserved on purpose).

### Requirement: Purchase order list ordered for receiving
**Reason**: Listing purchase orders is no longer a receiving-specific surface. Pending orders are listed by the purchasing hub and the full history by the purchasing history screen, both already normative in `ui-suppliers-purchasing`, with their own filters, pagination, states and row activation against `/purchasing/[id]`.
**Migration**: Covered by `ui-suppliers-purchasing` → "Purchasing hub prioritizes pending orders" (pending-first listing, supplier and date filters, empty/error states, row action) and "Purchase-order history is filterable and inspectable" (server-side pagination, supported filters, opening a detail).

### Requirement: Purchase order detail
**Reason**: The requirement mandated the detail at `/receiving/[id]`, a route that only redirects. The detail lives at `/purchasing/[id]`.
**Migration**: Re-homed as `ui-suppliers-purchasing` → "Purchase-order detail at the purchasing route", preserving the item fields, the received-order information, the visible struck-through removed items with their reason, and adding the cancelled-order and load-failure states.

### Requirement: Confirm reception with payment method
**Reason**: Reception is no longer a single dialog where every line is edited at once; the redesign approved by the user resolves each line on the detail itself and sends the whole resolution in one reception request from a lighter confirmation dialog.
**Migration**: Re-homed and extended as `ui-suppliers-purchasing` → "Purchase-order lines are resolved one by one before confirming reception" and "Reception confirmation records the payment method and re-reads the order". The mandatory payment method, the up-front statement of what gets recorded, the disabled confirmation while in flight, the inline backend `message`, the re-read instead of an optimistic state and the `409` handling are all preserved.

### Requirement: Add an item that was not in the order
**Reason**: Re-homed to the capability that owns the purchasing section, and extended with the approved redesign of its mode selector.
**Migration**: `ui-suppliers-purchasing` → "Add an item that was not in the order", with the same two mutually exclusive identification modes, required quantity and decimal-string unit cost, `POST /purchase-orders/{id}/items` and the backend-recalculated total, now presented as two tabs with a warning shown before saving a free-text item.

### Requirement: Remove an item from the order with a mandatory reason
**Reason**: Re-homed to the capability that owns the purchasing section, and made explicitly distinct from recording a non-delivery, which the redesign introduces as a separate reception action.
**Migration**: `ui-suppliers-purchasing` → "Remove a line from the order with a mandatory reason", preserving the mandatory reason, the disabled confirm while blank or in flight, `DELETE /purchase-orders/{id}/items/{item_id}`, the re-read and the item remaining visible as removed with its reason.

### Requirement: Uncatalogued items are visibly pending
**Reason**: Re-homed to the capability that owns the purchasing section; the behavior is unchanged.
**Migration**: `ui-suppliers-purchasing` → "Uncatalogued items are visibly pending", with the same marking in the detail and in the list row and the same prohibition on creating the product from purchasing.
