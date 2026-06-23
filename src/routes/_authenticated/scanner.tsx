import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { OrkutLayout, Panel } from "@/components/orkut/Layout";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/scanner")({
  ssr: false,
  component: ScannerPage,
});

function ScannerPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"idle" | "starting" | "running" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    handledRef.current = false;

    async function start() {
      setStatus("starting");
      try {
        const html5 = new Html5Qrcode("qr-region", { verbose: false });
        scannerRef.current = html5;
        await html5.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          (decoded) => {
            if (handledRef.current) return;
            handledRef.current = true;
            const codigo = decoded.trim();
            navigate({ to: "/participante/$codigo", params: { codigo } });
          },
          () => { /* scan errors are noisy, ignore */ },
        );
        if (!cancelled) setStatus("running");
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setStatus("error");
          setErrMsg(e?.message || "Não foi possível acessar a câmera.");
          toast.error("Permita acesso à câmera para ler QR codes.");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().then(() => s.clear()).catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [navigate]);

  const [manual, setManual] = useState("");

  return (
    <OrkutLayout>
      <Panel title="📷 Leitor de QR Code">
        <p className="text-xs text-muted-foreground mb-3">
          Aponte a câmera para o QR Code do participante. A leitura é automática.
        </p>
        <div id="qr-region" className="w-full max-w-sm mx-auto rounded overflow-hidden border-2 border-primary bg-black aspect-square" />
        <div className="mt-3 text-center text-xs">
          {status === "starting" && <span className="text-muted-foreground">Iniciando câmera...</span>}
          {status === "running" && <span className="text-success">● Pronto para ler</span>}
          {status === "error" && <span className="text-destructive">⚠ {errMsg}</span>}
        </div>
      </Panel>

      <Panel title="⌨️ Entrada manual (opcional)">
        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            const c = manual.trim();
            if (c) navigate({ to: "/participante/$codigo", params: { codigo: c } });
          }}
        >
          <input className="orkut-input flex-1" placeholder="Digite o código do participante" value={manual} onChange={e => setManual(e.target.value)} />
          <button className="orkut-btn" type="submit">Buscar</button>
        </form>
      </Panel>
    </OrkutLayout>
  );
}
