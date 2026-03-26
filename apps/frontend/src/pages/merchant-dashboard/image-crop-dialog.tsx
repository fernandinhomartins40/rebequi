import { useEffect, useState, type SyntheticEvent } from 'react';
import { Crop, RefreshCw, Scissors } from 'lucide-react';
import ReactCrop, { type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  createCenteredAspectCrop,
  createCroppedProductImageFile,
  formatPercentCropValue,
  PRODUCT_IMAGE_ASPECT,
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_WIDTH,
} from './image-tools';

export function ProductImageCropDialog({
  fileName,
  open,
  sourceUrl,
  onConfirm,
  onOpenChange,
}: {
  fileName: string;
  open: boolean;
  sourceUrl?: string;
  onConfirm: (file: File) => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
}) {
  const [crop, setCrop] = useState<PercentCrop>();
  const [completedCrop, setCompletedCrop] = useState<PercentCrop>();
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number }>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sourceUrl) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setImageMeta(undefined);
      setSubmitting(false);
    }
  }, [sourceUrl]);

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    const nextCrop = createCenteredAspectCrop(naturalWidth, naturalHeight);

    setImageMeta({
      width: naturalWidth,
      height: naturalHeight,
    });
    setCrop(nextCrop);
    setCompletedCrop(nextCrop);
  };

  const handleReset = () => {
    if (!imageMeta) {
      return;
    }

    const nextCrop = createCenteredAspectCrop(imageMeta.width, imageMeta.height);
    setCrop(nextCrop);
    setCompletedCrop(nextCrop);
  };

  const handleConfirm = async () => {
    if (!sourceUrl || !completedCrop?.width || !completedCrop.height) {
      return;
    }

    try {
      setSubmitting(true);
      const result = await createCroppedProductImageFile({
        sourceUrl,
        originalFileName: fileName,
        crop: completedCrop,
      });
      await onConfirm(result);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-[#e8dcc1] bg-[linear-gradient(180deg,#fffef8,#ffffff)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Recortar imagem
          </DialogTitle>
          <DialogDescription>
            Defina a area de crop em formato 1:1. A imagem final sera salva em {PRODUCT_IMAGE_WIDTH}x{PRODUCT_IMAGE_HEIGHT}px e comprimida antes do upload.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-[#d9ceb0] bg-[#f7f3e7] p-4 shadow-inner">
            <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#2b241a] p-3">
              {sourceUrl ? (
                <ReactCrop
                  crop={crop}
                  aspect={PRODUCT_IMAGE_ASPECT}
                  minWidth={180}
                  minHeight={180}
                  keepSelection
                  ruleOfThirds
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(_, percentCrop) => setCompletedCrop(percentCrop)}
                  className="rounded-xl"
                >
                  <img
                    src={sourceUrl}
                    alt="Imagem para recorte"
                    onLoad={handleImageLoad}
                    className="max-h-[65vh] w-auto max-w-full object-contain"
                  />
                </ReactCrop>
              ) : null}
            </div>
            <p className="mt-4 text-center text-xs text-[#473d2a]">
              Arraste a selecao e ajuste pelos cantos para definir o enquadramento final.
            </p>
          </div>

          <div className="space-y-5 rounded-3xl border border-[#eadfba] bg-white/90 p-5 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Crop className="h-4 w-4 text-primary" />
              Selecao
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Largura</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatPercentCropValue(completedCrop?.width)}%
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Altura</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatPercentCropValue(completedCrop?.height)}%
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Origem X</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatPercentCropValue(completedCrop?.x)}%
                </div>
              </div>
              <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Origem Y</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {formatPercentCropValue(completedCrop?.y)}%
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-xs text-muted-foreground">
              O arquivo final sera recortado em 1:1, exportado em WebP e comprimido em background para reduzir armazenamento.
            </div>

            <Button type="button" variant="outline" onClick={handleReset} disabled={!imageMeta || submitting}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reposicionar selecao
            </Button>

            <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-3 text-xs text-muted-foreground">
              Use imagens com boa resolucao. O crop preserva o enquadramento quadrado usado nas vitrines publicas.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!sourceUrl || !completedCrop?.width || !completedCrop.height || submitting}
          >
            {submitting ? 'Processando...' : 'Usar imagem recortada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
