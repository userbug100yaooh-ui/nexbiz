import { useMemo, useState } from "react";
import { Clock, MoreHorizontal, Pencil, Plus, Search, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL, formatNumber } from "@/lib/format";
import { useServiceMutations, useServices } from "@/lib/queries";
import type { Service, ServiceInput } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES = ["Geral", "Infraestrutura", "Suporte técnico", "Consultoria", "Desenvolvimento", "Nuvem", "Treinamento"];

interface ServiceForm {
  name: string;
  category: string;
  pricing: string;
  price: string;
  estimated_hours: string;
  description: string;
  active: boolean;
}

const EMPTY_FORM: ServiceForm = { name: "", category: "Geral", pricing: "fixo", price: "", estimated_hours: "0", description: "", active: true };

type Chip = "todos" | "ativos" | "inativos";

export default function Servicos() {
  const { data: services = [] } = useServices();
  const mutations = useServiceMutations();

  const [search, setSearch] = useState("");
  const [chip, setChip] = useState<Chip>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Service | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (chip === "ativos" && !s.active) return false;
      if (chip === "inativos" && s.active) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [services, search, chip]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, category: s.category, pricing: s.pricing, price: String(s.price), estimated_hours: String(s.estimated_hours), description: s.description, active: s.active });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do serviço.");
      return;
    }
    if (Number(form.price) <= 0) {
      toast.error("Informe um preço maior que zero.");
      return;
    }
    const body: ServiceInput = {
      name: form.name.trim(),
      category: form.category,
      pricing: form.pricing,
      price: Number(form.price) || 0,
      estimated_hours: Number(form.estimated_hours) || 0,
      description: form.description.trim(),
      active: form.active,
    };
    if (editing) {
      mutations.update.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      mutations.create.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const pending = mutations.create.isPending || mutations.update.isPending;

  const chips: { key: Chip; label: string }[] = [
    { key: "todos", label: `Todos (${services.length})` },
    { key: "ativos", label: `Ativos (${services.filter((s) => s.active).length})` },
    { key: "inativos", label: `Inativos (${services.filter((s) => !s.active).length})` },
  ];

  return (
    <div data-testid="page-servicos">
      <PageHeader title="Catálogo de Serviços" description="Serviços prestados com precificação fixa ou por hora.">
        <Button onClick={openCreate} data-testid="btn-novo-servico">
          <Plus className="size-4" /> Novo serviço
        </Button>
      </PageHeader>

      <Card className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" data-testid="chips-servicos">
            {chips.map((c) => (
              <button
                key={c.key}
                onClick={() => setChip(c.key)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  chip === c.key ? "border-primary bg-primary text-white" : "border-border bg-background text-muted-foreground hover:bg-muted",
                )}
                data-testid={`chip-servicos-${c.key}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="relative lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou categoria…" className="pl-9" data-testid="input-busca-servicos" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={Wrench} title="Nenhum serviço encontrado" description="Ajuste a busca ou cadastre um novo serviço no catálogo." testId="servicos-vazio">
              <Button size="sm" onClick={openCreate} data-testid="btn-novo-servico-vazio">
                <Plus className="size-4" /> Novo serviço
              </Button>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s) => (
              <Card key={s.id} className="flex h-full flex-col p-5 transition-shadow hover:shadow-md" data-testid={`servico-card-${s.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.category}</p>
                  </div>
                  <StatusBadge tone={s.active ? "success" : "neutral"} testId={`servico-status-${s.id}`}>
                    {s.active ? "Ativo" : "Inativo"}
                  </StatusBadge>
                </div>
                <p className="mt-3 line-clamp-2 flex-1 text-xs leading-relaxed text-muted-foreground">{s.description || "Sem descrição."}</p>
                <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                  <div>
                    <p className="font-mono text-lg font-bold">
                      {formatBRL(s.price)}
                      {s.pricing === "hora" && <span className="text-xs font-normal text-muted-foreground">/h</span>}
                    </p>
                    {s.estimated_hours > 0 && (
                      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="size-3" /> ≈ {formatNumber(s.estimated_hours, 1)}h de execução
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Ações do serviço" data-testid={`servico-acoes-${s.id}`} />}>
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" data-testid={`servico-menu-${s.id}`}>
                      <DropdownMenuItem onClick={() => openEdit(s)} data-testid={`servico-editar-${s.id}`}>
                        <Pencil className="size-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDeleting(s)} className="text-destructive" data-testid={`servico-excluir-${s.id}`}>
                        <Trash2 className="size-4" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* Formulário de serviço */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-servico">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
            <DialogDescription>Defina a precificação fixa ou por hora e os detalhes do serviço.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do serviço" className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Manutenção de Computadores" data-testid="input-servico-nome" />
            </Field>
            <Field label="Categoria">
              <Select value={form.category} onValueChange={(v: string) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-servico-categoria">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Precificação">
              <Select value={form.pricing} onValueChange={(v: string) => setForm((f) => ({ ...f, pricing: v }))}>
                <SelectTrigger data-testid="select-servico-precificacao">
                  <SelectValue>{(v: string) => (v === "hora" ? "Por hora" : "Preço fixo")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Preço fixo</SelectItem>
                  <SelectItem value="hora">Por hora</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Preço (R$)">
              <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0,00" data-testid="input-servico-preco" />
            </Field>
            <Field label="Horas estimadas">
              <Input type="number" min={0} step="0.5" value={form.estimated_hours} onChange={(e) => setForm((f) => ({ ...f, estimated_hours: e.target.value }))} data-testid="input-servico-horas" />
            </Field>
            <Field label="Descrição" className="sm:col-span-2">
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="O que está incluído no serviço…" data-testid="input-servico-descricao" />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2" data-testid="label-servico-ativo">
              <Checkbox checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v === true }))} data-testid="checkbox-servico-ativo" />
              Serviço ativo no catálogo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="btn-cancelar-servico">
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending} data-testid="btn-salvar-servico">
              {pending ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar serviço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir serviço"
        description={`Tem certeza que deseja excluir “${deleting?.name ?? ""}”? Essa ação não pode ser desfeita.`}
        pending={mutations.remove.isPending}
        onConfirm={() => deleting && mutations.remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
