import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OrkutLayout, Panel, ComboBadge } from "@/components/orkut/Layout";
import {
  cancelarPresenca,
  confirmarPresenca,
  fetchOperadorNome,
  fetchParticipante,
  salvarNotas,
  type Participante,
} from "@/lib/participantes";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/participante/$codigo")({
  ssr: false,
  component: ParticipanteFicha,
});

function ParticipanteFicha() {
  const { codigo } = useParams({ from: "/_authenticated/participante/$codigo" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [participante, setParticipante] = useState<Participante | null>(null);
  const [operador, setOperador] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<Participante | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const p = await fetchParticipante(codigo);
      setParticipante(p);
      setOperador(await fetchOperadorNome(p?.realizado_por ?? null));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [codigo]);

  useEffect(() => {
    const ch = supabase
      .channel(`participante-${codigo}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "participantes", filter: `codigo=eq.${codigo}` },
        () => reload(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [codigo]);

  // success screen auto-return
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => navigate({ to: "/scanner" }), 3000);
    return () => clearTimeout(t);
  }, [success, navigate]);

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-6"
           style={{ background: "linear-gradient(180deg, oklch(0.6 0.18 145) 0%, oklch(0.5 0.18 145) 100%)", color: "#fff" }}>
        <div className="text-6xl mb-4">✅</div>
        <div className="text-2xl font-bold mb-3">PRESENÇA CONFIRMADA</div>
        <div className="text-3xl font-black uppercase mb-3">{success.nome}</div>
        <div className="text-xl"><ComboBadge combo={success.combo} /></div>
        <div className="text-xs mt-6 opacity-80">Retornando ao scanner em 3s...</div>
      </div>
    );
  }

  async function handleConfirmar() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const res = await confirmarPresenca(codigo, u.user.id);
      if (res.ok) {
        setSuccess(res.participante);
      } else {
        toast.warning("Participante já credenciado por outro operador.");
        await reload();
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao confirmar");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelar() {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      await cancelarPresenca(codigo, u.user.id);
      toast.success("Presença cancelada");
      setConfirmCancel(false);
      reload();
    } catch (e: any) {
      toast.error(e.message || "Erro ao cancelar");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <OrkutLayout><Panel title="Ficha do participante"><p className="text-sm">Carregando...</p></Panel></OrkutLayout>;
  }

  if (!participante) {
    return (
      <OrkutLayout>
        <Panel title="❌ Participante não encontrado">
          <p className="text-sm mb-2">Nenhum participante com o código:</p>
          <code className="block bg-secondary p-2 rounded text-xs break-all mb-4">{codigo}</code>
          <Link to="/scanner" className="orkut-btn">Voltar ao scanner</Link>
        </Panel>
      </OrkutLayout>
    );
  }

  return (
    <OrkutLayout>
      <Panel title="🎟️ Ficha do participante">
        <div className="space-y-3">
          <Row label="Nome"><b className="text-base">{participante.nome}</b></Row>
          <Row label="Combo"><ComboBadge combo={participante.combo} /></Row>
          <Row label="Código"><code className="text-[11px] text-muted-foreground break-all">{participante.codigo}</code></Row>
          <Row label="Status">
            {participante.presente ? (
              <span className="orkut-badge" style={{ background: "var(--success)", color: "#fff" }}>✓ PRESENTE</span>
            ) : (
              <span className="orkut-badge" style={{ background: "var(--warning)", color: "#222" }}>⏳ AGUARDANDO ENTRADA</span>
            )}
          </Row>
          {participante.presente && (
            <>
              <Row label="Data de credenciamento">{formatDate(participante.data_hora_checkin)}</Row>
              <Row label="Operador responsável">{operador || "—"}</Row>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {!participante.presente && (
            <button onClick={handleConfirmar} disabled={saving} className="orkut-btn">
              {saving ? "Confirmando..." : "✓ CONFIRMAR PRESENÇA"}
            </button>
          )}
          {participante.presente && !confirmCancel && (
            <button onClick={() => setConfirmCancel(true)} className="orkut-btn orkut-btn-danger">
              ✗ CANCELAR PRESENÇA
            </button>
          )}
          {confirmCancel && (
            <>
              <button onClick={handleCancelar} disabled={saving} className="orkut-btn orkut-btn-danger">
                Sim, cancelar
              </button>
              <button onClick={() => setConfirmCancel(false)} className="orkut-btn orkut-btn-secondary">
                Não
              </button>
            </>
          )}
          <Link to="/scanner" className="orkut-btn orkut-btn-secondary">📷 Voltar ao scanner</Link>
          <Link to="/participantes" className="orkut-btn orkut-btn-secondary">Lista</Link>
        </div>

        {participante.presente && (
          <div className="mt-4 p-3 rounded border border-warning bg-warning/10 text-xs">
            ⚠ <b>PARTICIPANTE JÁ CREDENCIADO</b><br />
            Credenciado em {formatDate(participante.data_hora_checkin)} por {operador || "—"}.
          </div>
        )}
      </Panel>
    </OrkutLayout>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 border-b border-border pb-2">
      <div className="text-[11px] uppercase font-bold text-muted-foreground sm:w-48">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}
