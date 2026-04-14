import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, RefreshCcw, XCircle } from 'lucide-react';
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

export function QuoteDocumentCaptureCard({
  helper,
  processing = false,
  buttonLabel = 'Enviar imagem',
  disabled = false,
  onSelectFile,
}: QuoteDocumentCaptureCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pendingMode, setPendingMode] = useState<'camera' | 'upload'>('camera');
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);

  const busy = disabled || processing || localBusy;

  const openPicker = (mode: 'camera' | 'upload') => {
    if (busy) return;
    setPendingMode(mode);
    setLocalError(null);
    inputRef.current?.click();
  };

  const handleSelectedFile = async (rawFile: File) => {
    if (busy) return;
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
        captureMode: pendingMode,
      });

      await onSelectFile({
        file: normalized.file,
        width: normalized.width,
        height: normalized.height,
        captureMode: pendingMode,
        autoCropped: false,
        autoCaptured: pendingMode === 'camera',
      });
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : 'Não foi possível preparar a imagem. Tente novamente com uma foto mais nítida.'
      );
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Botões de ação — destaque principal */}
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1 gap-2"
          onClick={() => openPicker('camera')}
          disabled={busy}
        >
          {busy && pendingMode === 'camera'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Camera className="h-4 w-4" />}
          Abrir câmera
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 gap-2 border-slate-200 bg-white"
          onClick={() => openPicker('upload')}
          disabled={busy}
        >
          {busy && pendingMode === 'upload'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <ImagePlus className="h-4 w-4" />}
          Escolher da galeria
        </Button>
      </div>

      {/* Preview da imagem selecionada */}
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
            onClick={() => openPicker('upload')}
            disabled={busy}
            aria-label="Trocar imagem"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : null}

      {/* Dica / erro */}
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
        <p className="leading-snug">
          {localError || helper || `Após selecionar, avançamos para ${buttonLabel}.`}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={pendingMode === 'camera' ? 'environment' : undefined}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void handleSelectedFile(file);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}

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
