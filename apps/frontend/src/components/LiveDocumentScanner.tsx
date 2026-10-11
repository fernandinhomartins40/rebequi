import { useCallback, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { prepareQuotePhoto } from '@/lib/quote-photo';
import { Camera, ImagePlus, Loader2, SwitchCamera, X } from 'lucide-react';
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
  onManualEntry?: () => void;
};

const STABLE_FRAMES_REQUIRED = 4;   // ~1 segundo a 4fps
const COUNTDOWN_SECONDS = 3;
const CORNER_TOLERANCE_PX = 18;
// Variância do Laplaciano: abaixo disso a foto sai tremida/desfocada e o OCR
// devolve lixo — melhor bloquear a captura do que gastar uma chamada de IA.
const MIN_SHARPNESS = 45;
// Média de luminância (0-255). Abaixo disso nem o VLM consegue ler.
const MIN_BRIGHTNESS = 55;
// A cada N frames. O Laplaciano em full HD é caro; a 30fps isso é ~1x/segundo,
// suficiente para avisar o usuário sem competir com a detecção de borda.
const QUALITY_CHECK_EVERY = 4;

// Se o usuário ignora o diálogo de permissão, getUserMedia nunca resolve.
const CAMERA_TIMEOUT_MS = 20_000;
type QualityIssue = 'blurry' | 'dark' | null;

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

