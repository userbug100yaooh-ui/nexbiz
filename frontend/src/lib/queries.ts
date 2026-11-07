// Camada de dados: TanStack Query + api.ts, com fallback offline para o bundle
// demonstrativo (preview estático sem backend mostra os dados, nunca tela em branco).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiDelete, apiGet, apiPost, apiPut, apiUpload } from "@/lib/api";
import { demoData } from "@/lib/demo-data";
import { getSession } from "@/lib/session";
import type {
  AppUser,
  AuthOut,
  Client,
  ClientInput,
  Company,
  CompanyUpdate,
  DemoBundle,
  ImportOut,
  Product,
  ProductInput,
  RegisterInput,
  Sale,
  SaleInput,
  Service,
  ServiceInput,
  ServiceOrder,
  ServiceOrderInput,
  ServiceOrderUpdate,
  Transaction,
  TransactionInput,
} from "@/lib/types";

/** GET /api/... com fallback: erro de rede (sem backend) devolve os dados demo SOMENTE
 *  na conta demo/offline — uma conta real nunca vê dados fictícios; erro HTTP é lançado. */
export async function withFallback<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiGet<T>(path);
  } catch (e) {
    if (e instanceof ApiError || getSession()?.mode === "supabase") throw e;
    return fallback;
  }
}

export function errMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const detail = (e.body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail; // mensagem real do backend primeiro
    if (e.status === 401) return "Sua sessão expirou — faça login novamente.";
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

export const useServiceOrders = () =>
  useQuery({ queryKey: ["service-orders"], queryFn: () => withFallback<ServiceOrder[]>("/service-orders", bundle.service_orders) });

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

// ---------------------------------------------------------------- ordens de serviço

const OS_STATUS_TOAST: Record<string, string> = {
  em_andamento: "Ordem de serviço iniciada!",
  concluida: "OS concluída — receita lançada no financeiro.",
  cancelada: "Ordem de serviço cancelada.",
  aberta: "Ordem de serviço reaberta.",
};

export function useServiceOrderMutations() {
  const invalidate = useInvalidate();
  const onError = (e: unknown) => toast.error(errMessage(e));
  return {
    create: useMutation({
      mutationFn: (body: ServiceOrderInput) => apiPost<ServiceOrder>("/service-orders", body),
      onSuccess: (os) => {
        invalidate(["service-orders", "transactions"]);
        toast.success(`Ordem de serviço ${os.code} criada!`);
      },
      onError,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: ServiceOrderUpdate }) => apiPut<ServiceOrder>(`/service-orders/${id}`, body),
      onSuccess: (os) => {
        invalidate(["service-orders", "transactions"]);
        toast.success(OS_STATUS_TOAST[os.status] ?? "Ordem de serviço atualizada!");
      },
      onError,
    }),
    remove: useMutation({
      mutationFn: (id: string) => apiDelete<ServiceOrder>(`/service-orders/${id}`),
      onSuccess: () => {
        invalidate(["service-orders", "transactions"]);
        toast.success("Ordem de serviço excluída.");
      },
      onError,
    }),
  };
}

// ---------------------------------------------------------------- importação

export function useImportMutation(entity: "products" | "clients") {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (file: File) => apiUpload<ImportOut>(`/import/${entity}`, file),
    onSuccess: (res) => {
      invalidate([entity]);
      toast.success(`${res.created} registro(s) importado(s)${res.skipped ? ` · ${res.skipped} linha(s) ignorada(s)` : ""}.`);
    },
    onError: (e: unknown) => toast.error(errMessage(e)),
  });
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

export function useDemoMutation() {
  return useMutation({ mutationFn: () => apiPost<AuthOut>("/auth/demo") });
}

/** Troca os tokens do link do e-mail (#access_token=…) por cookies httpOnly. */
export function useOpenSessionMutation() {
  return useMutation({
    mutationFn: (body: { access_token: string; refresh_token: string }) => apiPost<AuthOut>("/auth/session", body),
  });
}

export function useForgotMutation() {
  return useMutation({ mutationFn: (email: string) => apiPost<{ detail: string }>("/auth/forgot", { email }) });
}

export function useResendMutation() {
  return useMutation({ mutationFn: (email: string) => apiPost<{ detail: string }>("/auth/resend", { email }) });
}

export function usePasswordMutation() {
  return useMutation({ mutationFn: (password: string) => apiPost<void>("/auth/password", { password }) });
}

/** Revalida a sessão do cookie no backend (401 = expirada). */
export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => apiGet<AuthOut>("/auth/me"), retry: false, staleTime: 60_000 });

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (body: RegisterInput) => apiPost<AuthOut>("/auth/register", body),
  });
}
