// Sessão do NEXBIZ. A autenticação real vive em cookies httpOnly definidos pelo backend
// (/api/auth/*) — o JavaScript nunca vê tokens. Aqui guardamos só o perfil exibido
// ({ user, company, mode }) para render imediato. Ao sair, o backend limpa os cookies e
// o cache do react-query é apagado para os dados de uma conta nunca vazarem para a próxima.

import { useSyncExternalStore } from "react";
import { apiPost } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Session } from "@/lib/types";

const KEY = "nexbiz.session";

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let current: Session | null = read();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Hook reativo: re-renderiza quando a sessão muda (login/logout). */
export function useSession(): Session | null {
  return useSyncExternalStore(subscribe, () => current);
}

export function signIn(session: Session): void {
  queryClient.clear();
  current = session;
  localStorage.setItem(KEY, JSON.stringify(session));
  listeners.forEach((l) => l());
}

/** Limpa o perfil local + cache. `server` = também encerra os cookies no backend. */
export async function signOut(server = true): Promise<void> {
  if (server) await apiPost("/auth/logout").catch(() => undefined);
  current = null;
  localStorage.removeItem(KEY);
  queryClient.clear();
  listeners.forEach((l) => l());
}
