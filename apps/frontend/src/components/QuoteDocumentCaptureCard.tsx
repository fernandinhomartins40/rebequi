import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, RefreshCcw, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type QuoteDocumentSelection = {
  file: File;
  width?: number;
  height?: number;
  captureMode: 'camera' | 'upload';
  autoCropped?: boolean;
  autoCaptured?: boolean;
};

type QuoteDocumentCaptureCardProps = {
  helper?: string;
  processing?: boolean;
  buttonLabel?: string;
  disabled?: boolean;
  onSelectFile: (selection: QuoteDocumentSelection) => Promise<void> | void;
};

type PreviewState = {
  url: string;
  fileName: string;
  width: number;
  height: number;
  fileSize: number;
  captureMode: 'camera' | 'upload';
};

// ─── Main component ───────────────────────────────────────────────────────────

export function QuoteDocumentCaptureCard({
  helper,
  processing = false,
  buttonLabel = 'Enviar imagem',
  disabled = false,
  onSelectFile,
}: QuoteDocumentCaptureCardProps) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [activeMode, setActiveMode] = useState<'camera' | 'upload' | null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const busy = disabled || processing || localBusy;

  const handleSelectedFile = useCallback(async (rawFile: File, mode: 'camera' | 'upload') => {
    if (busy) return;
    setActiveMode(mode);
    setLocalBusy(true);
    setLocalError(null);

    try {
      const normalized = await normalizeSelectedImage(rawFile);

      updatePreview(setPreview, {
        url: normalized.previewUrl,
        fileName: normalized.file.name,
        width: normalized.width,
        height: normalized.height,
        fileSize: normalized.file.size,
        captureMode: mode,
      });

      await onSelectFile({
        file: normalized.file,
        width: normalized.width,
        height: normalized.height,
        captureMode: mode,
        autoCropped: false,
        autoCaptured: mode === 'camera',
      });
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : 'Não foi possível preparar a imagem. Tente novamente com uma foto mais nítida.'
      );
    } finally {
      setLocalBusy(false);
      setActiveMode(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, onSelectFile]);

  const handleCameraClick = () => {
    if (busy) return;
    // Desktop: usar getUserMedia. Mobile sem suporte: cair no input capture.
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      setShowWebcam(true);
    } else {
      cameraInputRef.current?.click();
    }
  };

  return (
    <>
      <div className="space-y-3">
        {/* Botões de ação */}
        <div className="flex gap-2">
          <Button
            type="button"
            className="flex-1 gap-2"
            onClick={handleCameraClick}
            disabled={busy}
          >
            {localBusy && activeMode === 'camera'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Camera className="h-4 w-4" />}
            Abrir câmera
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 gap-2 border-slate-200 bg-white"
            onClick={() => { if (!busy) uploadInputRef.current?.click(); }}
            disabled={busy}
          >
            {localBusy && activeMode === 'upload'
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ImagePlus className="h-4 w-4" />}
            Escolher da galeria
          </Button>
        </div>

        {/* Preview */}
        {preview ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200/70 bg-white p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-100 bg-slate-50">
              <img src={preview.url} alt="Documento selecionado" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{preview.fileName}</p>
              <p className="text-xs text-muted-foreground">
                {preview.width}×{preview.height}px · {formatBytes(preview.fileSize)}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={() => { if (!busy) uploadInputRef.current?.click(); }}
              disabled={busy}
              aria-label="Trocar imagem"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}

        {/* Dica / erro */}
        {(localError || helper) ? (
          <div
            className={cn(
              'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
              localError
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-slate-200/70 bg-slate-50 text-muted-foreground',
            )}
          >
            {localError
              ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
            <p className="leading-snug">{localError || helper}</p>
          </div>
        ) : null}

        {/* Input galeria */}
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void handleSelectedFile(file, 'upload');
            event.currentTarget.value = '';
          }}
        />

        {/* Input câmera — fallback mobile sem getUserMedia */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void handleSelectedFile(file, 'camera');
            event.currentTarget.value = '';
          }}
        />
      </div>

      {/* Modal de câmera via getUserMedia */}
      {showWebcam ? (
        <WebcamModal
          onCapture={(file) => {
            setShowWebcam(false);
            void handleSelectedFile(file, 'camera');
          }}
          onClose={() => setShowWebcam(false)}
          onError={(msg) => {
            setShowWebcam(false);
            // Se getUserMedia falhar (ex: permissão negada), cai no input capture
            if (msg === 'PERMISSION_DENIED') {
              setLocalError('Permissão de câmera negada. Use "Escolher da galeria" ou libere o acesso nas configurações do navegador.');
            } else if (msg === 'NOT_FOUND') {
              // Sem câmera no dispositivo
              setLocalError('Nenhuma câmera encontrada neste dispositivo.');
            } else {
              cameraInputRef.current?.click();
            }
          }}
        />
      ) : null}
    </>
  );
}

// ─── Webcam modal ─────────────────────────────────────────────────────────────

function WebcamModal({
  onCapture,
  onClose,
  onError,
}: {
  onCapture: (file: File) => void;
  onClose: () => void;
  onError: (reason: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          onError('PERMISSION_DENIED');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          onError('NOT_FOUND');
        } else {
          onError('UNKNOWN');
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !ready || capturing) return;
    setCapturing(true);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setCapturing(false); return; }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) { setCapturing(false); return; }
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onCapture(file);
      },
      'image/jpeg',
      0.92,
    );
  };

  // Fechar com Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-black shadow-2xl">
        {/* Barra superior */}
        <div className="flex items-center justify-between bg-black/60 px-4 py-3">
          <p className="text-sm font-medium text-white">Câmera</p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Viewfinder */}
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            onCanPlay={() => setReady(true)}
          />
          {!ready ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
            </div>
          ) : null}
        </div>

        {/* Botão de captura */}
        <div className="flex justify-center bg-black/60 py-5">
          <button
            type="button"
            onClick={handleCapture}
            disabled={!ready || capturing}
            aria-label="Capturar foto"
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full border-4 border-white transition',
              ready && !capturing
                ? 'bg-white hover:bg-white/90 active:scale-95'
                : 'bg-white/30',
            )}
          >
            {capturing
              ? <Loader2 className="h-6 w-6 animate-spin text-black/60" />
              : <div className="h-10 w-10 rounded-full bg-white ring-2 ring-black/20" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function normalizeSelectedImage(rawFile: File) {
  const { default: imageCompression } = await import('browser-image-compression');
  const compressed = await imageCompression(rawFile, {
    maxSizeMB: 2.5,
    maxWidthOrHeight: 2200,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.9,
  });
  const normalizedFile = new File([compressed], buildNormalizedFilename(rawFile.name), {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
  const dimensions = await readImageDimensions(normalizedFile);
  const previewUrl = URL.createObjectURL(normalizedFile);

  return { file: normalizedFile, width: dimensions.width, height: dimensions.height, previewUrl };
}

function buildNormalizedFilename(originalName: string) {
  const baseName = stripFileExtension(originalName) || 'orcamento';
  return `${baseName}-${Date.now()}.jpg`;
}

function readImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Não foi possível abrir a imagem selecionada.'));
    };

    image.src = objectUrl;
  });
}

function stripFileExtension(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, '');
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function updatePreview(setPreview: Dispatch<SetStateAction<PreviewState | null>>, nextPreview: PreviewState) {
  setPreview((currentPreview) => {
    if (currentPreview) URL.revokeObjectURL(currentPreview.url);
    return nextPreview;
  });
}
