export type Role = "admin" | "cashier" | "inventory_manager";

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

export type Stock = {
  product_id: string;
  quantity: number;
  minimum_quantity: number;
  updated_at: string;
};
