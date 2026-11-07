import { useMemo, useState } from "react";
import { Building2, MoreHorizontal, Pencil, Plus, Search, Trash2, User, Users } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { round2, sum } from "@/lib/calc";
import { formatBRL, formatNumber } from "@/lib/format";
import { useClientMutations, useClients, useSales } from "@/lib/queries";
import type { Client, ClientInput } from "@/lib/types";

interface ClientForm {
  name: string;
  kind: string;
  document: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  notes: string;
}

const EMPTY_FORM: ClientForm = { name: "", kind: "PJ", document: "", email: "", phone: "", city: "", state: "SP", notes: "" };

export default function Clientes() {
  const { data: clients = [] } = useClients();
  const { data: sales = [] } = useSales();
  const mutations = useClientMutations();

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const purchasesByClient = useMemo(() => {
    const m = new Map<string, { count: number; total: number }>();
    for (const s of sales) {
      if (s.status === "cancelado" || !s.client_id) continue;
      const cur = m.get(s.client_id) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total = round2(cur.total + s.total);
      m.set(s.client_id, cur);
    }
    return m;
  }, [sales]);

  const withPurchases = clients.filter((c) => (purchasesByClient.get(c.id)?.count ?? 0) > 0).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (kindFilter !== "todos" && c.kind !== kindFilter) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.document.includes(search.trim())) return false;
      return true;
    });
  }, [clients, search, kindFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, kind: c.kind, document: c.document, email: c.email, phone: c.phone, city: c.city, state: c.state, notes: c.notes });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const body: ClientInput = {
      name: form.name.trim(),
      kind: form.kind,
      document: form.document.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase().slice(0, 2),
      notes: form.notes.trim(),
    };
    if (editing) {
      mutations.update.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      mutations.create.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const pending = mutations.create.isPending || mutations.update.isPending;

  return (
    <div data-testid="page-clientes">
      <PageHeader title="Clientes & CRM" description="Base de clientes com histórico de compras e contatos.">
        <Button onClick={openCreate} data-testid="btn-novo-cliente">
          <Plus className="size-4" /> Novo cliente
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes cadastrados" value={formatNumber(clients.length)} icon={Users} index={0} testId="stat-clientes-total" />
        <StatCard label="Pessoas jurídicas" value={formatNumber(clients.filter((c) => c.kind === "PJ").length)} icon={Building2} index={1} testId="stat-clientes-pj" />
        <StatCard label="Pessoas físicas" value={formatNumber(clients.filter((c) => c.kind === "PF").length)} icon={User} index={2} testId="stat-clientes-pf" />
        <StatCard label="Com compras registradas" value={formatNumber(withPurchases)} icon={Search} index={3} testId="stat-clientes-com-compras" />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou documento…" className="pl-9" data-testid="input-busca-clientes" />
          </div>
          <Select value={kindFilter} onValueChange={(v: string) => setKindFilter(v)}>
            <SelectTrigger className="sm:w-40" data-testid="filtro-tipo-clientes">
              <SelectValue>{(v: string) => (v === "todos" ? "Todos os tipos" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="PJ">Pessoa jurídica</SelectItem>
              <SelectItem value="PF">Pessoa física</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={Users} title="Nenhum cliente encontrado" description="Ajuste a busca ou cadastre um novo cliente." testId="clientes-vazio">
              <Button size="sm" onClick={openCreate} data-testid="btn-novo-cliente-vazio">
                <Plus className="size-4" /> Novo cliente
              </Button>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table data-testid="table-clientes">
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead className="hidden sm:table-cell">Local</TableHead>
                  <TableHead className="text-right">Compras</TableHead>
                  <TableHead className="text-right">Total comprado</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const purchases = purchasesByClient.get(c.id) ?? { count: 0, total: 0 };
                  return (
                    <TableRow key={c.id} data-testid={`cliente-row-${c.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {c.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-44 truncate font-medium">{c.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {c.kind} · {c.document || "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="max-w-44 truncate text-muted-foreground">{c.email || "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.phone || "—"}</p>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {c.city ? `${c.city}/${c.state}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(purchases.count)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatBRL(purchases.total)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Ações do cliente" data-testid={`cliente-acoes-${c.id}`} />}>
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" data-testid={`cliente-menu-${c.id}`}>
                            <DropdownMenuItem onClick={() => openEdit(c)} data-testid={`cliente-editar-${c.id}`}>
                              <Pencil className="size-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleting(c)} className="text-destructive" data-testid={`cliente-excluir-${c.id}`}>
                              <Trash2 className="size-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Formulário de cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-cliente">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>{editing ? `Atualizando ${editing.name}.` : "Cadastre uma pessoa física ou jurídica."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome / Razão social" className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Padaria Pão de Ouro LTDA" data-testid="input-cliente-nome" />
            </Field>
            <Field label="Tipo">
              <Select value={form.kind} onValueChange={(v: string) => setForm((f) => ({ ...f, kind: v }))}>
                <SelectTrigger data-testid="select-cliente-tipo">
                  <SelectValue>{(v: string) => (v === "PJ" ? "Pessoa jurídica" : "Pessoa física")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PJ">Pessoa jurídica</SelectItem>
                  <SelectItem value="PF">Pessoa física</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={form.kind === "PJ" ? "CNPJ" : "CPF"}>
              <Input value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} placeholder={form.kind === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"} data-testid="input-cliente-documento" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="cliente@email.com" data-testid="input-cliente-email" />
            </Field>
            <Field label="Telefone">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-0000" data-testid="input-cliente-telefone" />
            </Field>
            <Field label="Cidade">
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="São Paulo" data-testid="input-cliente-cidade" />
            </Field>
            <Field label="UF">
              <Input value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" data-testid="input-cliente-uf" />
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Preferências, histórico, anotações…" data-testid="input-cliente-notas" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="btn-cancelar-cliente">
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending} data-testid="btn-salvar-cliente">
              {pending ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir “${deleting?.name ?? ""}”? O histórico de vendas é mantido.`}
        pending={mutations.remove.isPending}
        onConfirm={() => deleting && mutations.remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
