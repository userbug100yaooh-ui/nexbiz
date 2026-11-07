import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Building2, Check, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { demoData } from "@/lib/demo-data";
import { errMessage, useDemoMutation, useRegisterMutation } from "@/lib/queries";
import { signIn, useSession } from "@/lib/session";
import type { AppUser, Company, RegisterInput } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEGMENTS = ["Comércio", "Serviços", "Alimentação", "Saúde", "Educação", "Tecnologia", "Indústria", "Outro"];

const STEPS = [
  { n: 1, label: "Seus dados", icon: User },
  { n: 2, label: "Sua empresa", icon: Building2 },
];

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  company_name: string;
  segment: string;
  cnpj: string;
  phone: string;
  city: string;
  state: string;
}

const INITIAL: FormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  company_name: "",
  segment: "Comércio",
  cnpj: "",
  phone: "",
  city: "",
  state: "SP",
};

export default function Register() {
  const session = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const register = useRegisterMutation();
  const demo = useDemoMutation();

  if (session) return <Navigate to="/app" replace />;

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const payload = (): RegisterInput => ({
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
    company_name: form.company_name.trim(),
    segment: form.segment,
    cnpj: form.cnpj.trim(),
    phone: form.phone.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
  });

  const validateStep1 = (): boolean => {
    if (!form.name.trim()) return fail("Informe o seu nome.");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return fail("Informe um e-mail válido.");
    if (form.password.length < 6) return fail("A senha deve ter pelo menos 6 caracteres.");
    if (form.password !== form.confirmPassword) return fail("As senhas não conferem.");
    return true;
  };

  const fail = (msg: string): boolean => {
    toast.error(msg);
    return false;
  };

  const localSession = () => {
    // Sem backend (preview estático): cria a sessão localmente para explorar o painel.
    const company: Company = { ...demoData.company, id: "emp-local", name: form.company_name.trim() || "Minha Empresa", segment: form.segment, cnpj: form.cnpj, email: form.email.trim().toLowerCase(), phone: form.phone, city: form.city, state: form.state, plan: "trial" };
    const user: AppUser = { ...demoData.users[0], id: "usr-local", company_id: company.id, name: form.name.trim() || "Proprietário", email: form.email.trim().toLowerCase(), role: "admin" };
    return { user, company };
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.company_name.trim()) return fail("Informe o nome da empresa.");
    register.mutate(payload(), {
      onSuccess: (res) => {
        if (res.email_confirmation_required) {
          toast.success("Conta criada! Confirme seu e-mail pelo link enviado e depois faça login.", { duration: 8000 });
          navigate("/login");
          return;
        }
        signIn({ user: res.user, company: res.company, mode: res.mode });
        toast.success("Conta e empresa criadas com sucesso!");
        navigate("/app");
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          toast.error(errMessage(err));
          return;
        }
        signIn({ ...localSession(), mode: "offline" });
        toast.success("Conta criada em modo demonstração!");
        navigate("/app");
      },
    });
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2" data-testid="page-cadastro">
      {/* Painel de marca */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0B132B] p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(520px 280px at 20% 85%, rgba(56,189,248,0.22), transparent 70%)" }}
        />
        <div className="relative">
          <Logo onDark to="/" />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            Crie a sua conta e a da sua empresa em 2 passos.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {["Cadastro gratuito, sem cartão de crédito", "Login seguro com Supabase", "Dados da sua empresa isolados das demais"].map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex size-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                  <Check className="size-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">Ambiente de demonstração · dados fictícios</p>
      </aside>

      {/* Formulário em 2 passos */}
      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo to="/" />
          </div>
          <Card className="p-6 sm:p-8" data-testid="card-cadastro">
            <h1 className="text-2xl font-bold tracking-tight">Criar conta grátis</h1>
            <p className="mt-1 text-sm text-muted-foreground">Usuário e empresa em menos de 2 minutos.</p>

            {/* Progresso */}
            <div className="mt-6 flex items-center gap-2" data-testid="passos-cadastro">
              {STEPS.map((s, i) => (
                <div key={s.n} className="flex flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                      step > s.n
                        ? "border-primary bg-primary text-white"
                        : step === s.n
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground",
                    )}
                    data-testid={`passo-${s.n}-indicador`}
                  >
                    {step > s.n ? <Check className="size-3.5" /> : s.n}
                  </span>
                  <span className={cn("text-xs font-medium", step === s.n ? "text-foreground" : "text-muted-foreground")}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
                </div>
              ))}
            </div>

            {step === 1 ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (validateStep1()) setStep(2);
                }}
                className="mt-6 space-y-4"
                data-testid="form-cadastro-usuario"
              >
                <Field label="Nome completo">
                  <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Maria da Silva" data-testid="input-nome-usuario" />
                </Field>
                <Field label="E-mail">
                  <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="voce@empresa.com.br" data-testid="input-email-usuario" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Senha">
                    <Input type="password" value={form.password} onChange={(e) => set({ password: e.target.value })} placeholder="Mín. 6 caracteres" data-testid="input-senha-usuario" />
                  </Field>
                  <Field label="Confirmar senha">
                    <Input type="password" value={form.confirmPassword} onChange={(e) => set({ confirmPassword: e.target.value })} placeholder="Repita a senha" data-testid="input-confirmar-senha" />
                  </Field>
                </div>
                <Button type="submit" className="w-full" data-testid="btn-continuar-cadastro">
                  Continuar <ArrowRight className="size-4" />
                </Button>
              </form>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="form-cadastro-empresa">
                <Field label="Nome da empresa">
                  <Input value={form.company_name} onChange={(e) => set({ company_name: e.target.value })} placeholder="Minha Empresa LTDA" data-testid="input-nome-empresa" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Segmento">
                    <Select value={form.segment} onValueChange={(v: string) => set({ segment: v })}>
                      <SelectTrigger data-testid="select-segmento">
                        <SelectValue>{(v: string) => v}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="CNPJ (opcional)">
                    <Input value={form.cnpj} onChange={(e) => set({ cnpj: e.target.value })} placeholder="00.000.000/0001-00" data-testid="input-cnpj-empresa" />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Telefone">
                    <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(11) 99999-0000" data-testid="input-telefone-empresa" />
                  </Field>
                  <Field label="Cidade / UF">
                    <div className="flex gap-2">
                      <Input value={form.city} onChange={(e) => set({ city: e.target.value })} placeholder="São Paulo" data-testid="input-cidade-empresa" />
                      <Input value={form.state} onChange={(e) => set({ state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="SP" className="w-16" data-testid="input-uf-empresa" />
                    </div>
                  </Field>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)} data-testid="btn-voltar-passo">
                    <ArrowLeft className="size-4" /> Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={register.isPending} data-testid="btn-finalizar-cadastro">
                    {register.isPending ? "Criando…" : "Criar conta"}
                  </Button>
                </div>
              </form>
            )}

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={() =>
                demo.mutate(undefined, {
                  onSuccess: (res) => {
                    signIn({ user: res.user, company: res.company, mode: "demo" });
                    toast.success("Bem-vindo à demonstração do NEXBIZ!");
                    navigate("/app");
                  },
                  onError: (err) => {
                    if (err instanceof ApiError) {
                      toast.error(errMessage(err));
                      return;
                    }
                    signIn({ user: demoData.users[0], company: demoData.company, mode: "offline" });
                    navigate("/app");
                  },
                })
              }
              data-testid="btn-cadastro-demo"
            >
              <Sparkles className="size-4 text-primary" /> Explorar com conta demo
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <a href="/login" className="font-semibold text-primary hover:underline" data-testid="link-ir-login">
                Entrar
              </a>
            </p>
          </Card>

          <a href="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-voltar-site-cadastro">
            <ArrowLeft className="size-4" /> Voltar ao site
          </a>
        </div>
      </main>
    </div>
  );
}
