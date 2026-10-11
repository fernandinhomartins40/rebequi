import { useEffect, useState, type SyntheticEvent } from 'react';
import { Crop, RefreshCw, Scissors } from 'lucide-react';
import ReactCrop, { type PercentCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalPanel, ModalTitle } from '@/components/ui/modal';
import {
  createCenteredAspectCrop,
  createCroppedImageFile,
  formatPercentCropValue,
  type ImageCropConfig,
  PRODUCT_IMAGE_CONFIG,
} from '@/lib/image-tools';

export function ImageCropDialog({
  config = PRODUCT_IMAGE_CONFIG,
  fileName,
  open,
  sourceUrl,
  title = 'Recortar imagem',
  onConfirm,
  onOpenChange,
}: {
  config?: ImageCropConfig;
  fileName: string;
  open: boolean;
  sourceUrl?: string;
  title?: string;
  onConfirm: (file: File) => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
}) {
  const [crop, setCrop] = useState<PercentCrop>();
  const [completedCrop, setCompletedCrop] = useState<PercentCrop>();
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number }>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const nextCrop = createCenteredAspectCrop(
      naturalWidth,
      naturalHeight,
      config.preserveCropAspect ? naturalWidth / naturalHeight : config.width / config.height,
      config.initialCropWidthPercent,
    );

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

    const nextCrop = createCenteredAspectCrop(
      imageMeta.width,
      imageMeta.height,
      config.preserveCropAspect ? imageMeta.width / imageMeta.height : config.width / config.height,
      config.initialCropWidthPercent,
    );
    setCrop(nextCrop);
    setCompletedCrop(nextCrop);
  };

  const handleConfirm = async () => {
    if (!sourceUrl || !completedCrop?.width || !completedCrop.height) {
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const result = await createCroppedImageFile({
        sourceUrl,
        originalFileName: fileName,
        crop: completedCrop,
        config,
      });
      await onConfirm(result);
      onOpenChange(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível preparar a imagem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalContent size="2xl" className="border-[#e8dcc1]">
        <ModalHeader>
          <ModalTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            {title}
          </ModalTitle>
          <ModalDescription>
            {config.preserveCropAspect ? 'Selecione a lista inteira, sem cortar produtos.' : `Ajuste o enquadramento para ${config.width} × ${config.height} px.`} A imagem será convertida e comprimida em WebP.
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
            <div className="rounded-3xl border border-[#d9ceb0] bg-[#f7f3e7] p-3 shadow-inner sm:p-4">
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#2b241a] p-3">
                {sourceUrl ? (
                  <ReactCrop
                    crop={crop}
                    aspect={config.preserveCropAspect ? undefined : config.width / config.height}
                    minWidth={20}
                    minHeight={20}
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
                      onError={() => setError('Não foi possível abrir esta imagem. Escolha JPG, PNG, WebP, GIF, BMP ou AVIF.')}
                      className="max-h-[50vh] w-auto max-w-full object-contain sm:max-h-[60vh]"
                    />
                  </ReactCrop>
                ) : null}
              </div>
              <p className="mt-4 text-center text-xs text-[#473d2a]">
                Arraste a selecao e ajuste pelos cantos para definir o enquadramento final.
              </p>
            </div>

            <ModalPanel className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Crop className="h-4 w-4 text-primary" />
                Selecao
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-black/5 bg-muted/50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Largura</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {formatPercentCropValue(completedCrop?.width)}%
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-muted/50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Altura</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {formatPercentCropValue(completedCrop?.height)}%
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-muted/50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Origem X</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {formatPercentCropValue(completedCrop?.x)}%
                  </div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-muted/50 px-4 py-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Origem Y</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {formatPercentCropValue(completedCrop?.y)}%
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
                O arquivo final será exportado em WebP com proporção fixa e comprimido em background para reduzir armazenamento.
              </div>

              <Button type="button" variant="outline" onClick={handleReset} disabled={!imageMeta || submitting}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reposicionar selecao
              </Button>

              <div className="rounded-2xl border border-dashed border-black/10 bg-white px-4 py-3 text-xs text-muted-foreground">
                Use imagens com boa resolucao. O crop preserva o enquadramento usado pelo componente visual vinculado a este upload.
              </div>
            </ModalPanel>
          </div>
        </ModalBody>

        <ModalFooter>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!sourceUrl || !completedCrop?.width || !completedCrop.height || submitting}
          >
            {submitting ? 'Processando...' : 'Usar imagem recortada'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Dialog>
  );
}

export function ProductImageCropDialog(props: Omit<Parameters<typeof ImageCropDialog>[0], 'config'>) {
  return <ImageCropDialog {...props} config={PRODUCT_IMAGE_CONFIG} />;
}
