import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Camera, CheckCircle2, ImagePlus, Loader2, RefreshCcw, Smartphone, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type QuoteDocumentSelection = {
  file: File;
  width?: number;
  height?: number;
  captureMode: 'camera' | 'upload';
  autoCropped?: boolean;
  autoCaptured?: boolean;
};

type QuoteDocumentCaptureCardProps = {
  title: string;
  description: string;
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
  title,
  description,
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
      if (preview) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  const busy = disabled || processing || localBusy;

  const openPicker = (mode: 'camera' | 'upload') => {
    if (busy) {
      return;
    }

    setPendingMode(mode);
    setLocalError(null);
    inputRef.current?.click();
  };

  const handleSelectedFile = async (rawFile: File) => {
    if (busy) {
      return;
    }

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
          : 'Nao foi possivel preparar a imagem do pedido. Tente novamente com uma foto mais nitida.'
      );
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Smartphone className="h-4 w-4" />
          Captura nativa
        </div>
        <div>
          <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
          <CardDescription className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-[1.75rem] border border-[#e7dcc3] bg-[linear-gradient(135deg,#fffef9_0%,#f8fafc_100%)] p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                <Camera className="h-4 w-4" />
                Camera do aparelho
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Uma foto simples do pedido</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  O sistema agora usa a camera nativa do aparelho ou a galeria, sem scanner ao vivo dentro da pagina.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button type="button" onClick={() => openPicker('camera')} disabled={busy} className="gap-2">
                {busy && pendingMode === 'camera' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Abrir camera
              </Button>
              <Button type="button" variant="outline" onClick={() => openPicker('upload')} disabled={busy} className="gap-2">
                {busy && pendingMode === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Escolher imagem
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">Menos travamentos</Badge>
            <Badge variant="secondary">Usa a camera do sistema</Badge>
            <Badge variant="secondary">Upload leve para OCR</Badge>
          </div>
        </div>

        {preview ? (
          <div className="rounded-[1.25rem] border border-[#e7dcc3] bg-white/92 p-3 shadow-[0_14px_40px_-32px_rgba(15,23,42,0.28)]">
            <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center">
              <div className="overflow-hidden rounded-[1rem] border border-black/5 bg-slate-100">
                <img src={preview.url} alt="Documento pronto para leitura" className="h-24 w-full object-cover md:h-full" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-none bg-primary/10 text-primary">
                    {preview.captureMode === 'camera' ? 'Capturado pela camera' : 'Selecionado da galeria'}
                  </Badge>
                  <Badge className="border-none bg-emerald-500/10 text-emerald-700">Pronto para leitura</Badge>
                </div>
                <p className="font-semibold text-foreground">{preview.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {preview.width}x{preview.height}px • {formatBytes(preview.fileSize)}
                </p>
                <div className="pt-1">
                  <Button type="button" variant="ghost" className="gap-2" onClick={() => openPicker('upload')} disabled={busy}>
                    <RefreshCcw className="h-4 w-4" />
                    Trocar imagem
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-2 rounded-[1.25rem] border border-black/5 bg-slate-50/75 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            {localError ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
            {localError ? 'Foto precisa de atencao' : 'Fluxo pronto para leitura'}
          </div>
          <p className={cn('leading-6', localError ? 'text-red-600' : 'text-muted-foreground')}>
            {localError || helper || 'Use boa luz e mantenha o texto visivel. Depois, revise o rascunho gerado.'}
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

            if (!file) {
              return;
            }

            void handleSelectedFile(file);
            event.currentTarget.value = '';
          }}
        />

        <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-muted-foreground">
          Depois da foto, o sistema segue para <span className="font-medium text-foreground">{buttonLabel}</span>. Se o aparelho nao abrir a camera, o proprio sistema operacional vai oferecer a galeria.
        </div>
      </CardContent>
    </Card>
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

  return {
    file: normalizedFile,
    width: dimensions.width,
    height: dimensions.height,
    previewUrl,
  };
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
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Nao foi possivel abrir a imagem selecionada.'));
    };

    image.src = objectUrl;
  });
}

function stripFileExtension(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, '');
}

function formatBytes(value: number) {
  if (value < 1024 * 1024) {
    return `${Math.max(1, Math.round(value / 1024))} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function updatePreview(setPreview: Dispatch<SetStateAction<PreviewState | null>>, nextPreview: PreviewState) {
  setPreview((currentPreview) => {
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview.url);
    }

    return nextPreview;
  });
}
