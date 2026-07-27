export type Role = "admin" | "cashier" | "inventory";

export type User = {
  id: string;
  username: string;
  role: Role;
  active: boolean;
  created_at: string;
};

export type SaleStatus = "draft" | "confirmed";

export type SalePayment = {
  id: string;
  method: "CASH" | "CARD";
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
