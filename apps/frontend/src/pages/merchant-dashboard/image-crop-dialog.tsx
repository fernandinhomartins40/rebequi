import { useEffect, useMemo, useState } from 'react';
import { Scissors, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  createCroppedProductImageFile,
  getCropPreviewMetrics,
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_WIDTH,
  type ProductCropState,
} from './image-tools';

const PREVIEW_SCALE = 0.3;
const PREVIEW_WIDTH = PRODUCT_IMAGE_WIDTH * PREVIEW_SCALE;
const PREVIEW_HEIGHT = PRODUCT_IMAGE_HEIGHT * PREVIEW_SCALE;

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
  const [crop, setCrop] = useState<ProductCropState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number }>();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sourceUrl) {
      setImageMeta(undefined);
      return;
    }

    const image = new Image();
    image.onload = () =>
      setImageMeta({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    image.src = sourceUrl;
  }, [sourceUrl]);

  useEffect(() => {
    setCrop({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
    });
  }, [sourceUrl]);

  const previewMetrics = useMemo(() => {
    if (!imageMeta) {
      return undefined;
    }

    return getCropPreviewMetrics({
      imageWidth: imageMeta.width,
      imageHeight: imageMeta.height,
      zoom: crop.zoom,
    });
  }, [crop.zoom, imageMeta]);

  const boundedOffsetX = previewMetrics
    ? Math.min(Math.max(crop.offsetX, -previewMetrics.maxOffsetX), previewMetrics.maxOffsetX)
    : 0;
  const boundedOffsetY = previewMetrics
    ? Math.min(Math.max(crop.offsetY, -previewMetrics.maxOffsetY), previewMetrics.maxOffsetY)
    : 0;

  useEffect(() => {
    if (!previewMetrics) {
      return;
    }

    if (boundedOffsetX !== crop.offsetX || boundedOffsetY !== crop.offsetY) {
      setCrop((current) => ({
        ...current,
        offsetX: boundedOffsetX,
        offsetY: boundedOffsetY,
      }));
    }
  }, [boundedOffsetX, boundedOffsetY, crop.offsetX, crop.offsetY, previewMetrics]);

  const handleConfirm = async () => {
    if (!sourceUrl) {
      return;
    }

    try {
      setSubmitting(true);
      const result = await createCroppedProductImageFile({
        sourceUrl,
        originalFileName: fileName,
        crop: {
          ...crop,
          offsetX: boundedOffsetX,
          offsetY: boundedOffsetY,
        },
      });
      await onConfirm(result);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-[#e8dcc1] bg-[linear-gradient(180deg,#fffef8,#ffffff)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Recortar imagem
          </DialogTitle>
          <DialogDescription>
            Ajuste o enquadramento. A imagem sera salva em {PRODUCT_IMAGE_WIDTH}x{PRODUCT_IMAGE_HEIGHT}px.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-black/5 bg-slate-950/90 p-4 shadow-inner">
            <div
              className="relative mx-auto overflow-hidden rounded-2xl border border-white/10 bg-black"
              style={{ width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT }}
            >
              {sourceUrl && previewMetrics ? (
                <div
                  className="absolute left-1/2 top-1/2"
                  style={{
                    transform: `translate(-50%, -50%) translate(${boundedOffsetX * PREVIEW_SCALE}px, ${boundedOffsetY * PREVIEW_SCALE}px)`,
                  }}
                >
                  <img
                    src={sourceUrl}
                    alt="Preview do recorte"
                    className="block max-w-none"
                    style={{
                      width: previewMetrics.displayWidth * PREVIEW_SCALE,
                      height: previewMetrics.displayHeight * PREVIEW_SCALE,
                    }}
                  />
                </div>
              ) : null}
            </div>
            <p className="mt-4 text-center text-xs text-white/70">
              Pre-visualizacao final da imagem.
            </p>
          </div>

          <div className="space-y-5 rounded-3xl border border-[#eadfba] bg-white/90 p-5 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Ajustes
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-image-zoom">Zoom</Label>
              <input
                id="product-image-zoom"
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={crop.zoom}
                onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) }))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">Defina a aproximacao da imagem.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-image-offset-x">Horizontal</Label>
              <input
                id="product-image-offset-x"
                type="range"
                min={previewMetrics ? -previewMetrics.maxOffsetX : 0}
                max={previewMetrics ? previewMetrics.maxOffsetX : 0}
                step="1"
                value={boundedOffsetX}
                onChange={(event) => setCrop((current) => ({ ...current, offsetX: Number(event.target.value) }))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-image-offset-y">Vertical</Label>
              <input
                id="product-image-offset-y"
                type="range"
                min={previewMetrics ? -previewMetrics.maxOffsetY : 0}
                max={previewMetrics ? previewMetrics.maxOffsetY : 0}
                step="1"
                value={boundedOffsetY}
                onChange={(event) => setCrop((current) => ({ ...current, offsetY: Number(event.target.value) }))}
                className="w-full"
              />
            </div>

            <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-xs text-muted-foreground">
              O arquivo final sera compactado antes do envio.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={!sourceUrl || submitting}>
            {submitting ? 'Processando...' : 'Usar imagem recortada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
