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
  unit_price: string;
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

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category_id: string;
  price: string;
  cost: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductList = {
  products: Product[];
  total: number;
};

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
export type PurchaseOrderListItem = { id: string; supplier_name: string; ordered_at: string; total: string; status: PurchaseOrderStatus; has_uncatalogued_items: boolean };
export type PurchaseOrdersList = { purchase_orders: PurchaseOrderListItem[]; page: number; limit: number; total: number };
export type PurchaseOrderItem = { id: string; product_id?: string; product_name?: string; description?: string; quantity: number; unit_cost: string; subtotal: string; removed_at?: string; removed_by?: string; removal_reason?: string };
export type PurchaseOrder = { id: string; supplier_id: string; supplier_name: string; ordered_at: string; total: string; status: PurchaseOrderStatus; received_at?: string; received_by?: string; received_by_name?: string; payment_method?: "cash" | "transfer" | "account"; items: PurchaseOrderItem[] };
