import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ClipboardList, FileDown, MoreHorizontal, Play, Plus, RotateCcw, Search, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import type { Tone } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { sum } from "@/lib/calc";
import { formatBRL, formatDate, formatNumber, todayISO } from "@/lib/format";
import { exportPdf } from "@/lib/pdf";
import { useClients, useCompany, useServiceOrderMutations, useServiceOrders, useServices } from "@/lib/queries";

export const OS_STATUS: Record<string, { label: string; tone: Tone }> = {
  aberta: { label: "Aberta", tone: "info" },
  em_andamento: { label: "Em andamento", tone: "warning" },
  concluida: { label: "Concluída", tone: "success" },
  cancelada: { label: "Cancelada", tone: "danger" },
};

interface OsForm {
  client_id: string;
  service_id: string;
  status: string;
  scheduled_date: string;
  price: string;
  notes: string;
}

const emptyForm = (): OsForm => ({ client_id: "sem-cliente", service_id: "", status: "aberta", scheduled_date: todayISO(), price: "", notes: "" });

export default function OrdensServico() {
  const { data: orders = [] } = useServiceOrders();
  const { data: services = [] } = useServices();
  const { data: clients = [] } = useClients();
  const { data: company } = useCompany();
  const { create, update, remove } = useServiceOrderMutations();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<OsForm>(emptyForm());
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "todas" && o.status !== statusFilter) return false;
      if (q && !o.code.toLowerCase().includes(q) && !o.client_name.toLowerCase().includes(q) && !o.service_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, search, statusFilter]);

  const open = orders.filter((o) => o.status === "aberta");
  const running = orders.filter((o) => o.status === "em_andamento");
  const done = orders.filter((o) => o.status === "concluida");
  const pipeline = sum([...open, ...running].map((o) => o.price));

  const selectedService = services.find((s) => s.id === form.service_id);

  const submit = () => {
    if (!form.service_id) {
      toast.error("Selecione o serviço da OS.");
      return;
    }
    const price = form.price.trim() === "" ? null : Number(form.price);
    if (price !== null && (Number.isNaN(price) || price <= 0)) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    create.mutate(
      {
        client_id: form.client_id === "sem-cliente" ? "" : form.client_id,
        service_id: form.service_id,
        status: form.status,
        scheduled_date: form.scheduled_date,
        price,
        notes: form.notes.trim(),
      },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  const setStatus = (id: string, status: string) => update.mutate({ id, body: { status } });

  const exportList = () => {
    exportPdf({
      title: "Ordens de Serviço",
      subtitle: statusFilter === "todas" ? "Todas as ordens" : `Filtro: ${OS_STATUS[statusFilter]?.label}`,
      companyName: company?.name ?? "NEXBIZ",
      summary: [
        ["Abertas", formatNumber(open.length)],
        ["Em andamento", formatNumber(running.length)],
        ["Concluídas", formatNumber(done.length)],
        ["Em carteira", formatBRL(pipeline)],
      ],
      sections: [
        {
          title: `Ordens (${filtered.length})`,
          head: ["OS", "Cliente", "Serviço", "Agendada", "Status", "Valor"],
          rows: filtered.map((o) => [o.code, o.client_name, o.service_name, o.scheduled_date ? formatDate(`${o.scheduled_date}T12:00:00`) : "—", OS_STATUS[o.status]?.label ?? o.status, formatBRL(o.price)]),
          rightAlign: [5],
        },
      ],
      filename: "nexbiz-ordens-de-servico.pdf",
    });
    toast.success("PDF das ordens de serviço gerado!");
  };

  return (
    <div data-testid="page-ordens-servico">
      <PageHeader title="Ordens de Serviço" description="Agende, execute e conclua serviços para seus clientes.">
        <Button variant="outline" onClick={exportList} data-testid="btn-exportar-os-pdf">
          <FileDown className="size-4" /> Exportar PDF
        </Button>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setDialogOpen(true);
          }}
          data-testid="btn-nova-os"
        >
          <Plus className="size-4" /> Nova OS
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Abertas" value={formatNumber(open.length)} icon={ClipboardList} index={0} testId="stat-os-abertas" />
        <StatCard label="Em andamento" value={formatNumber(running.length)} icon={CalendarClock} index={1} testId="stat-os-andamento" />
        <StatCard label="Concluídas" value={formatNumber(done.length)} icon={CheckCircle2} hint={formatBRL(sum(done.map((o) => o.price)))} index={2} testId="stat-os-concluidas" />
        <StatCard label="Valor em carteira" value={formatBRL(pipeline)} icon={Play} hint="abertas + em andamento" index={3} testId="stat-os-carteira" />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, cliente ou serviço…" className="pl-9" data-testid="input-busca-os" />
          </div>
          <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v)}>
            <SelectTrigger className="sm:w-44" data-testid="filtro-status-os">
              <SelectValue>{(v: string) => (v === "todas" ? "Todos os status" : OS_STATUS[v]?.label)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todos os status</SelectItem>
              {Object.entries(OS_STATUS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={ClipboardList} title="Nenhuma ordem de serviço encontrada" description="Ajuste os filtros ou crie uma nova OS." testId="os-vazio" />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table data-testid="table-os">
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Cliente / Serviço</TableHead>
                  <TableHead className="hidden md:table-cell">Agendada</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const meta = OS_STATUS[o.status] ?? { label: o.status, tone: "neutral" as Tone };
                  return (
                    <TableRow key={o.id} data-testid={`os-row-${o.id}`}>
                      <TableCell className="font-mono text-xs font-semibold">{o.code}</TableCell>
                      <TableCell className="max-w-60">
                        <p className="truncate font-medium">{o.client_name}</p>
                        <p className="truncate text-xs text-muted-foreground">{o.service_name}</p>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {o.scheduled_date ? formatDate(`${o.scheduled_date}T12:00:00`) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">{formatBRL(o.price)}</TableCell>
                      <TableCell>
                        <StatusBadge tone={meta.tone} testId={`os-status-${o.id}`}>{meta.label}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Ações da OS" data-testid={`os-acoes-${o.id}`} />}>
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" data-testid={`os-menu-${o.id}`}>
                            {o.status === "aberta" && (
                              <DropdownMenuItem onClick={() => setStatus(o.id, "em_andamento")} data-testid={`os-iniciar-${o.id}`}>
                                <Play className="size-4" /> Iniciar execução
                              </DropdownMenuItem>
                            )}
                            {(o.status === "aberta" || o.status === "em_andamento") && (
                              <DropdownMenuItem onClick={() => setStatus(o.id, "concluida")} data-testid={`os-concluir-${o.id}`}>
                                <CheckCircle2 className="size-4" /> Concluir OS
                              </DropdownMenuItem>
                            )}
                            {o.status === "cancelada" && (
                              <DropdownMenuItem onClick={() => setStatus(o.id, "aberta")} data-testid={`os-reabrir-${o.id}`}>
                                <RotateCcw className="size-4" /> Reabrir
                              </DropdownMenuItem>
                            )}
                            {o.status !== "cancelada" && o.status !== "concluida" && (
                              <DropdownMenuItem onClick={() => setStatus(o.id, "cancelada")} data-testid={`os-cancelar-${o.id}`}>
                                <XCircle className="size-4" /> Cancelar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setDeleting(o.id)} className="text-destructive" data-testid={`os-excluir-${o.id}`}>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-nova-os">
          <DialogHeader>
            <DialogTitle>Nova ordem de serviço</DialogTitle>
            <DialogDescription>Ao concluir a OS, a receita é lançada automaticamente no Financeiro.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cliente" className="sm:col-span-2">
              <Select value={form.client_id} onValueChange={(v: string) => setForm((f) => ({ ...f, client_id: v }))}>
                <SelectTrigger data-testid="select-os-cliente">
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
            <Field label="Serviço" className="sm:col-span-2">
              <Select value={form.service_id || "sem-servico"} onValueChange={(v: string) => setForm((f) => ({ ...f, service_id: v === "sem-servico" ? "" : v }))}>
                <SelectTrigger data-testid="select-os-servico">
                  <SelectValue>{(v: string) => (v === "sem-servico" ? "Selecione o serviço" : services.find((s) => s.id === v)?.name)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {services.filter((s) => s.active).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {formatBRL(s.price)}{s.pricing === "hora" ? "/h" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Data agendada">
              <Input type="date" value={form.scheduled_date} onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))} data-testid="input-os-data" />
            </Field>
            <Field label="Valor (R$)">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder={selectedService ? String(selectedService.price) : "preço do serviço"}
                data-testid="input-os-valor"
              />
            </Field>
            <Field label="Status inicial" className="sm:col-span-2">
              <Select value={form.status} onValueChange={(v: string) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger data-testid="select-os-status">
                  <SelectValue>{(v: string) => OS_STATUS[v]?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Detalhes da execução, endereço, contato…" data-testid="input-os-notas" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="btn-cancelar-os">
              Cancelar
            </Button>
            <Button onClick={submit} disabled={create.isPending} data-testid="btn-salvar-os">
              {create.isPending ? "Criando…" : "Criar OS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir ordem de serviço"
        description="A OS e a receita vinculada (se houver) serão removidas. Essa ação não pode ser desfeita."
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
