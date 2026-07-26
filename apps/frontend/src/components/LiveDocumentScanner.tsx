import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { loadOpenCv } from '@/lib/opencv-loader';

type CornerPoint = { x: number; y: number };
type Corners = {
  topLeftCorner: CornerPoint;
  topRightCorner: CornerPoint;
  bottomLeftCorner: CornerPoint;
  bottomRightCorner: CornerPoint;
};

export type ScannedDocument = {
  file: File;
  width: number;
  height: number;
  autoCaptured: boolean;
};

type Props = {
  onCapture: (doc: ScannedDocument) => void;
  onCancel: () => void;
};

const STABLE_FRAMES_REQUIRED = 18;   // ~600ms a 30fps
const COUNTDOWN_SECONDS = 3;
const CORNER_TOLERANCE_PX = 18;
// Variância do Laplaciano: abaixo disso a foto sai tremida/desfocada e o OCR
// devolve lixo — melhor bloquear a captura do que gastar uma chamada de IA.
const MIN_SHARPNESS = 45;
// Média de luminância (0-255). Abaixo disso nem o VLM consegue ler.
const MIN_BRIGHTNESS = 55;
// A cada N frames. O Laplaciano em full HD é caro; a 30fps isso é ~1x/segundo,
// suficiente para avisar o usuário sem competir com a detecção de borda.
const QUALITY_CHECK_EVERY = 30;

// Se o usuário ignora o diálogo de permissão, getUserMedia nunca resolve.
const CAMERA_TIMEOUT_MS = 20_000;
// Tempo para o vídeo reportar dimensão real depois de receber o stream.
const VIDEO_READY_TIMEOUT_MS = 10_000;

type QualityIssue = 'blurry' | 'dark' | null;

/** Rejeita com `code` se a promise não resolver dentro do prazo. */
function withTimeout<T>(promise: Promise<T>, ms: number, code: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(code)), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Espera o vídeo ter dimensão real.
 *
 * `play()` no iOS pode nunca resolver, então usar seu retorno como sinal de
 * pronto trava a tela. `videoWidth > 0` é o sinal confiável de que há imagem.
 */
function waitForVideoReady(video: HTMLVideoElement, timeoutMs: number): Promise<void> {
  if (video.videoWidth > 0) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (video.videoWidth > 0) {
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error('VIDEO_TIMEOUT'));
        return;
      }
      window.setTimeout(check, 100);
    };
    check();
  });
}

