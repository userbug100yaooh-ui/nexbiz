import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/Field";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { errMessage, useForgotMutation, useOpenSessionMutation, usePasswordMutation } from "@/lib/queries";
import { signIn } from "@/lib/session";

function AuthCard({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-10" data-testid={testId}>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo to="/" />
        </div>
        <Card className="p-6 sm:p-8">{children}</Card>
        <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-voltar-login">
          <ArrowLeft className="size-4" /> Voltar ao login
        </Link>
      </div>
    </main>
  );
}

/** /recuperar-senha — solicita o e-mail de redefinição (Supabase). */
export function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const forgot = useForgotMutation();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    forgot.mutate(email.trim(), {
      onSuccess: () => setSent(true),
      onError: (err) => toast.error(errMessage(err)),
    });
  };

  return (
    <AuthCard testId="page-recuperar-senha">
      {sent ? (
        <div className="text-center" data-testid="recuperar-senha-enviado">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" />
          </span>
          <h1 className="mt-4 text-xl font-bold">Verifique seu e-mail</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Se <b>{email.trim()}</b> estiver cadastrado, enviamos um link para criar uma nova senha. O link expira em 1 hora.
          </p>
        </div>
      ) : (
        <>
          <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enviaremos um link de redefinição para o seu e-mail.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="form-recuperar-senha">
            <Field label="E-mail">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com.br" data-testid="input-email-recuperar" />
            </Field>
            <Button type="submit" className="w-full" disabled={forgot.isPending} data-testid="btn-enviar-recuperacao">
              {forgot.isPending ? "Enviando…" : "Enviar link de redefinição"}
            </Button>
          </form>
        </>
      )}
    </AuthCard>
  );
}

/** /redefinir-senha — destino do link do e-mail (#access_token=…&type=recovery). */
export function RedefinirSenha() {
  const navigate = useNavigate();
  const openSession = useOpenSessionMutation();
  const changePassword = usePasswordMutation();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    window.history.replaceState(null, "", "/redefinir-senha");
    if (!access_token || !refresh_token) {
      setInvalid(true);
      return;
    }
    openSession.mutate(
      { access_token, refresh_token },
      {
        onSuccess: (res) => {
          signIn({ user: res.user, company: res.company, mode: res.mode });
          setReady(true);
        },
        onError: () => setInvalid(true),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return void toast.error("A senha deve ter pelo menos 6 caracteres.");
    if (password !== confirm) return void toast.error("As senhas não conferem.");
    changePassword.mutate(password, {
      onSuccess: () => {
        toast.success("Senha redefinida com sucesso!");
        navigate("/app");
      },
      onError: (err) => toast.error(errMessage(err)),
    });
  };

  return (
    <AuthCard testId="page-redefinir-senha">
      {invalid ? (
        <div className="text-center" data-testid="redefinir-link-invalido">
          <h1 className="text-xl font-bold">Link inválido ou expirado</h1>
          <p className="mt-2 text-sm text-muted-foreground">Solicite um novo link de redefinição de senha.</p>
          <Link to="/recuperar-senha" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline" data-testid="link-novo-link">
            Pedir novo link
          </Link>
        </div>
      ) : !ready ? (
        <p className="py-6 text-center text-sm text-muted-foreground" data-testid="redefinir-validando">Validando link…</p>
      ) : (
        <>
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </span>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Criar nova senha</h1>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" data-testid="form-redefinir-senha">
            <Field label="Nova senha">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mín. 6 caracteres" data-testid="input-nova-senha" />
            </Field>
            <Field label="Confirmar nova senha">
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="input-confirmar-nova-senha" />
            </Field>
            <Button type="submit" className="w-full" disabled={changePassword.isPending} data-testid="btn-salvar-nova-senha">
              {changePassword.isPending ? "Salvando…" : "Salvar nova senha"}
            </Button>
          </form>
        </>
      )}
    </AuthCard>
  );
}
