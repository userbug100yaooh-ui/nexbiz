// Sessão mock do NEXBIZ (escopo: "não simule autenticação real").
// Guarda { user, company } no localStorage e notifica os ouvintes. Ao sair, limpa o
// cache do react-query para os dados de uma conta nunca vazarem para o próximo login.

import { useSyncExternalStore } from "react";
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
  current = session;
  localStorage.setItem(KEY, JSON.stringify(session));
  listeners.forEach((l) => l());
}

export function signOut(): void {
  current = null;
  localStorage.removeItem(KEY);
  queryClient.clear();
  listeners.forEach((l) => l());
}
