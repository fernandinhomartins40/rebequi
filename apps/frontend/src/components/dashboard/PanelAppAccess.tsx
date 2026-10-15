import { useEffect } from 'react';
import { activePwa, pwaApps } from '@/lib/pwa-routing';

export function PanelAppAccess({ kind }: { kind: 'cliente' | 'vendedor' }) {
  const app = activePwa || pwaApps.find(app => app.key === kind)!;
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const original = link?.getAttribute('href');
    link?.setAttribute('href', `/aplicativos/${app.key}/manifest.webmanifest`);
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register(app.worker, { scope: app.scope, updateViaCache: 'none' }).catch(() => { /* The online panel remains usable. */ });
    }
    return () => { if (original) link?.setAttribute('href', original); };
  }, [app]);
  return <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm"><a className="font-medium text-blue-800 underline underline-offset-4" href={`${app.scope}/instalar/`}>Instalar {app.name}</a><a className="text-muted-foreground underline underline-offset-4" href="/aplicativos/">Escolher aplicativo</a></div>;
}
