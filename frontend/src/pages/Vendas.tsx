import { useMemo, useState } from "react";
import { Check, MoreHorizontal, Plus, Search, ShoppingCart, Ticket, Trash2, TrendingUp, XCircle } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, saleStatusMeta } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { lastMonths, monthKey, round2, sum } from "@/lib/calc";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";
import { useClients, useProducts, useSaleMutations, useSales } from "@/lib/queries";

const PAYMENT_METHODS = ["Pix", "Cartão de Crédito", "Boleto", "Transferência", "Dinheiro"];

interface LineState {
  product_id: string;
  qty: string;
}

export default function Vendas() {
  const { data: sales = [] } = useSales();
  const { data: products = [] } = useProducts();
  const { data: clients = [] } = useClients();
  const { create, updateStatus } = useSaleMutations();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clientId, setClientId] = useState("sem-cliente");
  const [lines, setLines] = useState<LineState[]>([{ product_id: "", qty: "1" }]);
  const [status, setStatus] = useState("pago");
  const [method, setMethod] = useState("Pix");

  const current = lastMonths(2)[1];
  const valid = sales.filter((s) => s.status !== "cancelado");
  const monthSales = valid.filter((s) => s.created_at.slice(0, 7) === current);
  const revenueMonth = sum(monthSales.map((s) => s.total));
  const pendingSales = sales.filter((s) => s.status === "pendente");
  const ticket = monthSales.length > 0 ? round2(revenueMonth / monthSales.length) : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (q && !s.code.toLowerCase().includes(q) && !s.client_name.toLowerCase().includes(q)) return false;
      if (statusFilter !== "todos" && s.status !== statusFilter) return false;
      return true;
    });
  }, [sales, search, statusFilter]);

  const draftTotal = round2(
    sum(
      lines.map((l) => {
        const p = products.find((pr) => pr.id === l.product_id);
        return p ? p.price * (Number(l.qty) || 0) : 0;
      }),
    ),
  );

  const openNew = () => {
    setClientId("sem-cliente");
    setLines([{ product_id: "", qty: "1" }]);
    setStatus("pago");
    setMethod("Pix");
    setDialogOpen(true);
  };

  const submit = () => {
    const items = lines.filter((l) => l.product_id).map((l) => ({ product_id: l.product_id, qty: Math.trunc(Number(l.qty) || 0) }));
    if (items.length === 0) {
      toast.error("Adicione pelo menos um produto à venda.");
      return;
    }
    if (items.some((i) => i.qty <= 0)) {
      toast.error("As quantidades devem ser maiores que zero.");
      return;
    }
    create.mutate(
      { client_id: clientId === "sem-cliente" ? "" : clientId, items, status, payment_method: method },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  return (
    <div data-testid="page-vendas">
      <PageHeader title="Vendas & Pedidos" description="Histórico de pedidos, pagamentos e faturamento.">
        <Button onClick={openNew} data-testid="btn-nova-venda">
          <Plus className="size-4" /> Nova venda
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vendas no mês" value={formatNumber(monthSales.length)} icon={ShoppingCart} index={0} testId="stat-vendas-quantidade" />
        <StatCard label="Faturamento no mês" value={formatBRL(revenueMonth)} icon={TrendingUp} index={1} testId="stat-vendas-faturamento" />
        <StatCard label="Ticket médio" value={formatBRL(ticket)} icon={Ticket} index={2} testId="stat-vendas-ticket" />
        <StatCard label="Pagamentos pendentes" value={formatNumber(pendingSales.length)} icon={XCircle} hint={formatBRL(sum(pendingSales.map((s) => s.total)))} index={3} testId="stat-vendas-pendentes" />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código ou cliente…" className="pl-9" data-testid="input-busca-vendas" />
          </div>
          <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v)}>
            <SelectTrigger className="sm:w-44" data-testid="filtro-status-vendas">
              <SelectValue>{(v: string) => (v === "todos" ? "Todos os status" : saleStatusMeta(v).label)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pago">Paga</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="cancelado">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={ShoppingCart} title="Nenhuma venda encontrada" description="Ajuste a busca ou registre uma nova venda." testId="vendas-vazio">
              <Button size="sm" onClick={openNew} data-testid="btn-nova-venda-vazio">
                <Plus className="size-4" /> Nova venda
              </Button>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table data-testid="table-vendas">
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => {
                  const meta = saleStatusMeta(s.status);
                  return (
                    <TableRow key={s.id} data-testid={`venda-row-${s.id}`}>
                      <TableCell className="font-mono text-xs font-semibold">{s.code}</TableCell>
                      <TableCell className="max-w-40 truncate">{s.client_name}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{formatDateTime(s.created_at)}</TableCell>
                      <TableCell className="text-right" title={s.items.map((i) => `${i.qty}× ${i.name}`).join("\n")}>
                        {sum(s.items.map((i) => i.qty))} un.
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatBRL(s.total)}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{s.payment_method}</TableCell>
                      <TableCell>
                        <StatusBadge tone={meta.tone} testId={`venda-status-${s.id}`}>{meta.label}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Ações da venda" data-testid={`venda-acoes-${s.id}`} />}>
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" data-testid={`venda-menu-${s.id}`}>
                            {s.status === "pendente" && (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: s.id, status: "pago" })} data-testid={`venda-marcar-paga-${s.id}`}>
                                <Check className="size-4" /> Marcar como paga
                              </DropdownMenuItem>
                            )}
                            {s.status !== "cancelado" ? (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ id: s.id, status: "cancelado" })} className="text-destructive" data-testid={`venda-cancelar-${s.id}`}>
                                <XCircle className="size-4" /> Cancelar venda
                              </DropdownMenuItem>
                            ) : (
                              <p className="px-2 py-1.5 text-xs text-muted-foreground">Venda cancelada — estoque devolvido.</p>
                            )}
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

      {/* Nova venda */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-nova-venda">
          <DialogHeader>
            <DialogTitle>Nova venda</DialogTitle>
            <DialogDescription>Selecione o cliente e os produtos — o estoque é baixado automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Cliente">
              <Select value={clientId} onValueChange={(v: string) => setClientId(v)}>
                <SelectTrigger data-testid="select-venda-cliente">
                  <SelectValue>{(v: string) => (v === "sem-cliente" ? "Consumidor final" : clients.find((c) => c.id === v)?.name)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-cliente">Consumidor final</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Itens da venda</p>
              {lines.map((line, idx) => (
                <div key={idx} className="flex gap-2" data-testid={`venda-item-linha-${idx}`}>
                  <Select value={line.product_id || "sem-produto"} onValueChange={(v: string) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, product_id: v === "sem-produto" ? "" : v } : l)))}>
                    <SelectTrigger className="min-w-0 flex-1" data-testid={`select-venda-produto-${idx}`}>
                      <SelectValue>{(v: string) => (v === "sem-produto" ? "Selecione o produto" : products.find((p) => p.id === v)?.name)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} · {formatBRL(p.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    className="w-20 shrink-0"
                    value={line.qty}
                    onChange={(e) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, qty: e.target.value } : l)))}
                    data-testid={`input-venda-quantidade-${idx}`}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))}
                    disabled={lines.length === 1}
                    aria-label="Remover item"
                    data-testid={`btn-remover-item-${idx}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setLines((ls) => [...ls, { product_id: "", qty: "1" }])} data-testid="btn-adicionar-item">
                <Plus className="size-4" /> Adicionar item
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Situação do pagamento">
                <Select value={status} onValueChange={(v: string) => setStatus(v)}>
                  <SelectTrigger data-testid="select-venda-status">
                    <SelectValue>{(v: string) => (v === "pago" ? "Paga agora" : "Pendente")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Paga agora</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Forma de pagamento">
                <Select value={method} onValueChange={(v: string) => setMethod(v)}>
                  <SelectTrigger data-testid="select-venda-pagamento">
                    <SelectValue>{(v: string) => v}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-primary/5 px-4 py-3" data-testid="venda-total-preview">
              <span className="text-sm font-medium text-muted-foreground">Total da venda</span>
              <span className="font-mono text-lg font-bold text-primary">{formatBRL(draftTotal)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="btn-cancelar-venda">
              Cancelar
            </Button>
            <Button onClick={submit} disabled={create.isPending} data-testid="btn-registrar-venda">
              {create.isPending ? "Registrando…" : "Registrar venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
