import { useState } from "react";
import { Building2, Check, Info, Plus, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge, ROLE_LABELS } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { useCompanyMutation, useCompany, useUsers } from "@/lib/queries";
import type { Company } from "@/lib/types";

const SEGMENTS = ["Comércio", "Serviços", "Alimentação", "Saúde", "Educação", "Tecnologia", "Indústria", "Outro"];

export default function Configuracoes() {
  return (
    <div data-testid="page-configuracoes">
      <PageHeader title="Configurações" description="Dados da empresa, usuários e preferências do sistema." />
      <Tabs defaultValue="empresa">
        <TabsList data-testid="tabs-configuracoes">
          <TabsTrigger value="empresa" data-testid="tab-config-empresa">Empresa</TabsTrigger>
          <TabsTrigger value="usuarios" data-testid="tab-config-usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="preferencias" data-testid="tab-config-preferencias">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-4">
          <CompanyPanel />
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <UsersPanel />
        </TabsContent>

        <TabsContent value="preferencias" className="mt-4">
          <PreferencesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CompanyPanel() {
  const { data: company } = useCompany();
  if (!company) return null;
  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="card-plano">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold">
              Plano Profissional <span className="ml-1 text-xs font-normal text-muted-foreground">(demo)</span>
            </p>
            <p className="text-xs text-muted-foreground">A arquitetura já isola os dados por empresa — pronta para autenticação multiempresa.</p>
          </div>
        </div>
        <StatusBadge tone="info" testId="badge-multiempresa-pronta">Multiempresa: preparado</StatusBadge>
      </Card>
      <CompanyForm key={company.id} company={company} />
    </div>
  );
}

function CompanyForm({ company }: { company: Company }) {
  const mutation = useCompanyMutation();
  const [form, setForm] = useState({
    name: company.name,
    legal_name: company.legal_name,
    cnpj: company.cnpj,
    segment: company.segment || "Comércio",
    email: company.email,
    phone: company.phone,
    address: company.address,
    city: company.city,
    state: company.state,
  });

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const submit = () => {
    mutation.mutate({
      name: form.name.trim(),
      legal_name: form.legal_name.trim(),
      cnpj: form.cnpj.trim(),
      segment: form.segment,
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase().slice(0, 2),
    });
  };

  return (
    <Card className="p-5" data-testid="card-dados-empresa">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 text-primary" />
        <h2 className="text-sm font-bold">Dados cadastrais da empresa</h2>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nome fantasia">
          <Input value={form.name} onChange={(e) => set({ name: e.target.value })} data-testid="input-empresa-nome" />
        </Field>
        <Field label="Razão social">
          <Input value={form.legal_name} onChange={(e) => set({ legal_name: e.target.value })} data-testid="input-empresa-razao" />
        </Field>
        <Field label="CNPJ">
          <Input value={form.cnpj} onChange={(e) => set({ cnpj: e.target.value })} placeholder="00.000.000/0001-00" data-testid="input-empresa-cnpj" />
        </Field>
        <Field label="Segmento">
          <Select value={form.segment} onValueChange={(v: string) => set({ segment: v })}>
            <SelectTrigger data-testid="select-empresa-segmento">
              <SelectValue>{(v: string) => v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SEGMENTS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="E-mail">
          <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} data-testid="input-empresa-email" />
        </Field>
        <Field label="Telefone">
          <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} data-testid="input-empresa-telefone" />
        </Field>
        <Field label="Endereço" className="sm:col-span-2">
          <Input value={form.address} onChange={(e) => set({ address: e.target.value })} placeholder="Av. Paulista, 1000 — Sala 42" data-testid="input-empresa-endereco" />
        </Field>
        <Field label="Cidade">
          <Input value={form.city} onChange={(e) => set({ city: e.target.value })} data-testid="input-empresa-cidade" />
        </Field>
        <Field label="UF">
          <Input value={form.state} onChange={(e) => set({ state: e.target.value.toUpperCase().slice(0, 2) })} className="w-24" data-testid="input-empresa-uf" />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={submit} disabled={mutation.isPending} data-testid="btn-salvar-empresa">
          {mutation.isPending ? "Salvando…" : "Salvar dados da empresa"}
        </Button>
      </div>
    </Card>
  );
}

function UsersPanel() {
  const { data: users = [] } = useUsers();
  return (
    <Card className="p-5" data-testid="card-usuarios">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h2 className="text-sm font-bold">Usuários do workspace</h2>
        </div>
        <Button size="sm" disabled title="Disponível na integração com autenticação multiempresa (Supabase)" data-testid="btn-convidar-usuario">
          <Plus className="size-4" /> Convidar usuário
        </Button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        No modo demonstração a autenticação é simulada — o convite de usuários reais fica pronto para a integração multiempresa.
      </p>
      <div className="mt-4 overflow-x-auto">
        <Table data-testid="table-usuarios">
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="hidden sm:table-cell">Desde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} data-testid={`usuario-row-${u.id}`}>
                <TableCell>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge tone={u.role === "admin" ? "info" : "neutral"} testId={`usuario-role-${u.id}`}>
                    {ROLE_LABELS[u.role] ?? u.role}
                  </StatusBadge>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{formatDate(u.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function PreferencesPanel() {
  const [prefs, setPrefs] = useState({ stockAlerts: true, dailyEmail: false, saleWhatsApp: true });

  const items = [
    { key: "stockAlerts" as const, label: "Alertas de estoque baixo", desc: "Avise quando um produto atingir o estoque mínimo.", testId: "pref-estoque" },
    { key: "dailyEmail" as const, label: "Resumo diário por e-mail", desc: "Receba um resumo das vendas do dia toda manhã.", testId: "pref-email" },
    { key: "saleWhatsApp" as const, label: "Notificar vendas por WhatsApp", desc: "Envie a confirmação da venda para o cliente.", testId: "pref-whatsapp" },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-5" data-testid="card-preferencias">
        <h2 className="text-sm font-bold">Preferências de notificação</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/70 p-4 transition-colors hover:bg-muted/50"
              data-testid={item.testId}
            >
              <Checkbox
                checked={prefs[item.key]}
                onCheckedChange={(v) => setPrefs((p) => ({ ...p, [item.key]: v === true }))}
                className="mt-0.5"
                data-testid={`${item.testId}-checkbox`}
              />
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{item.desc}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-500/10 dark:text-blue-300" data-testid="nota-preferencias">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          As preferências serão sincronizadas com o perfil da empresa na futura integração com Supabase.
        </div>
      </Card>

      <Card className="p-5" data-testid="card-regiao">
        <h2 className="text-sm font-bold">Região e moeda</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Moeda">
            <Select value="BRL" onValueChange={() => {}}>
              <SelectTrigger disabled data-testid="select-moeda">
                <SelectValue>{(v: string) => (v === "BRL" ? "Real brasileiro (R$)" : v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">Real brasileiro (R$)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Idioma">
            <Select value="pt-BR" onValueChange={() => {}}>
              <SelectTrigger disabled data-testid="select-idioma">
                <SelectValue>{(v: string) => (v === "pt-BR" ? "Português (Brasil)" : v)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5 text-emerald-500" /> Valores formatados em Real (R$) em todas as telas.
        </p>
      </Card>
    </div>
  );
}
