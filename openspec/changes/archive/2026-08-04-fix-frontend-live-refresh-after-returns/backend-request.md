# Backend request: net confirmed sales after returns

## Verified current state

Verified on 2026-08-04 against the backend `sales` spec: `POST
/api/v1/sales/{id}/returns` persists an immutable return, restores stock and
atomically updates the originating confirmed sale's net total and payments.
Summary queries aggregate those persisted net values on the original sale day.

## Required behavior

An authorized return SHALL retain its immutable audit record and atomically
reduce the originating confirmed sale's persisted total and payment amounts to
their net values. It SHALL be accounted to the sale's original `confirmed_at`
business day, even if an Admin registers the return later. The sale SHALL
expose `updated_at`; its items remain the original snapshot, while return
items retain the quantities and amounts removed.

## Contract change

`POST /api/v1/sales/{id}/returns` needs `refund_payments` alongside `reason`
and `items`:

```json
{
  "reason": "Producto equivocado",
  "items": [{ "sale_item_id": "…", "quantity": 1 }],
  "refund_payments": [{ "method": "CASH", "amount": "1200.00" }]
}
```

- `method` is `CASH`, `CARD`, or `TRANSFER`; every amount is a positive
  decimal string.
- Their exact sum SHALL equal the returned-items total and cumulative refunds
  per method SHALL not exceed the original amount paid by that method.
- Success updates `sales.total` and `sale_payments.amount` in the same
  transaction as the return and stock movement; their net sums remain equal.
- Invalid refund shape, a mismatched amount, or method over-refund SHALL roll
  back without a partial mutation; exact status codes belong in the backend
  OpenSpec change.
- `GET /api/v1/sales/{id}` and `GET /api/v1/sales` SHALL expose net total,
  net payment amounts and `updated_at`. Existing summaries and reports then
  reflect net amounts without frontend arithmetic.

Authorization remains unchanged: Admin may return any confirmed sale; a
Cashier may return only their own current-business-day confirmed sale.

## Compatibility and rollout

The new request is incompatible with the frontend's current payload. Deploy
the backend first. Then deploy the frontend refund-payment form and change
`SaleDetail` to use the backend net value rather than subtracting return
history locally. Do not deploy that frontend change against the old backend.

## Unblock criterion

The backend is ready when a real instance verifies cash, card, transfer and
split-payment returns (including partial and later Admin returns), and its sale
reads, summaries and reports expose the net values on the original sale day.

## Resolved follow-up: weighable return quantities

Verified on 2026-08-04: a unit return line carries positive integer
`quantity`; a weighable return line carries positive decimal-string `weight`
in kilograms (up to three decimals). The response omits `quantity` for a
weighable return item. The frontend selects, validates and displays the same
measure as the original sale item, and sends exactly one compatible measure per
line.
