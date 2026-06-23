import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrkutLayout, Panel, ComboBadge } from "@/components/orkut/Layout";
import { fetchParticipantes, type Participante } from "@/lib/participantes";

export const Route = createFileRoute("/_authenticated/participantes")({
  ssr: false,
  component: ParticipantesList,
});

function ParticipantesList() {
  const [list, setList] = useState<Participante[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "presentes" | "pendentes">("todos");
  const [operNomes, setOperNomes] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await fetchParticipantes();
      if (!mounted) return;
      setList(data);
      const ids = Array.from(new Set(data.map(d => d.realizado_por).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,nome,email").in("id", ids);
        const map: Record<string, string> = {};
        profs?.forEach(p => { map[p.id] = p.nome || p.email || ""; });
        if (mounted) setOperNomes(map);
      }
    };
    load();
    const ch = supabase
      .channel("lista-participantes")
      .on("postgres_changes", { event: "*", schema: "public", table: "participantes" }, () => load())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return list.filter(p => {
      if (filtro === "presentes" && !p.presente) return false;
      if (filtro === "pendentes" && p.presente) return false;
      if (q && !p.nome.toLowerCase().includes(q) && !p.combo.toLowerCase().includes(q) && !p.codigo.includes(q)) return false;
      return true;
    });
  }, [list, busca, filtro]);

  return (
    <OrkutLayout>
      <Panel title="🔍 Filtrar">
        <div className="flex flex-col sm:flex-row gap-2">
          <input className="orkut-input flex-1" placeholder="Pesquisar por nome, combo ou código..." value={busca} onChange={e => setBusca(e.target.value)} />
          <div className="flex gap-1">
            {(["todos", "presentes", "pendentes"] as const).map(f => (
              <button key={f}
                onClick={() => setFiltro(f)}
                className={`orkut-btn ${filtro === f ? "" : "orkut-btn-secondary"} text-xs`}>
                {f === "todos" ? "Todos" : f === "presentes" ? "Presentes" : "Pendentes"}
              </button>
            ))}
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-2">Mostrando {filtered.length} de {list.length} participantes</div>
      </Panel>

      <Panel title={`👥 Participantes (${filtered.length})`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary text-left text-[11px] uppercase">
                <th className="p-2">Nome</th>
                <th className="p-2">Combo</th>
                <th className="p-2">Status</th>
                <th className="p-2 hidden md:table-cell">Data</th>
                <th className="p-2 hidden md:table-cell">Operador</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.codigo} className="border-b border-border hover:bg-secondary/40">
                  <td className="p-2">
                    <Link to="/participante/$codigo" params={{ codigo: p.codigo }} className="orkut-link font-bold">
                      {p.nome}
                    </Link>
                  </td>
                  <td className="p-2"><ComboBadge combo={p.combo} /></td>
                  <td className="p-2">
                    {p.presente ? (
                      <span className="orkut-badge" style={{ background: "var(--success)", color: "#fff" }}>✓ Presente</span>
                    ) : (
                      <span className="orkut-badge" style={{ background: "var(--warning)", color: "#222" }}>⏳ Pendente</span>
                    )}
                  </td>
                  <td className="p-2 hidden md:table-cell text-xs">{p.data_hora_checkin ? new Date(p.data_hora_checkin).toLocaleString("pt-BR") : "—"}</td>
                  <td className="p-2 hidden md:table-cell text-xs">{p.realizado_por ? (operNomes[p.realizado_por] || "—") : "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">Nenhum participante encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </OrkutLayout>
  );
}
