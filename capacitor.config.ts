import { CapacitorConfig } from "@capacitor/cli";

// IMPORTANTE:
// O app web roda em TanStack Start (SSR) e NÃO gera um SPA estático em /dist.
// Para o APK Android, usamos `server.url` apontando para a versão publicada
// no Lovable. Assim o WebView carrega o app hospedado (com HTTPS, Supabase,
// câmera/QR funcionando normalmente) e qualquer atualização publicada
// aparece automaticamente sem precisar recompilar o APK.
//
// Quando você publicar em domínio próprio, basta trocar a URL abaixo.
const config: CapacitorConfig = {
  appId: "app.lovable.orkutcredenciamento",
  appName: "Orkut Credenciamento",
  webDir: "dist",
  server: {
    url: "https://id-preview--c05dddf1-0351-47df-9968-5e22d79a237a.lovable.app",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
