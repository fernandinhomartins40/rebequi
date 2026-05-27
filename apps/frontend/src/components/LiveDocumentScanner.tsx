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
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);

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
    const scanner = scannerRef.current as {
      extractPaper: (img: HTMLCanvasElement, w: number, h: number) => HTMLCanvasElement | null;
    } | null;
    if (!video || !scanner) return;
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
      const targetW = Math.min(1600, video.videoWidth);
      const targetH = Math.round((targetW * 297) / 210); // A4 ratio
      const warped = scanner.extractPaper(sourceCanvas, targetW, targetH);
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

  // Setup loop: load opencv + jscanify + camera, then start RAF
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await loadOpenCv();
        const jscanifyModule = await import('jscanify/client');
        const Scanner = (jscanifyModule as { default: new () => unknown }).default;
        scannerRef.current = new Scanner();

        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('NO_GETUSERMEDIA');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setStatus('detecting');
      } catch (error) {
        if (cancelled) return;
        const code = error instanceof Error ? error.message : '';
        if (code === 'NO_GETUSERMEDIA' || (error as { name?: string })?.name === 'NotAllowedError') {
          setErrorMessage('Não conseguimos abrir a câmera. Use o botão para escolher uma foto.');
        } else {
          setErrorMessage('Falha ao iniciar o scanner. Use o botão para escolher uma foto.');
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

  // Frame loop
  useEffect(() => {
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
        contour = scanner.findPaperContour(img);

        if (contour) {
          const corners = scanner.getCornerPoints(contour);
          if (
            corners.topLeftCorner &&
            corners.topRightCorner &&
            corners.bottomLeftCorner &&
            corners.bottomRightCorner
          ) {
            // Desenha quadrilátero
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
  }, [status, cornersAreStable, startCountdown, clearCountdown]);

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
    switch (status) {
      case 'loading':
        return 'Preparando câmera…';
      case 'detecting':
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
        <p className="rounded-full bg-black/50 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
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
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p className="text-base font-medium">{status === 'loading' ? 'Preparando câmera…' : 'Lendo sua lista…'}</p>
        </div>
      ) : null}

      {/* Footer com bot[ão de galeria sempre disponível */}
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
          <button
            type="button"
            onClick={() => fallbackInputRef.current?.click()}
            className="flex h-12 items-center gap-2 rounded-full bg-white/15 px-5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25"
          >
            <ImagePlus className="h-4 w-4" />
            Já tenho a foto
          </button>
        )}
        {status === 'detecting' || status === 'aligning' ? (
          <div className="flex h-12 items-center gap-2 rounded-full bg-white/15 px-4 text-sm text-white backdrop-blur">
            <Camera className="h-4 w-4" />
            Captura automática
          </div>
        ) : null}
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
