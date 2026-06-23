import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { OrkutLayout, Panel } from "@/components/orkut/Layout";

export const Route = createFileRoute("/_authenticated/scanner")({
  ssr: false,
  component: ScannerPage,
});

type Status = "idle" | "starting" | "running" | "error";

function ScannerPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const scannerRef = useRef<any>(null);
  const handledRef = useRef(false);

  const stopScanner = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      s.clear?.();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setErrMsg(null);
    setStatus("starting");
    handledRef.current = false;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Este navegador não suporta acesso à câmera (getUserMedia).");
      }

      // Probe permission early so we can show a friendly message.
      try {
        const probe = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        probe.getTracks().forEach(t => t.stop());
      } catch (err: any) {
        const name = err?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          throw new Error("Permissão da câmera negada. Habilite o acesso à câmera nas configurações do navegador/dispositivo.");
        }
        if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
          throw new Error("Nenhuma câmera encontrada neste dispositivo.");
        }
        if (name === "NotReadableError" || name === "TrackStartError") {
          throw new Error("Câmera em uso por outro aplicativo. Feche outros apps e tente novamente.");
        }
        throw new Error(`Erro ao acessar câmera: ${err?.message || name || "desconhecido"}`);
      }

      let Html5QrcodeCtor: any;
      try {
        const mod = await import("html5-qrcode");
        Html5QrcodeCtor = mod.Html5Qrcode;
        if (!Html5QrcodeCtor) throw new Error("Export Html5Qrcode ausente.");
      } catch (err: any) {
        throw new Error(`Falha ao carregar biblioteca de QR Code: ${err?.message || err}`);
      }

      const el = document.getElementById("qr-region");
      if (!el) throw new Error("Container do scanner não encontrado no DOM.");

      const html5 = new Html5QrcodeCtor("qr-region", false);
      scannerRef.current = html5;

      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded: string) => {
          if (handledRef.current) return;
          handledRef.current = true;
          const codigo = decoded.trim();
          void stopScanner().finally(() => {
            navigate({ to: "/participante/$codigo", params: { codigo } });
          });
        },
        () => { /* per-frame decode errors are noisy; ignore */ },
      );

      setStatus("running");
    } catch (e: any) {
      console.error("[scanner]", e);
      await stopScanner();
      setStatus("error");
      setErrMsg(e?.message || String(e) || "Erro desconhecido ao iniciar a câmera.");
    }
  };

  return (
    <OrkutLayout>
      <Panel title="📷 Leitor de QR Code">
        <p className="text-xs text-muted-foreground mb-3">
          Toque em "Escanear QR Code" e permita o acesso à câmera. A leitura é automática.
        </p>

        {status === "idle" && (
          <div className="text-center my-4">
            <button className="orkut-btn" type="button" onClick={startScanner}>
              📷 ESCANEAR QR CODE
            </button>
          </div>
        )}

        <div
          id="qr-region"
          className="w-full max-w-sm mx-auto rounded overflow-hidden border-2 border-primary bg-black aspect-square"
          style={{ display: status === "running" || status === "starting" ? "block" : "none" }}
        />

        <div className="mt-3 text-center text-xs">
          {status === "starting" && <span className="text-muted-foreground">Iniciando câmera...</span>}
          {status === "running" && <span className="text-success">● Pronto para ler</span>}
        </div>

        {status === "error" && errMsg && (
          <div className="mt-3 rounded border border-destructive bg-destructive/10 p-3 text-xs text-destructive">
            <div className="font-bold mb-1">Não foi possível iniciar o scanner</div>
            <div className="break-words whitespace-pre-wrap">{errMsg}</div>
            <div className="mt-2 text-center">
              <button className="orkut-btn" type="button" onClick={startScanner}>
                Tentar novamente
              </button>
            </div>
          </div>
        )}
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
          <input
            className="orkut-input flex-1"
            placeholder="Digite o código do participante"
            value={manual}
            onChange={e => setManual(e.target.value)}
          />
          <button className="orkut-btn" type="submit">Buscar</button>
        </form>
      </Panel>
    </OrkutLayout>
  );
}
