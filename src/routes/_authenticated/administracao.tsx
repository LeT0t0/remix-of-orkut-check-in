import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrkutLayout, Panel, ComboBadge } from "@/components/orkut/Layout";
import { fetchParticipantes, type Participante } from "@/lib/participantes";

export const Route = createFileRoute("/_authenticated/administracao")({
  ssr: false,
  component: AdminPage,
});

interface Hist {
  id: string;
  codigo: string;
  acao: string;
  usuario_nome: string | null;
  created_at: string;
}

function AdminPage() {
  const [list, setList] = useState<Participante[]>([]);
  const [hist, setHist] = useState<Hist[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "presentes" | "pendentes">("todos");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const [parts, h] = await Promise.all([
        fetchParticipantes(),
        supabase.from("historico").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      if (!mounted) return;
      setList(parts);
      setHist((h.data || []) as Hist[]);
    };
    load();
    const ch = supabase
      .channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "participantes" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "historico" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const presentes = list.filter(p => p.presente).length;
  const pendentes = list.length - presentes;

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return list.filter(p => {
      if (filtro === "presentes" && !p.presente) return false;
      if (filtro === "pendentes" && p.presente) return false;
      if (q && !p.nome.toLowerCase().includes(q) && !p.combo.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [list, busca, filtro]);

  function exportCSV() {
    const header = ["codigo", "nome", "combo", "presente", "data_hora_checkin", "realizado_por"];
    const rows = list.map(p => [p.codigo, p.nome, p.combo, p.presente ? "true" : "false", p.data_hora_checkin || "", p.realizado_por || ""]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `credenciamento-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <OrkutLayout>
      <Panel title="📊 Administração — Estatísticas">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total" value={list.length} color="var(--orkut-blue)" />
          <Stat label="Presentes" value={presentes} color="var(--success)" />
          <Stat label="Pendentes" value={pendentes} color="var(--warning)" />
        </div>
      </Panel>

      <Panel title="📋 Lista completa" actions={
        <button onClick={exportCSV} className="orkut-btn !py-1 !px-2 text-[11px]">⬇ Exportar CSV</button>
      }>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input className="orkut-input flex-1" placeholder="Pesquisar..." value={busca} onChange={e => setBusca(e.target.value)} />
          <div className="flex gap-1">
            {(["todos", "presentes", "pendentes"] as const).map(f => (
              <button key={f} onClick={() => setFiltro(f)} className={`orkut-btn text-xs ${filtro === f ? "" : "orkut-btn-secondary"}`}>
                {f === "todos" ? "Todos" : f === "presentes" ? "Presentes" : "Pendentes"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-left text-[11px] uppercase">
                <th className="p-2">Nome</th>
                <th className="p-2">Combo</th>
                <th className="p-2">Status</th>
                <th className="p-2 hidden md:table-cell">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.codigo} className="border-b border-border">
                  <td className="p-2">
                    <Link to="/participante/$codigo" params={{ codigo: p.codigo }} className="orkut-link">{p.nome}</Link>
                  </td>
                  <td className="p-2"><ComboBadge combo={p.combo} /></td>
                  <td className="p-2 text-xs">{p.presente ? "✓ Presente" : "⏳ Pendente"}</td>
                  <td className="p-2 hidden md:table-cell text-xs">{p.data_hora_checkin ? new Date(p.data_hora_checkin).toLocaleString("pt-BR") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="📜 Histórico de alterações">
        {hist.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma alteração registrada ainda.</p>
        ) : (
          <ul className="space-y-1 text-xs max-h-80 overflow-y-auto">
            {hist.map(h => {
              const p = list.find(l => l.codigo === h.codigo);
              return (
                <li key={h.id} className="border-b border-border pb-1 flex flex-wrap gap-2">
                  <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                  <span className={`orkut-badge ${h.acao === "CHECKIN" ? "" : ""}`} style={{ background: h.acao === "CHECKIN" ? "var(--success)" : "var(--destructive)", color: "#fff" }}>
                    {h.acao}
                  </span>
                  <span><b>{p?.nome || h.codigo}</b></span>
                  <span className="text-muted-foreground">por {h.usuario_nome || "—"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </OrkutLayout>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="orkut-card p-3 text-center">
      <div className="text-3xl font-black" style={{ color }}>{value}</div>
      <div className="text-[11px] uppercase font-bold text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
