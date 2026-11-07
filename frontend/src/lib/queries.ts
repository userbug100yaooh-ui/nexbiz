// Camada de dados: TanStack Query + api.ts, com fallback offline para o bundle
// demonstrativo (preview estático sem backend mostra os dados, nunca tela em branco).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { demoData } from "@/lib/demo-data";
import type {
  AppUser,
  AuthOut,
  Client,
  ClientInput,
  Company,
  CompanyUpdate,
  DemoBundle,
  Product,
  ProductInput,
  RegisterInput,
  Sale,
  SaleInput,
  Service,
  ServiceInput,
  Transaction,
  TransactionInput,
} from "@/lib/types";

/** GET /api/... com fallback: erro de rede (sem backend) devolve os dados demo;
 *  erro HTTP real (4xx/5xx) é lançado para não mascarar problemas. */
export async function withFallback<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiGet<T>(path);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    return fallback;
  }
}

export function errMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const detail = (e.body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail;
    return `Não foi possível concluir a operação (erro ${e.status}).`;
  }
  if (e instanceof TypeError) return "Sem conexão com o servidor — no modo demonstração é possível apenas visualizar os dados.";
  return "Erro inesperado. Tente novamente.";
}

// ---------------------------------------------------------------- queries

const bundle = demoData as DemoBundle;

export const useCompany = () =>
  useQuery({ queryKey: ["company"], queryFn: () => withFallback<Company>("/company", bundle.company) });

export const useUsers = () =>
  useQuery({ queryKey: ["users"], queryFn: () => withFallback<AppUser[]>("/users", bundle.users) });

export const useProducts = () =>
  useQuery({ queryKey: ["products"], queryFn: () => withFallback<Product[]>("/products", bundle.products) });

export const useClients = () =>
  useQuery({ queryKey: ["clients"], queryFn: () => withFallback<Client[]>("/clients", bundle.clients) });

export const useServices = () =>
  useQuery({ queryKey: ["services"], queryFn: () => withFallback<Service[]>("/services", bundle.services) });

export const useSales = () =>
  useQuery({ queryKey: ["sales"], queryFn: () => withFallback<Sale[]>("/sales", bundle.sales) });

export const useTransactions = () =>
  useQuery({ queryKey: ["transactions"], queryFn: () => withFallback<Transaction[]>("/transactions", bundle.transactions) });

// ---------------------------------------------------------------- mutações

function useInvalidate() {
  const qc = useQueryClient();
  return (keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useProductMutations() {
  const invalidate = useInvalidate();
  const onError = (e: unknown) => toast.error(errMessage(e));
  return {
    create: useMutation({
      mutationFn: (body: ProductInput) => apiPost<Product>("/products", body),
      onSuccess: () => {
        invalidate(["products"]);
        toast.success("Produto cadastrado com sucesso!");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: ProductInput }) => apiPut<Product>(`/products/${id}`, body),
      onSuccess: () => {
        invalidate(["products"]);
        toast.success("Produto atualizado!");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiDelete<Product>(`/products/${id}`),
      onSuccess: () => {
        invalidate(["products"]);
        toast.success("Produto removido.");
      },
      onError,
    }),
  };
}

export function useClientMutations() {
  const invalidate = useInvalidate();
  const onError = (e: unknown) => toast.error(errMessage(e));
  return {
    create: useMutation({
      mutationFn: (body: ClientInput) => apiPost<Client>("/clients", body),
      onSuccess: () => {
        invalidate(["clients"]);
        toast.success("Cliente cadastrado com sucesso!");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: ClientInput }) => apiPut<Client>(`/clients/${id}`, body),
      onSuccess: () => {
        invalidate(["clients"]);
        toast.success("Cliente atualizado!");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiDelete<Client>(`/clients/${id}`),
      onSuccess: () => {
        invalidate(["clients"]);
        toast.success("Cliente removido.");
      },
      onError,
    }),
  };
}

export function useServiceMutations() {
  const invalidate = useInvalidate();
  const onError = (e: unknown) => toast.error(errMessage(e));
  return {
    create: useMutation({
      mutationFn: (body: ServiceInput) => apiPost<Service>("/services", body),
      onSuccess: () => {
        invalidate(["services"]);
        toast.success("Serviço cadastrado com sucesso!");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: ServiceInput }) => apiPut<Service>(`/services/${id}`, body),
      onSuccess: () => {
        invalidate(["services"]);
        toast.success("Serviço atualizado!");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiDelete<Service>(`/services/${id}`),
      onSuccess: () => {
        invalidate(["services"]);
        toast.success("Serviço removido.");
      },
      onError,
    }),
  };
}

export function useSaleMutations() {
  const invalidate = useInvalidate();
  const onError = (e: unknown) => toast.error(errMessage(e));
  return {
    create: useMutation({
      mutationFn: (body: SaleInput) => apiPost<Sale>("/sales", body),
      onSuccess: (sale) => {
        invalidate(["sales", "products", "transactions"]);
        toast.success(`Venda ${sale.code} registrada com sucesso!`);
      },
      onError,
    }),
    updateStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) => apiPut<Sale>(`/sales/${id}`, { status }),
      onSuccess: (sale) => {
        invalidate(["sales", "products", "transactions"]);
        toast.success(
          sale.status === "pago" ? "Venda marcada como paga!" : sale.status === "cancelado" ? "Venda cancelada — estoque devolvido." : "Status da venda atualizado!",
        );
      },
      onError,
    }),
  };
}

export function useTransactionMutations() {
  const invalidate = useInvalidate();
  const onError = (e: unknown) => toast.error(errMessage(e));
  return {
    create: useMutation({
      mutationFn: (body: TransactionInput) => apiPost<Transaction>("/transactions", body),
      onSuccess: () => {
        invalidate(["transactions"]);
        toast.success("Lançamento criado com sucesso!");
      },
      onError,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: TransactionInput }) => apiPut<Transaction>(`/transactions/${id}`, body),
      onSuccess: (t) => {
        invalidate(["transactions"]);
        toast.success(t.paid ? "Lançamento marcado como pago!" : "Lançamento atualizado!");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiDelete<Transaction>(`/transactions/${id}`),
      onSuccess: () => {
        invalidate(["transactions"]);
        toast.success("Lançamento removido.");
      },
      onError,
    }),
  };
}

export function useCompanyMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: CompanyUpdate) => apiPut<Company>("/company", body),
    onSuccess: () => {
      invalidate(["company"]);
      toast.success("Dados da empresa salvos com sucesso!");
    },
    onError: (e: unknown) => toast.error(errMessage(e)),
  });
}

// ---------------------------------------------------------------- auth (mock)

export function useLoginMutation() {
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => apiPost<AuthOut>("/auth/login", body),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (body: RegisterInput) => apiPost<AuthOut>("/auth/register", body),
  });
}
