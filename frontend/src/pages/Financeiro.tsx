import { useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Check, Clock, MoreHorizontal, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { lastMonths, monthlyCashflow, round2, sum } from "@/lib/calc";
import { formatBRL, formatDate, formatNumber, todayISO } from "@/lib/format";
import { useTransactionMutations, useTransactions } from "@/lib/queries";
import type { Transaction, TransactionInput } from "@/lib/types";

const METHODS = ["Pix", "Cartão de Crédito", "Boleto", "Transferência", "Dinheiro"];

const CATEGORIES: Record<string, string[]> = {
  receita: ["Vendas", "Serviços", "Outros"],
  despesa: ["Aluguel", "Folha de pagamento", "Energia", "Internet", "Marketing", "Impostos", "Fornecedores", "Software", "Outros"],
};

interface TrxForm {
  kind: string;
  description: string;
  category: string;
  amount: string;
  due_date: string;
  paid: boolean;
  method: string;
}

const emptyForm = (kind = "despesa"): TrxForm => ({
  kind,
  description: "",
  category: CATEGORIES[kind][0],
  amount: "",
  due_date: todayISO(),
  paid: false,
  method: "Pix",
});

const toInput = (t: Transaction, paid = t.paid): TransactionInput => ({
  kind: t.kind,
  description: t.description,
  category: t.category,
  amount: t.amount,
  due_date: t.due_date,
  paid,
  method: t.method,
});

export default function Financeiro() {
  const { data: transactions = [] } = useTransactions();
  const { create, update, remove } = useTransactionMutations();

  const [kindFilter, setKindFilter] = useState("todas");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TrxForm>(emptyForm());
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const current = lastMonths(2)[1];
  const months = useMemo(() => lastMonths(6), []);
  const flow = useMemo(() => monthlyCashflow(transactions, months), [transactions, months]);

  const recebidoMes = sum(transactions.filter((t) => t.kind === "receita" && t.paid && t.due_date.slice(0, 7) === current).map((t) => t.amount));
  const pagoMes = sum(transactions.filter((t) => t.kind === "despesa" && t.paid && t.due_date.slice(0, 7) === current).map((t) => t.amount));
  const aReceber = sum(transactions.filter((t) => t.kind === "receita" && !t.paid).map((t) => t.amount));
  const aPagar = sum(transactions.filter((t) => t.kind === "despesa" && !t.paid).map((t) => t.amount));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (kindFilter !== "todas" && t.kind !== kindFilter) return false;
      if (q && !t.description.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, kindFilter, search]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({ kind: t.kind, description: t.description, category: t.category, amount: String(t.amount), due_date: t.due_date, paid: t.paid, method: t.method });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.description.trim()) {
      toast.error("Informe a descrição do lançamento.");
      return;
    }
    if (Number(form.amount) <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    const body: TransactionInput = {
      kind: form.kind,
      description: form.description.trim(),
      category: form.category,
      amount: round2(Number(form.amount) || 0),
      due_date: form.due_date || todayISO(),
      paid: form.paid,
      method: form.method,
    };
    if (editing) {
      update.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      create.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const pending = create.isPending || update.isPending;

  return (
    <div data-testid="page-financeiro">
      <PageHeader title="Gestão Financeira" description="Receitas, despesas e fluxo de caixa da empresa.">
        <Button onClick={openCreate} data-testid="btn-novo-lancamento">
          <Plus className="size-4" /> Novo lançamento
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Recebido no mês" value={formatBRL(recebidoMes)} icon={ArrowUpCircle} index={0} testId="stat-recebido-mes" />
        <StatCard label="Pago no mês" value={formatBRL(pagoMes)} icon={ArrowDownCircle} index={1} testId="stat-pago-mes" />
        <StatCard label="Saldo do mês" value={formatBRL(round2(recebidoMes - pagoMes))} icon={Wallet} hint="recebido − pago" index={2} testId="stat-saldo-financeiro" />
        <StatCard label="Em aberto (a receber)" value={formatBRL(aReceber)} icon={Clock} hint={`A pagar: ${formatBRL(aPagar)}`} index={3} testId="stat-em-aberto" />
      </div>

      <Card className="mt-6 p-5" data-testid="card-fluxo-caixa">
        <h2 className="text-sm font-bold">Fluxo de caixa — realizado</h2>
        <p className="text-xs text-muted-foreground">Receitas e despesas pagas por mês</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={flow} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748B" }} />
              <YAxis
                tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : `${v}`)}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12, fill: "#64748B" }}
                width={44}
              />
              <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 12, borderColor: "#E2E8F0", fontSize: 12 }} cursor={{ fill: "rgba(37,99,235,0.06)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="receitas" name="Receitas" fill="#16A34A" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="despesas" name="Despesas" fill="#2563EB" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={kindFilter} onValueChange={(v: string) => setKindFilter(v)}>
            <TabsList data-testid="tabs-lancamentos">
              <TabsTrigger value="todas" data-testid="tab-todas">Todas</TabsTrigger>
              <TabsTrigger value="receita" data-testid="tab-receitas">Receitas</TabsTrigger>
              <TabsTrigger value="despesa" data-testid="tab-despesas">Despesas</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por descrição ou categoria…" className="pl-9" data-testid="input-busca-lancamentos" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={Wallet} title="Nenhum lançamento encontrado" description="Ajuste a busca ou registre uma nova receita/despesa." testId="lancamentos-vazio">
              <Button size="sm" onClick={openCreate} data-testid="btn-novo-lancamento-vazio">
                <Plus className="size-4" /> Novo lançamento
              </Button>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table data-testid="table-lancamentos">
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id} data-testid={`lancamento-row-${t.id}`}>
                    <TableCell className="max-w-56">
                      <p className="truncate font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.kind === "receita" ? "Receita" : "Despesa"} · {t.method}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{t.category}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(t.due_date)}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${t.kind === "receita" ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {t.kind === "receita" ? "+" : "−"} {formatBRL(t.amount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={t.paid ? "success" : "warning"} testId={`lancamento-status-${t.id}`}>
                        {t.paid ? "Pago" : "Pendente"}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Ações do lançamento" data-testid={`lancamento-acoes-${t.id}`} />}>
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" data-testid={`lancamento-menu-${t.id}`}>
                          <DropdownMenuItem onClick={() => update.mutate({ id: t.id, body: toInput(t, !t.paid) })} data-testid={`lancamento-toggle-pago-${t.id}`}>
                            <Check className="size-4" /> {t.paid ? "Marcar como pendente" : "Marcar como pago"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(t)} data-testid={`lancamento-editar-${t.id}`}>
                            <Pencil className="size-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleting(t)} className="text-destructive" data-testid={`lancamento-excluir-${t.id}`}>
                            <Trash2 className="size-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Novo/editar lançamento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-lancamento">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
            <DialogDescription>Registre uma receita ou despesa com vencimento e situação de pagamento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <Select
                value={form.kind}
                onValueChange={(v: string) => setForm((f) => ({ ...f, kind: v, category: CATEGORIES[v][0] }))}
              >
                <SelectTrigger data-testid="select-lancamento-tipo">
                  <SelectValue>{(v: string) => (v === "receita" ? "Receita" : "Despesa")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Categoria">
              <Select value={form.category} onValueChange={(v: string) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-lancamento-categoria">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES[form.kind].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Ex.: Aluguel do escritório" data-testid="input-lancamento-descricao" />
            </Field>
            <Field label="Valor (R$)">
              <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0,00" data-testid="input-lancamento-valor" />
            </Field>
            <Field label="Vencimento">
              <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} data-testid="input-lancamento-vencimento" />
            </Field>
            <Field label="Forma de pagamento">
              <Select value={form.method} onValueChange={(v: string) => setForm((f) => ({ ...f, method: v }))}>
                <SelectTrigger data-testid="select-lancamento-pagamento">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm font-medium" data-testid="label-lancamento-pago">
                <Checkbox checked={form.paid} onCheckedChange={(v) => setForm((f) => ({ ...f, paid: v === true }))} data-testid="checkbox-lancamento-pago" />
                Já foi pago / recebido
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="btn-cancelar-lancamento">
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending} data-testid="btn-salvar-lancamento">
              {pending ? "Salvando…" : editing ? "Salvar alterações" : "Criar lançamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir lançamento"
        description={`Tem certeza que deseja excluir “${deleting?.description ?? ""}”? Essa ação não pode ser desfeita.`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
