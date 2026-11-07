// Espelho manual dos modelos Pydantic em backend/models/entities.py — nada infere
// entre Python e TypeScript; manter os dois em sincronia no mesmo lote de edição.

export interface Company {
  id: string;
  name: string;
  legal_name: string;
  cnpj: string;
  segment: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  plan: string;
  created_at: string;
}

export interface AppUser {
  id: string;
  company_id: string;
  name: string;
  email: string;
  role: string; // admin | gerente | vendedor
  supabase_user_id: string; // "" = usuário demo/seed
  created_at: string;
}

export interface AuthOut {
  user: AppUser;
  company: Company;
  mode: string; // demo | supabase
  email_confirmation_required: boolean;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  kind: string; // PF | PJ
  document: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  notes: string;
  created_at: string;
}

export interface Service {
  id: string;
  company_id: string;
  name: string;
  description: string;
  category: string;
  pricing: string; // fixo | hora
  price: number;
  estimated_hours: number;
  active: boolean;
  created_at: string;
}

export interface SaleItem {
  product_id: string;
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  company_id: string;
  code: string; // VND-0001
  client_id: string;
  client_name: string;
  items: SaleItem[];
  total: number;
  status: string; // pago | pendente | cancelado
  payment_method: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  company_id: string;
  kind: string; // receita | despesa
  description: string;
  category: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  paid: boolean;
  method: string;
  created_at: string;
}

// Espelho de backend/models/service_orders.py
export interface ServiceOrder {
  id: string;
  company_id: string;
  code: string; // OS-0001
  client_id: string;
  client_name: string;
  service_id: string;
  service_name: string;
  status: string; // aberta | em_andamento | concluida | cancelada
  scheduled_date: string; // YYYY-MM-DD
  price: number;
  notes: string;
  created_at: string;
}

export interface ServiceOrderInput {
  client_id: string;
  service_id: string;
  status: string;
  scheduled_date: string;
  price: number | null;
  notes: string;
}

export interface ServiceOrderUpdate {
  status?: string;
  scheduled_date?: string;
  notes?: string;
}

// Espelho de ImportOut em backend/routers/importer.py
export interface ImportOut {
  created: number;
  skipped: number;
  total: number;
}

// ---- payloads de entrada (espelham *In / *Update no backend) ----

export type ProductInput = Pick<Product, "name" | "sku" | "category" | "unit" | "price" | "cost" | "stock" | "min_stock" | "active">;

export type ClientInput = Pick<Client, "name" | "kind" | "document" | "email" | "phone" | "city" | "state" | "notes">;

export type ServiceInput = Pick<Service, "name" | "description" | "category" | "pricing" | "price" | "estimated_hours" | "active">;

export interface SaleItemInput {
  product_id: string;
  qty: number;
}

export interface SaleInput {
  client_id: string;
  items: SaleItemInput[];
  status: string; // pago | pendente
  payment_method: string;
}

export type TransactionInput = Pick<Transaction, "kind" | "description" | "category" | "amount" | "due_date" | "paid" | "method">;

export type CompanyUpdate = Partial<Pick<Company, "name" | "legal_name" | "cnpj" | "segment" | "email" | "phone" | "address" | "city" | "state">>;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  company_name: string;
  segment: string;
  cnpj: string;
  phone: string;
  city: string;
  state: string;
}

// ---- sessão mock (auth demo; futuramente: sessão httpOnly via Supabase) ----

export interface Session {
  user: AppUser;
  company: Company;
  mode?: string; // demo | supabase | offline
}

// ---- bundle de dados demonstrativos (gerado por backend/export_demo.py) ----

export interface DemoBundle {
  company: Company;
  users: AppUser[];
  products: Product[];
  clients: Client[];
  services: Service[];
  service_orders: ServiceOrder[];
  sales: Sale[];
  transactions: Transaction[];
}
