import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrkutLayout, Panel } from "@/components/orkut/Layout";
import { fetchParticipantes, type Participante } from "@/lib/participantes";
import { QrCode, Users, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard,
});

function Dashboard() {
  const [list, setList] = useState<Participante[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchParticipantes().then(d => { if (mounted) setList(d); }).catch(() => {});
    const ch = supabase
      .channel("dashboard-participantes")
      .on("postgres_changes", { event: "*", schema: "public", table: "participantes" }, () => {
        fetchParticipantes().then(d => { if (mounted) setList(d); }).catch(() => {});
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const total = list.length;
  const presentes = list.filter(p => p.presente).length;
  const pendentes = total - presentes;

  return (
    <OrkutLayout>
      <Panel title="📊 Resumo do evento">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Participantes" value={total} color="var(--orkut-blue)" />
          <StatCard label="Presentes" value={presentes} color="var(--success)" />
          <StatCard label="Pendentes" value={pendentes} color="var(--warning)" />
        </div>
      </Panel>

      <Panel title="⚡ Ações rápidas">
        <div className="grid sm:grid-cols-3 gap-3">
          <BigButton to="/scanner" icon={<QrCode size={32} />} label="ESCANEAR QR CODE" />
          <BigButton to="/participantes" icon={<Users size={32} />} label="PARTICIPANTES" />
          <BigButton to="/administracao" icon={<Shield size={32} />} label="ADMINISTRAÇÃO" />
        </div>
      </Panel>

      <Panel title="💬 Sobre">
        <p className="text-sm text-muted-foreground">
          Bem-vindo ao <b>Orkut Credenciamento</b>! Sistema de credenciamento em tempo real para o seu evento.
          Todas as confirmações são sincronizadas instantaneamente em todos os dispositivos conectados.
        </p>
      </Panel>
    </OrkutLayout>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="orkut-card p-3 text-center">
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
      <div className="text-[11px] uppercase font-bold text-muted-foreground tracking-wide mt-1">{label}</div>
    </div>
  );
}

function BigButton({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="no-underline">
      <div className="orkut-card p-5 text-center hover:bg-secondary transition-colors cursor-pointer flex flex-col items-center gap-2">
        <div className="text-primary">{icon}</div>
        <div className="font-bold text-sm text-foreground">{label}</div>
      </div>
    </Link>
  );
}
