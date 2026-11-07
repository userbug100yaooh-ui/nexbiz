import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { addDaysISO, formatDate, initials, todayISO } from "@/lib/format";
import { stockStatus } from "@/lib/calc";
import { useCompany, useMe, useProducts, useTransactions } from "@/lib/queries";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";
import { signOut, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/components/StatusBadge";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  slug: string;
  end?: boolean;
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Principal",
    items: [
      { to: "/app", label: "Dashboard", icon: LayoutDashboard, slug: "dashboard", end: true },
      { to: "/app/vendas", label: "Vendas", icon: ShoppingCart, slug: "vendas" },
      { to: "/app/clientes", label: "Clientes", icon: Users, slug: "clientes" },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/app/produtos", label: "Produtos e Estoque", icon: Package, slug: "produtos" },
      { to: "/app/servicos", label: "Serviços", icon: Wrench, slug: "servicos" },
      { to: "/app/ordens-servico", label: "Ordens de Serviço", icon: ClipboardList, slug: "ordens-servico" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { to: "/app/financeiro", label: "Financeiro", icon: Wallet, slug: "financeiro" },
      { to: "/app/relatorios", label: "Relatórios", icon: BarChart3, slug: "relatorios" },
    ],
  },
  {
    label: "Sistema",
    items: [{ to: "/app/configuracoes", label: "Configurações", icon: Settings, slug: "configuracoes" }],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV_SECTIONS.map((section) => (
        <div key={section.label} className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{section.label}</p>
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              data-testid={`sidebar-nav-${item.slug}`}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-white shadow-sm" : "text-slate-300 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { data: company } = useCompany();
  const session = useSession();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-5">
        <Logo onDark />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <NavList onNavigate={onNavigate} />
      </nav>
      <div className="shrink-0 border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-white/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Empresa ativa</p>
          <p className="mt-1 truncate text-sm font-semibold text-white" data-testid="sidebar-empresa-nome">
            {company?.name ?? "—"}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {session ? `${session.user.name} · ${ROLE_LABELS[session.user.role] ?? session.user.role}` : "Plano Profissional · Demo"}
          </p>
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-blue-300" data-testid="sidebar-modo-sessao">
            <span className={cn("size-1.5 rounded-full", session?.mode === "supabase" ? "bg-emerald-400" : "bg-amber-400")} />
            {session?.mode === "supabase" ? "Conta verificada" : "Modo demonstração"}
          </p>
        </div>
      </div>
    </div>
  );
}

function CompanyBadge() {
  const { data: company } = useCompany();
  return (
    <span className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 md:flex" data-testid="badge-empresa">
      <Building2 className="size-4 text-primary" />
      <span className="max-w-44 truncate text-sm font-medium">{company?.name ?? "—"}</span>
    </span>
  );
}

function Notifications() {
  const { data: products = [] } = useProducts();
  const { data: transactions = [] } = useTransactions();
  const navigate = useNavigate();

  const items = useMemo(() => {
    const low = products
      .filter((p) => stockStatus(p) !== "ok")
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: p.name,
        detail: p.stock === 0 ? "Sem estoque — repor urgente" : `Restam ${p.stock} un. (mínimo ${p.min_stock})`,
        to: "/app/produtos",
      }));
    const soon = addDaysISO(todayISO(), 7);
    const due = transactions
      .filter((t) => !t.paid && t.due_date <= soon)
      .slice(0, 3)
      .map((t) => ({
        id: t.id,
        title: t.description,
        detail: `${t.kind === "despesa" ? "A pagar" : "A receber"} em ${formatDate(t.due_date)}`,
        to: "/app/financeiro",
      }));
    return [...low, ...due];
  }, [products, transactions]);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="icon" className="relative" aria-label="Notificações" data-testid="btn-notificacoes" />
        }
      >
        <Bell className="size-4" />
        {items.length > 0 && (
          <span
            className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
            data-testid="badge-notificacoes-count"
          >
            {items.length}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2" data-testid="popover-notificacoes">
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Alertas</p>
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">Nenhum alerta no momento.</p>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              onClick={() => navigate(n.to)}
              className="w-full rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted"
              data-testid={`notificacao-${n.id}`}
            >
              <p className="truncate text-sm font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.detail}</p>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

function ProfileMenu({ onSignOut }: { onSignOut: () => void }) {
  const session = useSession();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-2" data-testid="btn-perfil" />}>
        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initials(session?.user.name ?? "NB")}
        </span>
        <span className="hidden text-left leading-tight sm:flex sm:flex-col">
          <span className="text-sm font-medium">{session?.user.name}</span>
          <span className="text-[11px] text-muted-foreground">{ROLE_LABELS[session?.user.role ?? ""] ?? "—"}</span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-testid="menu-perfil">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <p className="text-sm font-medium">{session?.user.name}</p>
            <p className="text-xs font-normal text-muted-foreground">{session?.user.email}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} data-testid="btn-sair">
          <LogOut className="size-4" /> Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CommandDialog({
  open,
  onOpenChange,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (to: string) => void;
}) {
  const [query, setQuery] = useState("");
  const flat = NAV_SECTIONS.flatMap((s) => s.items);
  const results = flat.filter((i) => i.label.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery("");
      }}
    >
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg" data-testid="dialog-busca-global">
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar telas e ações…"
          className="h-12 rounded-none border-0 border-b"
          data-testid="input-busca-global"
        />
        <div className="max-h-64 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nada encontrado para “{query}”.</p>
          ) : (
            results.map((i) => (
              <button
                key={i.to}
                onClick={() => onNavigate(i.to)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                data-testid={`busca-resultado-${i.slug}`}
              >
                <i.icon className="size-4 text-primary" />
                {i.label}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Topbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSignOut = () => {
    void signOut().then(() => navigate("/login"));
  };

  return (
    <header
      className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6 lg:px-8"
      data-testid="topbar"
    >
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger
          render={<Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu" data-testid="btn-menu-mobile" />}
        >
          <Menu className="size-4" />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&>button]:text-slate-400"
          data-testid="menu-mobile"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarBody onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <Button
        variant="outline"
        className="hidden gap-2 text-muted-foreground md:flex"
        onClick={() => setSearchOpen(true)}
        data-testid="btn-busca-global"
      >
        <Search className="size-4" />
        Buscar…
        <kbd className="ml-6 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="md:hidden"
        onClick={() => setSearchOpen(true)}
        aria-label="Buscar"
        data-testid="btn-busca-mobile"
      >
        <Search className="size-4" />
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <CompanyBadge />
        <Notifications />
        <ProfileMenu onSignOut={handleSignOut} />
      </div>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={(to) => {
          setSearchOpen(false);
          navigate(to);
        }}
      />
    </header>
  );
}

/** Layout autenticado: sidebar navy fixa no desktop, drawer no mobile + topo sticky. */
export default function AppShell() {
  const session = useSession();
  const navigate = useNavigate();
  const me = useMe();
  const expired = me.error instanceof ApiError && me.error.status === 401;

  // Cookie expirado/ausente no backend → encerra o perfil local e volta ao login.
  // (Erro de rede = preview estático sem backend: mantém o modo demonstração offline.)
  useEffect(() => {
    if (!expired || !session) return;
    void signOut(false).then(() => {
      toast.error("Sua sessão expirou — faça login novamente.");
      navigate("/login", { replace: true });
    });
  }, [expired, session, navigate]);

  if (!session) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-svh bg-background">
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-sidebar text-sidebar-foreground lg:flex lg:flex-col"
        data-testid="sidebar-desktop"
      >
        <SidebarBody />
      </aside>
      <div className="flex min-h-svh flex-col lg:pl-64">
        <Topbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8" data-testid="app-main">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
        <footer className="border-t border-border px-4 py-4 text-center text-xs text-muted-foreground lg:px-8">
          NEXBIZ · Ambiente de demonstração com dados fictícios · v1.0
        </footer>
      </div>
    </div>
  );
}
