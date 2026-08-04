export type Role = "admin" | "cashier" | "inventory" | "receiving";

export type User = {
  id: string;
  username: string;
  roles: Role[];
  active: boolean;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  created_at: string;
};

export type SaleStatus = "draft" | "confirmed";

export type SalePayment = {
  id: string;
  method: "CASH" | "CARD" | "TRANSFER";
  amount: string;
};

export type SaleItem = {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  weight?: string;
  unit_price: string;
  calculated_subtotal: string;
  actual_price?: string;
  subtotal: string;
};

export type Sale = {
  id: string;
  cashier_id: string;
  status: SaleStatus;
  sale_number: number | null | undefined;
  payments: SalePayment[];
  total: string;
  items: SaleItem[];
  created_at: string;
  confirmed_at: string | null;
};

export type OperationalSale = {
  id: string;
  cashier_id: string;
  status: SaleStatus;
  sale_number: number | null | undefined;
  payments: SalePayment[];
  total: string | null;
  created_at: string;
  confirmed_at: string | null;
};

export type OperationalSalesList = {
  items: OperationalSale[];
  page: number;
  limit: number;
  total: number;
};

export type CashierShiftSummary = {
  total_sales: number;
  total_amount: string;
  total_cash: string;
  total_card: string;
  total_transfer: string;
};

export type CashClosing = {
  id: string;
  cashier_id: string;
  from: string;
  to: string;
  expected_cash: string;
  counted_cash: string;
  difference: string;
  notes?: string | null;
  closed_at: string;
};

export type CashClosingReconciliationStatus =
  | "NO_ACTIVITY"
  | "IN_PROGRESS"
  | "UNCLOSED"
  | "CLOSED"
  | "REQUIRES_UPDATE";

export type CashClosingStatus = {
  business_date: string;
  status: CashClosingReconciliationStatus;
  latest_closing: CashClosing | null;
  sales_after_latest_closing: number;
  cash_after_latest_closing: string;
};

export type DailyCashClosingStatusItem = {
  business_date: string;
  cashier_id: string;
  cashier_username: string;
  status: CashClosingReconciliationStatus;
  total_sales: number;
  total_amount: string;
  expected_cash: string | null;
  counted_cash: string | null;
  difference: string | null;
  sales_after_latest_closing: number;
  cash_after_latest_closing: string;
  latest_closing: CashClosing | null;
};

export type DailyCashClosingStatusList = {
  items: DailyCashClosingStatusItem[];
  page: number;
  limit: number;
  total: number;
};

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category_id: string;
  unit_type?: "unitario" | "pesable";
  price: string;
  price_per_kg?: string;
  cost: string;
  sells_by_unit: boolean;
  units_per_package: number;
  extra_margin_percent: string;
  parent_product_id: string | null;
  unit_product: ProductReference | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductReference = {
  id: string;
  name: string;
  sku: string;
  price: string;
  active: boolean;
};

export type ProductConflict = Pick<ProductReference, "id" | "name" | "sku">;

export type ProductPayload = {
  sku: string;
  barcode?: string;
  name: string;
  category_id: string;
  unit_type: "unitario" | "pesable";
  price: string;
  price_per_kg?: string;
  cost: string;
  sells_by_unit?: boolean;
  units_per_package?: number;
  extra_margin_percent?: string;
};

export type ProductList = {
  products: Product[];
  total: number;
};

export type ProductSkuSuggestion = { sku: string };

export type Category = {
  id: string;
  name: string;
};

export type CategoryList = { categories: Category[]; total: number };

export type Stock = {
  product_id: string;
  quantity: number;
  minimum_quantity: number;
  updated_at: string;
};

export type StockListItem = {
  product_id: string;
  sku: string;
  name: string;
  barcode: string | null;
  active: boolean;
  initialized: boolean;
  quantity: number;
  minimum_quantity: number;
  updated_at: string | null;
};

export type StockList = { items: StockListItem[]; total: number };

/** Cerrado a los cuatro valores que valida el backend; `RETURN` no trae filas hasta que existan devoluciones. */
export type MovementType =
  "SALE" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT" | "RETURN";

export type StockMovement = {
  id: string;
  product_id: string;
  product_name: string;
  type: string;
  quantity_delta: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string;
  reference_id: string | null;
  performed_by: string;
  performed_by_username: string;
  created_at: string;
};

export type MovementList = {
  items: StockMovement[];
  page: number;
  limit: number;
  total: number;
};

export type ReturnItem = {
  id: string;
  sale_item_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
};

export type Return = {
  id: string;
  sale_id: string;
  reason: string;
  total_amount: string;
  performed_by: string;
  created_at: string;
  items: ReturnItem[];
};

export type ReturnList = { returns: Return[]; total: number };

export type PurchaseOrderStatus = "PENDING" | "RECEIVED" | "CANCELLED";
export type Supplier = { id: string; name: string; active: boolean };
export type SuppliersList = { suppliers: Supplier[] };
export type ProductSupplier = {
  product_id: string;
  supplier_id: string;
  preferred: boolean;
  replenishment_frequency_days?: number;
};
export type ProductSuppliersList = { suppliers: ProductSupplier[] };
export type ReplenishmentSuggestion = {
  product_id: string;
  product_name: string;
  supplier_id?: string;
  suggested_quantity?: number;
  explanation: string;
};
export type ReplenishmentSuggestionsList = {
  suggestions: ReplenishmentSuggestion[];
};
export type PurchaseOrderPaymentMethod = "cash" | "transfer" | "account";
export type PurchaseOrderPayment = {
  id: string;
  purchase_order_id: string;
  amount: string;
  method: "cash" | "transfer";
  paid_at: string;
  paid_by: string;
};
export type PurchaseOrderListItem = {
  id: string;
  supplier_name: string;
  ordered_at: string;
  total: string;
  status: PurchaseOrderStatus;
  received_at?: string;
  received_by?: string;
  has_uncatalogued_items: boolean;
};
export type PurchaseOrdersList = { purchase_orders: PurchaseOrderListItem[]; page: number; limit: number; total: number };
export type PurchaseOrderItem = {
  id: string;
  product_id?: string;
  product_name?: string;
  description?: string;
  quantity: number;
  received_quantity: number;
  non_delivery_reason?: string;
  unit_cost: string;
  subtotal: string;
  removed_at?: string;
  removed_by?: string;
  removal_reason?: string;
};
export type PurchaseOrder = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  ordered_at: string;
  total: string;
  status: PurchaseOrderStatus;
  received_at?: string;
  received_by?: string;
  received_by_name?: string;
  payment_method?: PurchaseOrderPaymentMethod;
  items: PurchaseOrderItem[];
};
export type PurchasesBySupplierReport = {
  investment: string;
  purchase_order_count: number;
  complete_delivery_count: number;
  incomplete_delivery_count: number;
  undelivered_products: number;
};
