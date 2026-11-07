import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { demoData } from "@/lib/demo-data";
import { errMessage, useLoginMutation } from "@/lib/queries";
import { signIn, useSession } from "@/lib/session";
import type { AppUser, Company } from "@/lib/types";

const BULLETS = [
  "Vendas, estoque e financeiro conectados",
  "Menu lateral adaptável — celular e computador",
  "Dados demonstrativos prontos para explorar",
];

export default function Login() {
  const session = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLoginMutation();

  if (session) return <Navigate to="/app" replace />;

  const enter = (user: AppUser, company: Company, message: string) => {
    signIn({ user, company });
    toast.success(message);
    navigate("/app");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe o seu e-mail.");
      return;
    }
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: (res) => enter(res.user, res.company, "Bem-vindo de volta!"),
        onError: (err) => {
          if (err instanceof ApiError) {
            toast.error(errMessage(err));
            return;
          }
          // Sem backend (preview estático): entra no modo demonstração.
          const user =
            demoData.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()) ?? demoData.users[0];
          enter(user, demoData.company, "Modo demonstração — bem-vindo!");
        },
      },
    );
  };

  const enterDemo = () => enter(demoData.users[0], demoData.company, "Bem-vindo à demonstração do NEXBIZ!");

  return (
    <div className="grid min-h-svh lg:grid-cols-2" data-testid="page-login">
      {/* Painel de marca */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#0B132B] p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(520px 280px at 80% 15%, rgba(37,99,235,0.35), transparent 70%)" }}
        />
        <div className="relative">
          <Logo onDark to="/" />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            A gestão completa da sua empresa, do estoque ao caixa.
          </h2>
          <ul className="mt-8 space-y-3.5">
            {BULLETS.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex size-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                  <Check className="size-3" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">
          Ambiente de demonstração · nenhuma senha é verificada · dados fictícios
        </p>
      </aside>

      {/* Formulário */}
      <main className="flex flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo to="/" />
          </div>
          <Card className="p-6 sm:p-8" data-testid="card-login">
            <h1 className="text-2xl font-bold tracking-tight">Entrar na sua conta</h1>
            <p className="mt-1 text-sm text-muted-foreground">Acesse o painel do NEXBIZ.</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="form-login">
              <Field label="E-mail">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="voce@empresa.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    data-testid="input-email-login"
                  />
                </div>
              </Field>
              <Field label="Senha">
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    data-testid="input-senha-login"
                  />
                </div>
              </Field>
              <Button type="submit" className="w-full" disabled={login.isPending} data-testid="btn-entrar">
                {login.isPending ? "Entrando…" : "Entrar"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              variant="secondary"
              className="w-full gap-2"
              onClick={enterDemo}
              data-testid="btn-entrar-demo"
            >
              <Sparkles className="size-4 text-primary" /> Entrar com Conta Demo (Admin)
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Demonstração: qualquer e-mail e senha entram — nada é verificado.
            </p>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <a href="/cadastro" className="font-semibold text-primary hover:underline" data-testid="link-ir-cadastro">
                Criar agora
              </a>
            </p>
          </Card>

          <a href="/" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-voltar-site">
            <ArrowLeft className="size-4" /> Voltar ao site
          </a>
        </div>
      </main>
    </div>
  );
}
