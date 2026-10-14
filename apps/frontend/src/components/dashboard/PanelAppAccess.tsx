import { useEffect } from 'react';

const apps = {
  cliente: { manifest: '/aplicativos/cliente/manifest.webmanifest', worker: '/customer-sw.js', scope: '/painel-cliente', label: 'Cliente' },
  vendedor: { manifest: '/aplicativos/vendedor/manifest.webmanifest', worker: '/seller-sw.js', scope: '/painel-lojista', label: 'Vendas' },
};
export function PanelAppAccess({ kind }: { kind: keyof typeof apps }) {
  const app = apps[kind];
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const original = link?.getAttribute('href');
    link?.setAttribute('href', app.manifest);
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register(app.worker, { scope: app.scope, updateViaCache: 'none' }).catch(() => { /* The online panel remains usable. */ });
    }
    return () => { if (original) link?.setAttribute('href', original); };
  }, [app]);
  return <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"><a className="font-medium text-blue-800 underline underline-offset-4" href={`${app.scope}/instalar/`}>Instalar Rebequi {app.label}</a><a className="text-muted-foreground underline underline-offset-4" href="/aplicativos/">Escolher aplicativo</a></div>;
}