export function LiveDocumentScanner({ onCapture, onCancel, onManualEntry }: Props) {
  const webcamRef = useRef<Webcam | null>(null);
  const [preview, setPreview] = useState<ScannedDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const nativeInputRef = useRef<HTMLInputElement | null>(null);
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

  const [status, setStatus] = useState<'loading' | 'ready' | 'detecting' | 'aligning' | 'countdown' | 'capturing' | 'preview' | 'error'>(
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
  const cameraAvailable = ['detecting', 'aligning', 'countdown'].includes(status);

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(null);
  }, []);

  useEffect(() => {
    if (!preview) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(preview.file); setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preview]);

  const showPreview = useCallback((doc: ScannedDocument) => {
    clearCountdown();
    streamRef.current?.getTracks().forEach(track => track.stop());
    setPreview(doc); setErrorMessage(null); setStatus('preview');
  }, [clearCountdown]);

  const captureCurrentFrame = useCallback(async (autoCaptured = false) => {
    if (capturedRef.current) return;
    const video = videoRef.current;
    // O scanner é opcional: sem ele a foto sai sem correção de perspectiva,
    // mas sai. Exigi-lo aqui impedia a captura manual quando o OpenCV falhava.
    const scanner = scannerRef.current as {
      extractPaper: (img: HTMLCanvasElement, w: number, h: number) => HTMLCanvasElement | null;
    } | null;
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setErrorMessage('Aguarde a imagem da câmera ou escolha uma foto.'); return;
    }
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
      if (scanner && autoCaptured && lastCornersRef.current) {
        try {
          const targetW = Math.min(1600, video.videoWidth);
          const corners = lastCornersRef.current;
          const distance = (a: CornerPoint, b: CornerPoint) => Math.hypot(a.x - b.x, a.y - b.y);
          const paperWidth = Math.max(distance(corners.topLeftCorner, corners.topRightCorner), distance(corners.bottomLeftCorner, corners.bottomRightCorner));
          const paperHeight = Math.max(distance(corners.topLeftCorner, corners.bottomLeftCorner), distance(corners.topRightCorner, corners.bottomRightCorner));
          const targetH = Math.min(1800, Math.round(targetW * paperHeight / Math.max(1, paperWidth)));
          warped = scanner.extractPaper(sourceCanvas, targetW, targetH);
        } catch {
          warped = null;
        }
      }
      const finalCanvas = warped ?? sourceCanvas;

      const blob = await new Promise<Blob>((resolve, reject) => finalCanvas.toBlob(value => value ? resolve(value) : reject(new Error('Imagem indisponível')), 'image/jpeg', 0.92));
      const doc = await prepareQuotePhoto(blob);
      showPreview({ ...doc, autoCaptured });
    } catch {
      setErrorMessage('Falha ao capturar. Tente de novo.');
      capturedRef.current = false;
      setStatus('error');
    }
  }, [showPreview]);

  const startCountdown = useCallback(() => {
    if (capturedRef.current || countdownTimerRef.current) return;
    setStatus('countdown');
    setCountdown(COUNTDOWN_SECONDS);
    let remaining = COUNTDOWN_SECONDS;
    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdown();
        void captureCurrentFrame(true);
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

  // react-webcam owns stream cleanup, including permission requests resolved after unmount.
  useEffect(() => {
    if (status !== 'loading') return;
    const timer = window.setTimeout(() => {
      setErrorMessage('A câmera demorou para abrir. Use a câmera do celular ou escolha uma foto.');
      setStatus('error');
    }, CAMERA_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status, facingMode]);

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
  }, []);

  const handleCameraError = (error: string | DOMException) => {
    const name = typeof error === 'string' ? error : error.name;
    setErrorMessage(name === 'NotAllowedError'
      ? 'Permita o acesso à câmera ou escolha uma foto.'
      : window.isSecureContext === false ? 'Abra esta página com HTTPS ou use a câmera do celular.'
      : 'Não foi possível abrir a câmera. Use a câmera do celular ou escolha uma foto.');
    setStatus('error');
  };

  // Carrega OpenCV + jscanify em paralelo. Se falhar ou demorar, a câmera
  // continua utilizável: perde-se a detecção de borda e a captura automática,
  // e o botão manual assume.
  useEffect(() => {
    if (!cameraAvailable) return;
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
  }, [cameraAvailable]);

  // Frame loop — só faz sentido depois que o OpenCV terminou de carregar.
  useEffect(() => {
    if (!detectionReady) return;
    if (status !== 'detecting' && status !== 'aligning' && status !== 'countdown') return;

    let lastFrameAt = 0;
    const tick = (now: number) => {
      if (now - lastFrameAt < 250) { animationRef.current = requestAnimationFrame(tick); return; }
      lastFrameAt = now;
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

      const ratio = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      const w = Math.round(video.videoWidth * ratio);
      const h = Math.round(video.videoHeight * ratio);
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

  const handleFallbackFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.currentTarget.value = '';
    if (!file || capturedRef.current) return;
    capturedRef.current = true; clearCountdown(); setStatus('capturing');
    try { showPreview({ ...await prepareQuotePhoto(file), autoCaptured: false }); }
    catch (error) {
      capturedRef.current = false; setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Escolha outra foto.');
    }
  };

  const retake = () => {
    capturedRef.current = false; setPreview(null); setErrorMessage(null);
    stableFramesRef.current = 0; lastCornersRef.current = null; setStatus('loading');
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
        return 'Preparando foto…';
      case 'error':
        return errorMessage ?? 'Não conseguimos abrir a câmera.';
      default:
        return '';
    }
  })();

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Vídeo */}
      {!['error', 'preview', 'capturing'].includes(status) && <Webcam
        key={facingMode} ref={instance => { webcamRef.current = instance; videoRef.current = instance?.video ?? null; }}
        audio={false} playsInline muted autoPlay mirrored={false} screenshotFormat="image/jpeg"
        videoConstraints={{ facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } }}
        onUserMedia={stream => { streamRef.current = stream; }} onUserMediaError={handleCameraError}
        onLoadedData={() => setStatus(current => current === 'loading' ? 'detecting' : current)}
        className="absolute inset-0 h-full w-full object-contain"
      />}

      {/* Overlay com quadrilátero */}
      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full object-contain" />

      {/* Canvas oculto para amostragem */}
      <canvas ref={sampleRef} className="hidden" />

      {/* Vinheta escura nas bordas para focar atenção */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(0,0,0,0.55)_100%)]" />

      {/* Header */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 px-4 py-4">
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
          className={`min-w-0 flex-1 rounded-full px-2 py-1.5 text-center text-xs font-medium text-white backdrop-blur ${
            qualityIssue && (status === 'detecting' || status === 'aligning')
              ? 'bg-red-500/80'
              : 'bg-black/50'
          }`}
        >
          {helperText}
        </p>
        {onManualEntry ? (
          <button type="button" onClick={onManualEntry}
            className="shrink-0 rounded-full bg-black/60 px-3 py-2 text-sm font-medium text-white backdrop-blur">
            Digitar lista
          </button>
        ) : <div className="w-10" />}
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
            {status === 'loading' ? 'Abrindo a câmera…' : 'Preparando foto…'}
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

      {status === 'preview' && preview && <div className="absolute inset-0 z-40 flex flex-col bg-slate-950 text-white">
        <div className="flex items-center justify-between px-4 py-4"><h1 className="font-bold">Confira a foto</h1><button type="button" onClick={onCancel} aria-label="Cancelar"><X /></button></div>
        <div className="min-h-0 flex-1 px-4">{previewUrl && <img src={previewUrl} alt="Prévia da lista fotografada" className="h-full w-full object-contain" />}</div>
        <div className="space-y-3 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"><p className="text-center text-sm text-white/80">A lista está inteira e legível?</p>
          <Button className="h-12 w-full" onClick={() => onCapture(preview)}>Usar esta foto</Button>
          <Button variant="outline" className="h-11 w-full bg-transparent text-white hover:bg-white/10" onClick={retake}>Tirar outra foto</Button>
        </div>
      </div>}

      {/* Footer: galeria sempre disponível + disparo manual */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-3 px-4 pb-8 pt-6">
        {status === 'error' ? (<div className="flex w-full max-w-sm flex-col gap-3">
          <p role="alert" className="rounded-xl bg-black/80 p-3 text-sm text-white">{errorMessage}</p>
          <Button size="lg" onClick={() => nativeInputRef.current?.click()}><Camera className="mr-2 h-5 w-5" />Usar câmera do celular</Button>
          <Button variant="outline" onClick={retake}>Tentar novamente</Button>
          <Button
            onClick={() => fallbackInputRef.current?.click()}
            size="lg"
            className="rounded-full px-6 shadow-2xl"
          >
            <ImagePlus className="mr-2 h-5 w-5" />
            Escolher foto da galeria
          </Button></div>
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

            {cameraAvailable && <button type="button" aria-label="Trocar câmera" onClick={() => { clearCountdown(); setFacingMode(current => current === 'environment' ? 'user' : 'environment'); setStatus('loading'); }} className="rounded-full bg-white/15 p-3 text-white"><SwitchCamera className="h-5 w-5" /></button>}
            {(status === 'detecting' || status === 'aligning') && detectionReady ? (
              <div className="hidden h-12 shrink-0 items-center gap-2 rounded-full bg-white/15 px-4 text-xs sm:flex text-white backdrop-blur">
                <Camera className="h-4 w-4" />
                Automática
              </div>
            ) : null}
          </>
        )}
      </div>

      <input ref={nativeInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFallbackFile} aria-label="Foto pela câmera do celular" />
      {/* Input fallback */}
      <input
        ref={fallbackInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFallbackFile}
        aria-label="Escolher foto da galeria"
        title="Escolher foto da galeria"
      />
    </div>
  );
}
