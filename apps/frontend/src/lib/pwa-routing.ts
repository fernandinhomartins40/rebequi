import apps from '../../pwa-apps.json';

export { apps as pwaApps };

// Reuse every existing route and permission guard under independent app prefixes.
export function getAppBasePath(pathname = window.location.pathname) {
  return [...apps.map(app => app.scope), '/loja'].find(base => pathname === base || pathname.startsWith(`${base}/`)) || '';
}

export function withAppBasePath(path: string) {
  return path.startsWith('/') && !path.startsWith('//') ? `${getAppBasePath()}${path}` : path;
}

export const activePwa = apps.find(app => app.scope === getAppBasePath());
