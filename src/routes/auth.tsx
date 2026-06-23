import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = "Orkut Credenciamento — Entrar"; }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Entrando...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
      navigate({ to: "/", replace: true });
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background">
      <div className="orkut-topbar w-full">
        <div className="max-w-5xl mx-auto px-3 py-2">
          <div className="bg-white text-primary rounded px-3 py-1 font-black tracking-tight text-xl inline-block" style={{ fontFamily: "Verdana, Arial" }}>
            orkut<span>.</span> <span className="text-primary font-bold text-sm">credenciamento</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md p-4 mt-8">
        <div className="orkut-card overflow-hidden">
          <div className="orkut-panel-header">
            {mode === "login" ? "🔒 Entrar" : "✨ Criar conta"}
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-3">
            {mode === "signup" && (
              <div>
                <label className="text-xs font-bold block mb-1">Nome do operador</label>
                <input className="orkut-input" required value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" />
              </div>
            )}
            <div>
              <label className="text-xs font-bold block mb-1">E-mail</label>
              <input type="email" className="orkut-input" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Senha</label>
              <input type="password" className="orkut-input" required minLength={6} value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••" />
            </div>
            <button type="submit" className="orkut-btn w-full" disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "ENTRAR" : "CRIAR CONTA"}
            </button>
            <div className="text-center text-xs pt-2 border-t border-border">
              {mode === "login" ? (
                <>É novo por aqui?{" "}
                  <a className="orkut-link" onClick={() => setMode("signup")}>Crie sua conta</a>
                </>
              ) : (
                <>Já tem cadastro?{" "}
                  <a className="orkut-link" onClick={() => setMode("login")}>Entrar</a>
                </>
              )}
            </div>
          </form>
        </div>
        <p className="text-center text-[11px] text-muted-foreground mt-3">
          Orkut Credenciamento — sistema oficial de credenciamento de eventos
        </p>
      </div>
    </div>
  );
}
