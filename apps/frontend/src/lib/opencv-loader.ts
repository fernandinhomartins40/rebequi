/**
 * Lazy loader for OpenCV.js (peer dependency of jscanify).
 *
 * Loads from CDN on demand and resolves once `cv` is fully initialized.
 * Caches the promise so multiple components share a single load.
 */

/**
 * Servido pelo próprio domínio (public/vendor). São ~10MB: buscar isso de um
 * CDN de terceiro deixava o scanner refém da rede alheia, sem cache sob nosso
 * controle e sem funcionar offline.
 */
const OPENCV_LOCAL_URL = '/vendor/opencv-4.8.0.js';
/** Só entra em cena se o asset local falhar (deploy incompleto, por exemplo). */
const OPENCV_CDN_URL = 'https://docs.opencv.org/4.8.0/opencv.js';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cv: any;
  }
}

/**
 * O bundle tem ~9MB. Em 4G isso pode passar de 60s, então o timeout é
 * generoso — quem chama deve tratar a demora carregando em segundo plano,
 * nunca bloqueando a abertura da câmera.
 */
const LOAD_TIMEOUT_MS = 90_000;

let cvPromise: Promise<unknown> | null = null;

export function loadOpenCv(): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OpenCV só carrega no navegador.'));
  }

  if (cvPromise) return cvPromise;

  cvPromise = new Promise((resolve, reject) => {
    if (window.cv && typeof window.cv.imread === 'function') {
      resolve(window.cv);
      return;
    }

    let settled = false;
    let timer: number | undefined;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (timer) window.clearInterval(timer);
      fn();
    };

    const fail = (message: string) => {
      finish(() => {
        // Sem isso, a promise rejeitada fica no cache e TODA tentativa
        // posterior falha na hora, sem nem tentar baixar de novo.
        cvPromise = null;
        document.querySelector('script[data-opencv]')?.remove();
        reject(new Error(message));
      });
    };

    const injectScript = (src: string, onError: () => void) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.opencv = 'true';
      script.onerror = onError;
      document.head.appendChild(script);
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-opencv]');
    if (!existing) {
      injectScript(OPENCV_LOCAL_URL, () => {
        // Asset local indisponível: tenta o CDN antes de desistir.
        document.querySelector('script[data-opencv]')?.remove();
        injectScript(OPENCV_CDN_URL, () => fail('Falha ao carregar OpenCV.js.'));
      });
    }

    const start = Date.now();
    timer = window.setInterval(() => {
      if (window.cv && typeof window.cv.imread === 'function') {
        finish(() => resolve(window.cv));
      } else if (Date.now() - start > LOAD_TIMEOUT_MS) {
        fail('OpenCV demorou demais para carregar.');
      }
    }, 120);
  });

  return cvPromise;
}
