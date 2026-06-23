import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, QrCode, Users, Shield, Home } from "lucide-react";

export function OrkutLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [nome, setNome] = useState<string>("");

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active || !data.user) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("nome,email")
        .eq("id", data.user.id)
        .maybeSingle();
      if (active) setNome(prof?.nome || data.user.email || "Operador");
    });
    return () => { active = false; };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="orkut-topbar">
        <div className="max-w-5xl mx-auto px-3 py-2 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 text-white no-underline">
            <div className="bg-white text-primary rounded px-2 py-1 font-black tracking-tight text-lg" style={{ fontFamily: "Verdana, Arial" }}>
              orkut<span className="text-primary">.</span>
            </div>
            <span className="font-bold text-sm hidden sm:inline">Credenciamento</span>
          </Link>
          <nav className="flex items-center gap-1 text-xs">
            <NavLink to="/" icon={<Home size={14} />} label="Início" />
            <NavLink to="/scanner" icon={<QrCode size={14} />} label="Scanner" />
            <NavLink to="/participantes" icon={<Users size={14} />} label="Participantes" />
            <NavLink to="/administracao" icon={<Shield size={14} />} label="Admin" />
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs">olá, <b>{nome}</b></span>
            <button onClick={handleLogout} className="orkut-btn orkut-btn-secondary text-xs !py-1 !px-2" title="Sair">
              <LogOut size={12} /> Sair
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full">
        <div className="max-w-5xl mx-auto p-3 sm:p-5">
          {children}
        </div>
      </main>
      <footer className="text-center text-[11px] text-muted-foreground py-4">
        Orkut Credenciamento © {new Date().getFullYear()} — feito com nostalgia
      </footer>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1 px-2 py-1 rounded text-white no-underline hover:bg-white/15"
      activeProps={{ className: "flex items-center gap-1 px-2 py-1 rounded bg-white/20 text-white no-underline font-bold" }}
      activeOptions={{ exact: to === "/" }}
    >
      {icon}<span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function Panel({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="orkut-card mb-4 overflow-hidden">
      <header className="orkut-panel-header flex items-center justify-between">
        <span>{title}</span>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function ComboBadge({ combo }: { combo: string }) {
  const map: Record<string, { bg: string; icon: string }> = {
    PIVO: { bg: "oklch(0.85 0.12 75)", icon: "🍺" },
    PROMO: { bg: "oklch(0.85 0.12 200)", icon: "🎟️" },
    VEGETARIANO: { bg: "oklch(0.85 0.12 145)", icon: "🥗" },
  };
  const m = map[combo] || { bg: "var(--secondary)", icon: "🎫" };
  return (
    <span className="orkut-badge" style={{ background: m.bg, color: "#222" }}>
      {m.icon} {combo}
    </span>
  );
}