/**
 * Mede nitidez e luminância do frame usando o OpenCV que já está carregado.
 * Retorna null quando a medição falha, para nunca bloquear a captura por erro
 * da própria checagem.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function measureFrameQuality(cv: any, src: any): { sharpness: number; brightness: number } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let gray: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let laplacian: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mean: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stddev: any = null;

  try {
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    const brightnessMean = new cv.Mat();
    const brightnessStd = new cv.Mat();
    cv.meanStdDev(gray, brightnessMean, brightnessStd);
    const brightness = brightnessMean.doubleAt(0, 0);
    brightnessMean.delete();
    brightnessStd.delete();

    laplacian = new cv.Mat();
    cv.Laplacian(gray, laplacian, cv.CV_64F);
    mean = new cv.Mat();
    stddev = new cv.Mat();
    cv.meanStdDev(laplacian, mean, stddev);
    const sd = stddev.doubleAt(0, 0);

    return { sharpness: sd * sd, brightness };
  } catch {
    return null;
  } finally {
    gray?.delete?.();
    laplacian?.delete?.();
    mean?.delete?.();
    stddev?.delete?.();
  }
}

export function LiveDocumentScanner({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const sampleRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const stableFramesRef = useRef(0);
  const lastCornersRef = useRef<Corners | null>(null);
  const scannerRef = useRef<unknown>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const capturedRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'ready' | 'detecting' | 'aligning' | 'countdown' | 'capturing' | 'error'>(
    'loading'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [qualityIssue, setQualityIssue] = useState<QualityIssue>(null);
  // Detecção de borda + captura automática dependem do OpenCV, que carrega
  // depois da câmera. Enquanto isso o scanner opera em modo manual.
  const [detectionReady, setDetectionReady] = useState(false);
  const [detectionFailed, setDetectionFailed] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);
  const frameCounterRef = useRef(0);
  const qualityIssueRef = useRef<QualityIssue>(null);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  const captureCurrentFrame = useCallback(async () => {
    if (capturedRef.current) return;
    const video = videoRef.current;
    // O scanner é opcional: sem ele a foto sai sem correção de perspectiva,
    // mas sai. Exigi-lo aqui impedia a captura manual quando o OpenCV falhava.
    const scanner = scannerRef.current as {
      extractPaper: (img: HTMLCanvasElement, w: number, h: number) => HTMLCanvasElement | null;
    } | null;
    if (!video || video.videoWidth === 0) return;
    capturedRef.current = true;
    setStatus('capturing');

    try {
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = video.videoWidth;
      sourceCanvas.height = video.videoHeight;
      const ctx = sourceCanvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível');
      ctx.drawImage(video, 0, 0);

      // Tenta extração com correção de perspectiva. Se falhar, usa frame inteiro.
      let warped: HTMLCanvasElement | null = null;
      if (scanner) {
        try {
          const targetW = Math.min(1600, video.videoWidth);
          const targetH = Math.round((targetW * 297) / 210); // A4 ratio
          warped = scanner.extractPaper(sourceCanvas, targetW, targetH);
        } catch {
          warped = null;
        }
      }
      const finalCanvas = warped ?? sourceCanvas;

      finalCanvas.toBlob(
        (blob) => {
          if (!blob) {
            setErrorMessage('Não foi possível gerar a imagem. Tente de novo.');
            capturedRef.current = false;
            setStatus('detecting');
            return;
          }
          const file = new File([blob], `lista-${Date.now()}.jpg`, { type: 'image/jpeg' });
          streamRef.current?.getTracks().forEach((track) => track.stop());
          onCapture({
            file,
            width: finalCanvas.width,
            height: finalCanvas.height,
            autoCaptured: true,
          });
        },
        'image/jpeg',
        0.92
      );
    } catch {
      setErrorMessage('Falha ao capturar. Tente de novo.');
      capturedRef.current = false;
      setStatus('detecting');
    }
  }, [onCapture]);

  const startCountdown = useCallback(() => {
    if (capturedRef.current || countdownTimerRef.current) return;
    setStatus('countdown');
    setCountdown(COUNTDOWN_SECONDS);
    let remaining = COUNTDOWN_SECONDS;
    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdown();
        void captureCurrentFrame();
      } else {
        setCountdown(remaining);
      }
    }, 1000);
  }, [captureCurrentFrame, clearCountdown]);

  const cornersAreStable = useCallback((current: Corners | null) => {
    if (!current) return false;
    const prev = lastCornersRef.current;
    if (!prev) return false;
    const keys: (keyof Corners)[] = ['topLeftCorner', 'topRightCorner', 'bottomLeftCorner', 'bottomRightCorner'];
    return keys.every((key) => {
      const a = prev[key];
      const b = current[key];
      return Math.hypot(a.x - b.x, a.y - b.y) < CORNER_TOLERANCE_PX;
    });
  }, []);

  // Abre a câmera. O OpenCV NÃO entra neste caminho: ele pesa ~9MB e, quando
  // era aguardado antes do getUserMedia, o celular ficava preso em "Preparando
  // câmera…" por dezenas de segundos em 4G. Ele só serve para desenhar a borda
  // e fazer a captura automática, então carrega em paralelo (efeito abaixo) e
  // o scanner funciona em modo manual enquanto isso.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('NO_GETUSERMEDIA');
        }

        // Sem timeout, ignorar o diálogo de permissão pendura para sempre.
        const stream = await withTimeout(
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          }),
          CAMERA_TIMEOUT_MS,
          'CAMERA_TIMEOUT'
        );

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;

        if (video) {
          video.srcObject = stream;
          // No iOS, play() pode nunca resolver nem rejeitar. Como o autoplay
          // já está declarado no elemento, tratamos a promise como best-effort
          // e seguimos assim que o vídeo tiver dimensão real.
          void video.play().catch(() => undefined);
          await waitForVideoReady(video, VIDEO_READY_TIMEOUT_MS);
        }

        if (cancelled) return;
        setStatus('detecting');
      } catch (error) {
        if (cancelled) return;

        const name = (error as { name?: string })?.name ?? '';
        const code = error instanceof Error ? error.message : '';

        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMessage(
            'Você precisa permitir o acesso à câmera. Libere nas configurações do navegador ou escolha uma foto da galeria.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMessage('Nenhuma câmera encontrada neste aparelho. Escolha uma foto da galeria.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setErrorMessage(
            'A câmera está sendo usada por outro aplicativo. Feche-o e tente de novo, ou escolha uma foto.'
          );
        } else if (code === 'NO_GETUSERMEDIA') {
          // Navegador antigo ou página servida em HTTP: getUserMedia exige HTTPS.
          setErrorMessage(
            window.isSecureContext === false
              ? 'A câmera só funciona em conexão segura (https). Escolha uma foto da galeria.'
              : 'Este navegador não permite abrir a câmera. Escolha uma foto da galeria.'
          );
        } else if (code === 'CAMERA_TIMEOUT' || code === 'VIDEO_TIMEOUT') {
          setErrorMessage('A câmera demorou demais para responder. Tente de novo ou escolha uma foto.');
        } else {
          setErrorMessage('Falha ao iniciar a câmera. Escolha uma foto da galeria.');
        }

        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Carrega OpenCV + jscanify em paralelo. Se falhar ou demorar, a câmera
  // continua utilizável: perde-se a detecção de borda e a captura automática,
  // e o botão manual assume.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadOpenCv();
        const jscanifyModule = await import('jscanify/client');
        if (cancelled) return;
        const Scanner = (jscanifyModule as { default: new () => unknown }).default;
        scannerRef.current = new Scanner();
        setDetectionReady(true);
      } catch {
        if (cancelled) return;
        // Modo manual: sem overlay, mas o usuário ainda tira a foto.
        setDetectionReady(false);
        setDetectionFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Frame loop — só faz sentido depois que o OpenCV terminou de carregar.
  useEffect(() => {
    if (!detectionReady) return;
    if (status !== 'detecting' && status !== 'aligning' && status !== 'countdown') return;

    const tick = () => {
      const video = videoRef.current;
      const overlay = overlayRef.current;
      const sample = sampleRef.current;
      const scanner = scannerRef.current as {
        findPaperContour: (mat: unknown) => unknown;
        getCornerPoints: (contour: unknown) => Corners;
      } | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cv = (window as any).cv;

      if (!video || !overlay || !sample || !scanner || !cv || video.videoWidth === 0) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (overlay.width !== w) {
        overlay.width = w;
        overlay.height = h;
        sample.width = w;
        sample.height = h;
      }

      const sampleCtx = sample.getContext('2d');
      const overlayCtx = overlay.getContext('2d');
      if (!sampleCtx || !overlayCtx) {
        animationRef.current = requestAnimationFrame(tick);
        return;
      }
      sampleCtx.drawImage(video, 0, 0, w, h);
      overlayCtx.clearRect(0, 0, w, h);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let img: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let contour: any = null;
      try {
        img = cv.imread(sample);

        // Aviso de qualidade é secundário: roda raramente porque o Laplaciano
        // em full HD aloca várias Mat e pesa no celular. A detecção de borda
        // tem prioridade sobre ele.
        frameCounterRef.current += 1;
        if (frameCounterRef.current % QUALITY_CHECK_EVERY === 0) {
          const quality = measureFrameQuality(cv, img);
          if (quality) {
            const issue: QualityIssue =
              quality.brightness < MIN_BRIGHTNESS
                ? 'dark'
                : quality.sharpness < MIN_SHARPNESS
                  ? 'blurry'
                  : null;

            if (issue !== qualityIssueRef.current) {
              qualityIssueRef.current = issue;
              setQualityIssue(issue);
            }
          }
        }

        contour = scanner.findPaperContour(img);

        if (contour) {
          const corners = scanner.getCornerPoints(contour);
          if (
            corners.topLeftCorner &&
            corners.topRightCorner &&
            corners.bottomLeftCorner &&
            corners.bottomRightCorner
          ) {
            // A qualidade é apenas informativa: orienta o usuário ("está
            // tremido", "está escuro") mas NUNCA impede a captura.
            //
            // Antes ela entrava em `isStable` e bloqueava o disparo automático.
            // Como os limiares são medidos no frame inteiro — que inclui mesa,
            // mão e fundo, quase sempre menos nítidos que o papel — a captura
            // simplesmente parava de acontecer. Travar o fluxo principal com
            // uma heurística não calibrada custa mais do que a foto ruim que
            // ela evitaria; quem decide é o usuário, que vê o aviso.
            const isStable = cornersAreStable(corners);
            overlayCtx.strokeStyle = isStable ? '#22c55e' : '#fbbf24';
            overlayCtx.lineWidth = 8;
            overlayCtx.beginPath();
            overlayCtx.moveTo(corners.topLeftCorner.x, corners.topLeftCorner.y);
            overlayCtx.lineTo(corners.topRightCorner.x, corners.topRightCorner.y);
            overlayCtx.lineTo(corners.bottomRightCorner.x, corners.bottomRightCorner.y);
            overlayCtx.lineTo(corners.bottomLeftCorner.x, corners.bottomLeftCorner.y);
            overlayCtx.closePath();
            overlayCtx.stroke();

            if (isStable) {
              stableFramesRef.current += 1;
              setStatus((current) => (current === 'detecting' ? 'aligning' : current));
              if (stableFramesRef.current >= STABLE_FRAMES_REQUIRED) {
                stableFramesRef.current = 0;
                startCountdown();
              }
            } else {
              stableFramesRef.current = 0;
              clearCountdown();
              setStatus((current) => (current === 'aligning' || current === 'countdown' ? 'detecting' : current));
            }
            lastCornersRef.current = corners;
          }
        } else {
          stableFramesRef.current = 0;
          lastCornersRef.current = null;
          clearCountdown();
          setStatus((current) => (current === 'aligning' || current === 'countdown' ? 'detecting' : current));
        }
      } catch {
        // ignore frame
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (contour && (contour as any).delete) (contour as any).delete();
        if (img) img.delete?.();
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [status, detectionReady, cornersAreStable, startCountdown, clearCountdown]);

  const handleFallbackFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    capturedRef.current = true;
    const img = new Image();
    img.onload = () => {
      onCapture({
        file,
        width: img.naturalWidth || 1000,
        height: img.naturalHeight || 1000,
        autoCaptured: false,
      });
    };
    img.src = URL.createObjectURL(file);
    event.currentTarget.value = '';
  };

  const helperText = (() => {
    // Orientação de qualidade tem prioridade: é acionável agora.
    if (qualityIssue && (status === 'detecting' || status === 'aligning')) {
      return qualityIssue === 'dark'
        ? 'Está escuro — procure mais luz'
        : 'Segure firme, está tremido';
    }

    switch (status) {
      case 'loading':
        return 'Abrindo a câmera…';
      case 'detecting':
        // Sem OpenCV não há detecção de borda; o usuário aperta o botão.
        if (detectionFailed) return 'Enquadre a lista e toque no botão';
        if (!detectionReady) return 'Enquadre sua lista — preparando captura automática';
        return 'Enquadre sua lista dentro do quadro';
      case 'aligning':
        return 'Segure firme…';
      case 'countdown':
        return countdown ? `Capturando em ${countdown}…` : 'Capturando…';
      case 'capturing':
        return 'Lendo sua lista…';
      case 'error':
        return errorMessage ?? 'Não conseguimos abrir a câmera.';
      default:
        return '';
    }
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Vídeo */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay com quadrilátero */}
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />

      {/* Canvas oculto para amostragem */}
      <canvas ref={sampleRef} className="hidden" />

      {/* Vinheta escura nas bordas para focar atenção */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(0,0,0,0.55)_100%)]" />

      {/* Header */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4">
        <button
          type="button"
          onClick={() => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            onCancel();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
          aria-label="Cancelar"
        >
          <X className="h-5 w-5" />
        </button>
        <p
          className={`rounded-full px-4 py-1.5 text-sm font-medium text-white backdrop-blur ${
            qualityIssue && (status === 'detecting' || status === 'aligning')
              ? 'bg-red-500/80'
              : 'bg-black/50'
          }`}
        >
          {helperText}
        </p>
        <div className="w-10" />
      </div>

      {/* Countdown gigante */}
      {countdown !== null ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <span className="text-[14rem] font-black leading-none text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
            {countdown}
          </span>
        </div>
      ) : null}

      {/* Loading inicial / capturing */}
      {status === 'loading' || status === 'capturing' ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 px-8 text-white">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-base font-medium">
            {status === 'loading' ? 'Abrindo a câmera…' : 'Lendo sua lista…'}
          </p>
          {status === 'loading' ? (
            <p className="text-center text-sm text-white/70">
              Se aparecer um aviso pedindo permissão, toque em “Permitir”.
            </p>
          ) : null}
          {status === 'loading' ? (
            <button
              type="button"
              onClick={() => fallbackInputRef.current?.click()}
              className="mt-4 rounded-full bg-white/15 px-5 py-2.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
            >
              Escolher foto da galeria
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Footer: galeria sempre disponível + disparo manual */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-3 px-4 pb-8 pt-6">
        {status === 'error' ? (
          <Button
            onClick={() => fallbackInputRef.current?.click()}
            size="lg"
            className="rounded-full px-6 shadow-2xl"
          >
            <ImagePlus className="mr-2 h-5 w-5" />
            Escolher foto da galeria
          </Button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => fallbackInputRef.current?.click()}
              className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
            >
              <ImagePlus className="h-4 w-4" />
              Galeria
            </button>

            {/* Disparo manual sempre presente: a captura automática depende do
                OpenCV, que pode demorar ou falhar. Sem este botão o usuário
                ficava sem nenhuma forma de tirar a foto. */}
            {status === 'detecting' || status === 'aligning' || status === 'countdown' ? (
              <button
                type="button"
                onClick={() => void captureCurrentFrame()}
                aria-label="Tirar foto"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white/90 transition active:scale-95"
              >
                <span className="h-11 w-11 rounded-full bg-white ring-2 ring-black/20" />
              </button>
            ) : null}

            {(status === 'detecting' || status === 'aligning') && detectionReady ? (
              <div className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 text-xs text-white backdrop-blur">
                <Camera className="h-4 w-4" />
                Automática
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* Input fallback */}
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFallbackFile}
        aria-label="Escolher foto da galeria"
        title="Escolher foto da galeria"
      />
    </div>
  );
}
