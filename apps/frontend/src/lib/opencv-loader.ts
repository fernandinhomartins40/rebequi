/**
 * Lazy loader for OpenCV.js (peer dependency of jscanify).
 *
 * Loads from CDN on demand and resolves once `cv` is fully initialized.
 * Caches the promise so multiple components share a single load.
 */

const OPENCV_URL = 'https://docs.opencv.org/4.8.0/opencv.js';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cv: any;
  }
}

let cvPromise: Promise<unknown> | null = null;

export function loadOpenCv(): Promise<unknown> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OpenCV only loads in the browser.'));
  }

  if (cvPromise) return cvPromise;

  cvPromise = new Promise((resolve, reject) => {
    if (window.cv && typeof window.cv.imread === 'function') {
      resolve(window.cv);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(`script[data-opencv]`);
    if (!existing) {
      const script = document.createElement('script');
      script.src = OPENCV_URL;
      script.async = true;
      script.dataset.opencv = 'true';
      script.onerror = () => reject(new Error('Falha ao carregar OpenCV.js.'));
      document.head.appendChild(script);
    }

    const start = Date.now();
    const timer = window.setInterval(() => {
      if (window.cv && typeof window.cv.imread === 'function') {
        window.clearInterval(timer);
        resolve(window.cv);
      } else if (Date.now() - start > 30_000) {
        window.clearInterval(timer);
        reject(new Error('OpenCV demorou demais para carregar.'));
      }
    }, 120);
  });

  return cvPromise;
}
