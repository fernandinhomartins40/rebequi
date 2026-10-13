import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
export function PwaControls({ canUpdate, showInstall, manifestPath, workerPath, scope, updateMessage }: { canUpdate: boolean; showInstall: boolean; manifestPath: string; workerPath: string; scope: string; updateMessage: string }) {
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [installed, setInstalled] = useState(window.matchMedia('(display-mode: standalone)').matches);
  const [installHelp, setInstallHelp] = useState(false);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const originalManifest = link?.getAttribute('href');
    link?.setAttribute('href', manifestPath);
    const prompt = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const complete = () => { setInstalled(true); setInstall(null); };
    window.addEventListener('beforeinstallprompt', prompt); window.addEventListener('appinstalled', complete);
    let disposed = false;
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register(workerPath, { scope, updateViaCache: 'none' }).then(registration => {
        if (disposed) return;
        if (registration.waiting) setWaiting(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          worker?.addEventListener('statechange', () => {
            if (!disposed && worker.state === 'installed' && navigator.serviceWorker.controller) setWaiting(registration.waiting);
          });
        });
      }).catch(() => { /* Online workspace remains available without installation support. */ });
    }
    return () => {
      disposed = true; if (originalManifest) link?.setAttribute('href', originalManifest);
      window.removeEventListener('beforeinstallprompt', prompt); window.removeEventListener('appinstalled', complete);
    };
  }, [manifestPath, workerPath, scope]);
  const applyUpdate = () => {
    if (!waiting || !canUpdate) return;
    setUpdating(true);
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waiting.postMessage({ type: updateMessage });
  };
  return <div className="space-y-3">{!installed && showInstall ? <div className="rounded-xl border bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-medium">Use como aplicativo no celular</p><Button variant="outline" size="sm" onClick={async () => { if (install) { await install.prompt(); await install.userChoice; setInstall(null); } else setInstallHelp(current => !current); }}>Instalar aplicativo</Button></div>{installHelp ? <p className="mt-3 text-sm text-slate-500">No iPhone, abra no Safari e escolha Compartilhar → Adicionar à Tela de Início. No Android, abra o menu do navegador e escolha Instalar aplicativo ou Adicionar à tela inicial.</p> : null}</div> : null}{waiting ? <div role="status" className="rounded-xl bg-blue-50 p-4"><p className="text-sm">Uma atualização está disponível. Conclua suas edições antes de atualizar.</p><Button className="mt-3" size="sm" disabled={!canUpdate || updating} onClick={applyUpdate}>{updating ? 'Atualizando…' : 'Atualizar aplicativo'}</Button></div> : null}</div>;
}
