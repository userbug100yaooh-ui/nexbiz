import { useMemo, useState } from "react";
import { MoreHorizontal, Package, PackageX, Pencil, Plus, Search, Trash2, TriangleAlert, Wallet } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { Field } from "@/components/Field";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { STOCK_META, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { round2, stockStatus, sum } from "@/lib/calc";
import { formatBRL, formatNumber } from "@/lib/format";
import { useProductMutations, useProducts } from "@/lib/queries";
import type { Product, ProductInput } from "@/lib/types";

const CATEGORIES = ["Geral", "Informática", "Periféricos", "Hardware", "Acessórios", "Mobiliário", "Escritório"];
const UNITS = ["un", "cx", "kg", "l", "m"];

interface ProductForm {
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: string;
  cost: string;
  stock: string;
  min_stock: string;
}

const EMPTY_FORM: ProductForm = { name: "", sku: "", category: "Geral", unit: "un", price: "", cost: "0", stock: "0", min_stock: "0" };

export default function Produtos() {
  const { data: products = [] } = useProducts();
  const mutations = useProductMutations();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todas");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "todas" && p.category !== categoryFilter) return false;
      if (statusFilter !== "todos" && stockStatus(p) !== statusFilter) return false;
      return true;
    });
  }, [products, search, categoryFilter, statusFilter]);

  const stockValue = round2(sum(products.map((p) => p.stock * p.cost)));
  const lowCount = products.filter((p) => stockStatus(p) === "baixo").length;
  const outCount = products.filter((p) => stockStatus(p) === "zerado").length;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, category: p.category, unit: p.unit, price: String(p.price), cost: String(p.cost), stock: String(p.stock), min_stock: String(p.min_stock) });
    setDialogOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    if (Number(form.price) <= 0) {
      toast.error("Informe um preço de venda maior que zero.");
      return;
    }
    const body: ProductInput = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category,
      unit: form.unit,
      price: Number(form.price) || 0,
      cost: Number(form.cost) || 0,
      stock: Math.trunc(Number(form.stock) || 0),
      min_stock: Math.trunc(Number(form.min_stock) || 0),
      active: true,
    };
    if (editing) {
      mutations.update.mutate({ id: editing.id, body }, { onSuccess: () => setDialogOpen(false) });
    } else {
      mutations.create.mutate(body, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const confirmDelete = () => {
    if (!deleting) return;
    mutations.remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
  };

  const pending = mutations.create.isPending || mutations.update.isPending;

  return (
    <div data-testid="page-produtos">
      <PageHeader title="Produtos e Estoque" description="Catálogo, preços e controle de reposição.">
        <Button onClick={openCreate} data-testid="btn-novo-produto">
          <Plus className="size-4" /> Novo produto
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Produtos cadastrados" value={formatNumber(products.length)} icon={Package} index={0} testId="stat-produtos-total" />
        <StatCard label="Valor em estoque (custo)" value={formatBRL(stockValue)} icon={Wallet} index={1} testId="stat-produtos-valor-estoque" />
        <StatCard label="Com estoque baixo" value={formatNumber(lowCount)} icon={TriangleAlert} index={2} testId="stat-produtos-estoque-baixo" />
        <StatCard label="Sem estoque" value={formatNumber(outCount)} icon={PackageX} index={3} testId="stat-produtos-sem-estoque" />
      </div>

      <Card className="mt-6 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU…" className="pl-9" data-testid="input-busca-produtos" />
          </div>
          <Select value={categoryFilter} onValueChange={(v: string) => setCategoryFilter(v)}>
            <SelectTrigger className="sm:w-44" data-testid="filtro-categoria-produtos">
              <SelectValue>{(v: string) => (v === "todas" ? "Todas as categorias" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v)}>
            <SelectTrigger className="sm:w-40" data-testid="filtro-status-produtos">
              <SelectValue>{(v: string) => (v === "todos" ? "Todo o estoque" : STOCK_META[v as keyof typeof STOCK_META]?.label ?? v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo o estoque</SelectItem>
              <SelectItem value="ok">Em estoque</SelectItem>
              <SelectItem value="baixo">Estoque baixo</SelectItem>
              <SelectItem value="zerado">Sem estoque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6">
            <EmptyState icon={Package} title="Nenhum produto encontrado" description="Ajuste a busca ou os filtros, ou cadastre um novo produto." testId="produtos-vazio">
              <Button size="sm" onClick={openCreate} data-testid="btn-novo-produto-vazio">
                <Plus className="size-4" /> Novo produto
              </Button>
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table data-testid="table-produtos">
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Custo</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const status = stockStatus(p);
                  const meta = STOCK_META[status];
                  return (
                    <TableRow key={p.id} data-testid={`produto-row-${p.id}`}>
                      <TableCell>
                        <p className="font-medium">{p.name}</p>
                        <p className="font-mono text-xs text-muted-foreground">{p.sku || "—"}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{p.category}</TableCell>
                      <TableCell className="text-right font-mono">{formatBRL(p.price)}</TableCell>
                      <TableCell className="hidden text-right font-mono text-muted-foreground sm:table-cell">{formatBRL(p.cost)}</TableCell>
                      <TableCell>
                        <span className="font-mono font-semibold">{p.stock}</span> {p.unit}
                        <span className="text-xs text-muted-foreground"> · mín. {p.min_stock}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={meta.tone} testId={`produto-status-${p.id}`}>{meta.label}</StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Ações do produto" data-testid={`produto-acoes-${p.id}`} />}>
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" data-testid={`produto-menu-${p.id}`}>
                            <DropdownMenuItem onClick={() => openEdit(p)} data-testid={`produto-editar-${p.id}`}>
                              <Pencil className="size-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleting(p)} className="text-destructive" data-testid={`produto-excluir-${p.id}`}>
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

      {/* Formulário de produto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="dialog-produto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>
              {editing ? `Atualizando ${editing.name}.` : "Cadastre um item do catálogo com controle de estoque."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do produto" className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Monitor LED 27" data-testid="input-produto-nome" />
            </Field>
            <Field label="SKU / Código">
              <Input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} placeholder="MON-0027" data-testid="input-produto-sku" />
            </Field>
            <Field label="Categoria">
              <Select value={form.category} onValueChange={(v: string) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="select-produto-categoria">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Preço de venda (R$)">
              <Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0,00" data-testid="input-produto-preco" />
            </Field>
            <Field label="Custo (R$)">
              <Input type="number" min={0} step="0.01" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} placeholder="0,00" data-testid="input-produto-custo" />
            </Field>
            <Field label="Estoque atual">
              <Input type="number" min={0} value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} data-testid="input-produto-estoque" />
            </Field>
            <Field label="Estoque mínimo">
              <Input type="number" min={0} value={form.min_stock} onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))} data-testid="input-produto-estoque-minimo" />
            </Field>
            <Field label="Unidade">
              <Select value={form.unit} onValueChange={(v: string) => setForm((f) => ({ ...f, unit: v }))}>
                <SelectTrigger data-testid="select-produto-unidade">
                  <SelectValue>{(v: string) => v}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="btn-cancelar-produto">
              Cancelar
            </Button>
            <Button onClick={submit} disabled={pending} data-testid="btn-salvar-produto">
              {pending ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Excluir produto"
        description={`Tem certeza que deseja excluir “${deleting?.name ?? ""}”? Essa ação não pode ser desfeita.`}
        pending={mutations.remove.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
