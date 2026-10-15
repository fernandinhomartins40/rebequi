import { installPage, installerScript, installStyles } from './pwa-install-template.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const apps = [
  { key: 'cliente', name: 'Rebequi Cliente', description: 'Seus pedidos, orçamentos e entregas em um só lugar.', scope: '/painel-cliente', start: '/painel-cliente', worker: '/customer-sw.js', message: 'CUSTOMER_APPLY_UPDATE' },
  { key: 'vendedor', name: 'Rebequi Vendas', description: 'Atendimentos, clientes, pedidos e vendas da sua carteira.', scope: '/painel-lojista', start: '/painel-lojista/painel/atendimentos', worker: '/seller-sw.js', message: 'SELLER_APPLY_UPDATE' },
  { key: 'entregas', name: 'Rebequi Entregas', description: 'Suas entregas, materiais e registros de recebimento.', scope: '/painel-lojista/painel/entregas', start: '/painel-lojista/painel/entregas', worker: '/driver-sw.js', message: 'DRIVER_APPLY_UPDATE' },
];
const style = `:root{font-family:system-ui,sans-serif;color:#06142c;background:#f5f8fc;font-synthesis:none}*{box-sizing:border-box}body{margin:0}main{max-width:1040px;margin:auto;padding:40px 20px 64px}header{margin-bottom:28px}.brand{font-weight:900;letter-spacing:.08em;font-size:20px}h1{font-size:clamp(28px,6vw,40px);line-height:1.15}p,li{line-height:1.65}p{color:#51617b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:20px}article,.panel{padding:24px;border:1px solid #e2e9f2;border-radius:18px;background:white;min-width:0}h2{font-size:21px}img{border-radius:20px}a,button{touch-action:manipulation}a{color:#153e75}.button,button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:12px 18px;border-radius:12px;font:700 15px system-ui;text-decoration:none;background:#ffeb18;color:#06142c;border:0;cursor:pointer}.secondary{background:#edf4ff;margin:8px 0}button:disabled{opacity:.6;cursor:wait}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}.back{display:inline-block;margin-bottom:24px}ol{padding-left:22px}li{margin-bottom:8px}a:focus-visible,button:focus-visible{outline:3px solid #2563eb;outline-offset:4px}.note{font-size:14px}#status{min-height:24px}[hidden]{display:none!important}`;
function html(title, body, app) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ffeb18"><title>${title}</title>${app ? `<script>window.addEventListener('beforeinstallprompt',function(event){window.rebequiInstallPrompt=event;});</script><link rel="manifest" href="/aplicativos/${app.key}/manifest.webmanifest"><link rel="icon" href="/aplicativos/${app.key}/favicon.ico" sizes="32x32 48x48"><link rel="icon" type="image/png" sizes="32x32" href="/aplicativos/${app.key}/icon-v2-32.png">${[152,167,180].map(size => `<link rel="apple-touch-icon" sizes="${size}x${size}" href="/aplicativos/${app.key}/icon-v2-${size}.png">`).join('')}<meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="${app.name}">` : ''}<style>${style}${installStyles}</style></head><body><main>${body}</main></body></html>`;
}

await mkdir('dist/aplicativos', { recursive: true });
await writeFile('dist/aplicativos/index.html', html('Aplicativos Rebequi', `<header><a class="brand" href="/">REBEQUI</a><h1>Escolha seu aplicativo</h1><p>Instale o aplicativo que você usa no dia a dia. Disponível para Android, iPhone e iPad.</p><p class="note">No iPhone/iPad, primeiro escolha um aplicativo abaixo. Use Adicionar à Tela de Início somente na página do aplicativo escolhido.</p></header><div class="grid">${apps.map(app => `<article><img src="/aplicativos/${app.key}/icon-v2-192.png" width="72" height="72" alt=""><h2>${app.name}</h2><p>${app.description}</p><a class="button" href="${app.scope}/instalar/">Instalar ${app.name}</a></article>`).join('')}</div><p class="note">Você pode instalar mais de um aplicativo. Vendas e Entregas exigem acesso autorizado pela loja. A instalação não altera suas permissões.</p><a href="/">Voltar para a loja</a>`));
const entry = await readFile('dist/index.html', 'utf8');
const builder = Buffer.concat([await readFile(new URL(import.meta.url)), await readFile(new URL('./pwa-install-template.mjs', import.meta.url))]);
for (const app of apps) {
  const directory = `dist/aplicativos/${app.key}`;
  await mkdir(directory, { recursive: true });
  const icons = [192, 512].map(size => ({ src: `/aplicativos/${app.key}/icon-v2-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any' }));
  icons.push({ src: `/aplicativos/${app.key}/icon-v2-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' });
  const manifest = { id: app.key === 'entregas' ? app.start : `/aplicativos/${app.key}`, name: app.name, short_name: app.name, description: app.description, lang: 'pt-BR', start_url: app.start, scope: app.scope, display: 'standalone', background_color: '#f5f8fc', theme_color: '#ffeb18', icons };
  await writeFile(`${directory}/manifest.webmanifest`, JSON.stringify(manifest, null, 2));
  // Preserve the already-installed driver's identity and its legacy manifest URL.
  if (app.key === 'entregas') await writeFile('dist/motoristas/manifest.webmanifest', JSON.stringify(manifest, null, 2));
  const offlinePath = app.key === 'entregas' ? '/motoristas/offline.html' : `/aplicativos/${app.key}/offline.html`;
  await writeFile(`dist${offlinePath}`, html(`${app.name} — sem conexão`, `<section class="panel"><h1>Você está sem conexão</h1><p>Conecte-se à internet para acessar ${app.name} e consultar informações atualizadas.</p><a class="button" href="${app.start}">Tentar novamente</a><p class="note">${app.key === 'entregas' ? 'Nenhum recebimento foi registrado por esta tela.' : 'Nenhuma alteração é enviada por esta tela.'}</p></section>`));
  const release = createHash('sha256').update(entry).update(JSON.stringify(manifest)).update(builder).digest('hex').slice(0, 16);
  const cachePrefix = app.key === 'entregas' ? 'rebequi-driver-' : `rebequi-${app.key}-`;
  const worker = `/* Public offline notice only. Never cache API, sessions, pages or mutations. */
const CACHE=${JSON.stringify(cachePrefix + release)},OFFLINE=${JSON.stringify(offlinePath)},SCOPE=${JSON.stringify(app.scope)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.add(new Request(OFFLINE,{cache:'reload',credentials:'omit'})))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(${JSON.stringify(cachePrefix)})&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||event.request.mode!=='navigate'||url.origin!==self.location.origin||!(url.pathname===SCOPE||url.pathname.startsWith(SCOPE+'/')))return;event.respondWith(fetch(event.request).catch(async()=>(await(await caches.open(CACHE)).match(OFFLINE))||new Response('Sem conexão',{status:503})));});
self.addEventListener('message',event=>{if(event.data?.type===${JSON.stringify(app.message)})self.skipWaiting();});`;
  await writeFile(`dist${app.worker}`, worker);
  const installerDirectory = `dist${app.scope}/instalar`;
  await mkdir(installerDirectory, { recursive: true });
  await writeFile(`${installerDirectory}/index.html`, html(app.name, installPage(app), app));
  await writeFile(`${directory}/install.js`, installerScript(app));
}
console.log('Three independent PWAs: customer, seller and deliveries; public offline notices only.');
