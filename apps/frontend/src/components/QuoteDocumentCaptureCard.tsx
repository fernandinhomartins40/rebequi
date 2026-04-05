import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import Webcam from 'react-webcam';
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCcw,
  ScanSearch,
  Sparkles,
  Video,
  XCircle,
} from 'lucide-react';
import {
  type ProcessedDocumentResult,
  prepareDocumentFromFile,
} from '@/lib/document-scanner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

type ScannerPreview = {
  url: string;
  width: number;
  height: number;
  autoCropped: boolean;
  captureMode: 'camera' | 'upload';
  qualityScore: number;
};

type CameraState = 'idle' | 'requesting' | 'ready' | 'denied' | 'unsupported' | 'error';

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: {
    ideal: 'environment',
  },
  width: {
    ideal: 1280,
    max: 1280,
  },
  height: {
    ideal: 720,
    max: 720,
  },
};

export function QuoteDocumentCaptureCard({
  title,
  description,
  helper,
  processing = false,
  buttonLabel = 'Capturar documento',
  disabled = false,
  onSelectFile,
}: QuoteDocumentCaptureCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const webcamRef = useRef<Webcam | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cameraMessage, setCameraMessage] = useState('Abra a camera, enquadre o documento e toque em capturar.');
  const [preview, setPreview] = useState<ScannerPreview | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 4, height: 3 });

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  useEffect(() => {
    if (activeTab !== 'camera') {
      handleStopCamera();
    }
  }, [activeTab]);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const handleStartCamera = async () => {
    if (disabled || processing || localBusy) {
      return;
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraState('unsupported');
      setLocalError('A camera no navegador exige HTTPS ou localhost. Use o envio manual se preferir.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setActiveTab('upload');
      setCameraState('unsupported');
      setLocalError('Seu navegador nao oferece camera ao vivo. Use o envio manual da imagem.');
      return;
    }

    setActiveTab('camera');
    setLocalError(null);
    setCameraState('requesting');
    setCameraOpen(true);
    setCameraMessage('Solicitando permissao da camera...');
  };

  const handleCameraReady = async () => {
    const video = getVideoElement(webcamRef);

    if (!video) {
      setCameraState('error');
      setLocalError('A camera abriu sem entregar o video. Tente novamente.');
      return;
    }

    try {
      await ensureVideoFrameReady(video);
    } catch {
      setCameraState('error');
      setLocalError('A camera abriu, mas nao ficou pronta para capturar. Tente novamente.');
      return;
    }

    setCameraState('ready');
    setLocalError(null);
    setCameraMessage('Camera ativa. Enquadre o documento e toque em capturar.');

    setVideoSize({
      width: video.videoWidth || 4,
      height: video.videoHeight || 3,
    });
  };

  const handleCameraError = (error: string | DOMException) => {
    const denied =
      (typeof error === 'string' && error.toLowerCase().includes('permission')) ||
      (error instanceof DOMException && error.name === 'NotAllowedError');

    setCameraOpen(false);
    setCameraState(denied ? 'denied' : 'error');
    setLocalError(
      denied
        ? 'Permissao da camera negada. Libere o acesso para usar o scanner ao vivo.'
        : 'Nao foi possivel iniciar a camera. Use o envio manual se preferir.'
    );
  };

  const handleStopCamera = () => {
    setCameraOpen(false);
    setCameraState('idle');
    setCameraMessage('Camera pausada. Voce pode reativar quando quiser.');
  };

  const handleCameraCapture = async () => {
    const video = getVideoElement(webcamRef);

    if (!video || disabled || processing || localBusy) {
      return;
    }

    setLocalBusy(true);
    setLocalError(null);

    let prepared: ProcessedDocumentResult | null = null;

    try {
      await ensureVideoFrameReady(video);
      prepared = await captureWebcamFrame(webcamRef, video);
      handleStopCamera();
    } catch {
      setLocalError('Nao foi possivel capturar o documento pela camera. Tente novamente ou envie a imagem manualmente.');
      setLocalBusy(false);
      return;
    }

    const file = buildFileFromBlob(prepared.blob, 'orcamento-camera', prepared.blob.type === 'image/jpeg' ? 'jpg' : 'png');
    updatePreview(setPreview, {
      url: prepared.previewUrl,
      width: prepared.width,
      height: prepared.height,
      autoCropped: prepared.autoCropped,
      captureMode: 'camera',
      qualityScore: prepared.qualityScore,
    });

    try {
      await onSelectFile({
        file,
        width: prepared.width,
        height: prepared.height,
        captureMode: 'camera',
        autoCropped: prepared.autoCropped,
      });

      setCameraMessage('Documento capturado e enviado para leitura.');
    } catch {
      setLocalError('O documento foi capturado, mas o envio para OCR falhou. Tente novamente.');
    } finally {
      setLocalBusy(false);
    }
  };

  const handleManualFile = async (file: File) => {
    if (disabled || processing || localBusy) {
      return;
    }

    setLocalBusy(true);
    setLocalError(null);

    let prepared: ProcessedDocumentResult | null = null;

    try {
      prepared = await prepareDocumentFromFile({
        file,
        fileName: file.name,
      });
    } catch {
      try {
        const { default: imageCompression } = await import('browser-image-compression');
        const compressed = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1800,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.86,
        });

        const previewUrl = URL.createObjectURL(compressed);
        updatePreview(setPreview, {
          url: previewUrl,
          width: preview?.width || 0,
          height: preview?.height || 0,
          autoCropped: false,
          captureMode: 'upload',
          qualityScore: 0,
        });

        await onSelectFile({
          file: buildFileFromBlob(compressed, stripFileExtension(file.name) || 'orcamento-upload', 'jpg'),
          captureMode: 'upload',
          autoCropped: false,
        });
        setLocalBusy(false);
        return;
      } catch {
        setLocalError('Nao foi possivel processar a imagem enviada. Escolha uma foto mais nitida.');
        setLocalBusy(false);
        return;
      }
    }

    if (!prepared) {
      setLocalBusy(false);
      return;
    }

    const normalizedFile = buildFileFromBlob(prepared.blob, stripFileExtension(file.name) || 'orcamento-upload', 'png');

    updatePreview(setPreview, {
      url: prepared.previewUrl,
      width: prepared.width,
      height: prepared.height,
      autoCropped: prepared.autoCropped,
      captureMode: 'upload',
      qualityScore: prepared.qualityScore,
    });

    try {
      await onSelectFile({
        file: normalizedFile,
        width: prepared.width,
        height: prepared.height,
        captureMode: 'upload',
        autoCropped: prepared.autoCropped,
      });

      setCameraMessage(
        prepared.autoCropped
          ? 'Imagem corrigida e enviada para OCR.'
          : 'Imagem enviada para OCR com tratamento basico.'
      );
    } catch {
      setLocalError('A imagem foi tratada, mas o envio para OCR falhou. Tente novamente.');
    } finally {
      setLocalBusy(false);
    }
  };

  const busy = disabled || processing || localBusy;
  const showCameraPreview = cameraOpen;

  return (
    <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <ScanSearch className="h-4 w-4" />
          Scanner ao vivo
        </div>
        <div>
          <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
          <CardDescription className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'camera' | 'upload')} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera" className="gap-2">
              <Video className="h-4 w-4" />
              Scanner ao vivo
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <ImagePlus className="h-4 w-4" />
              Enviar imagem
            </TabsTrigger>
          </TabsList>

          <TabsContent value="camera" className="space-y-4">
            {showCameraPreview ? (
              <div className="space-y-4">
                <div
                  className="relative overflow-hidden rounded-[1.75rem] border border-black/5 bg-slate-950 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.6)]"
                  style={{ aspectRatio: `${videoSize.width} / ${videoSize.height}` }}
                >
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    className="h-full w-full object-cover"
                    disablePictureInPicture
                    forceScreenshotSourceSize
                    imageSmoothing
                    mirrored={false}
                    onUserMedia={handleCameraReady}
                    onUserMediaError={handleCameraError}
                    playsInline
                    screenshotFormat="image/png"
                    screenshotQuality={1}
                    videoConstraints={VIDEO_CONSTRAINTS}
                  />

                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),rgba(2,6,23,0.24)_72%)]" />

                  {cameraState === 'requesting' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 px-6 text-center text-white backdrop-blur-sm">
                      <div className="space-y-3">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-white/90" />
                        <p className="text-sm font-semibold">Abrindo camera...</p>
                        <p className="text-xs leading-5 text-white/75">{cameraMessage}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="pointer-events-none absolute inset-0 p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <Badge className="border-none bg-white/90 text-slate-900">Camera ao vivo</Badge>
                        <Badge className="border-none bg-slate-900/70 text-white">Captura manual</Badge>
                      </div>

                      <div className="pointer-events-auto absolute inset-x-4 bottom-4 rounded-[1.4rem] border border-white/15 bg-slate-950/72 px-4 py-3 text-white backdrop-blur">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold">{cameraMessage}</p>
                            <p className="text-xs text-white/80">
                              Use boa luz, aproxime o documento e toque em capturar quando o texto estiver nitido.
                            </p>
                          </div>

                          <div className="pointer-events-auto flex shrink-0 flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              className="gap-2 bg-white/95 text-slate-900 hover:bg-white"
                              onClick={() => void handleCameraCapture()}
                              disabled={busy || cameraState !== 'ready'}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                              {busy ? 'Processando...' : buttonLabel}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="gap-2 border border-white/15 text-white hover:bg-white/10 hover:text-white"
                              onClick={handleStopCamera}
                              disabled={busy}
                            >
                              <XCircle className="h-4 w-4" />
                              Pausar
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 rounded-[1.4rem] border border-[#e7dcc3] bg-slate-50/85 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Captura leve dentro da pagina</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      A camera fica leve e estavel. O documento so e processado depois da captura, para evitar travar a pagina.
                    </p>
                  </div>
                  <Badge variant="secondary">Sem analise em tempo real</Badge>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-[#e7dcc3] bg-slate-50/80 p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                      <Sparkles className="h-4 w-4" />
                      Camera com captura nativa
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">Abrir camera ao vivo</p>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        A camera abre dentro da pagina com menos carga no celular. O processamento da imagem acontece so depois da captura.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" onClick={() => void handleStartCamera()} disabled={busy} className="gap-2">
                      {cameraState === 'requesting' || (busy && activeTab === 'camera') ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                      {cameraState === 'requesting' ? 'Solicitando camera...' : 'Ativar camera ao vivo'}
                    </Button>
                    <Button type="button" variant="outline" onClick={openFilePicker} disabled={busy}>
                      Enviar imagem
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">Fluxo leve para mobile</Badge>
                  <Badge variant="secondary">Sem sair do painel</Badge>
                  <Badge variant="secondary">Fallback por envio manual</Badge>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="rounded-[1.5rem] border border-dashed border-[#e7dcc3] bg-slate-50/80 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-white p-3 shadow-sm">
                    <ImagePlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Enviar imagem do documento</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      O sistema tenta corrigir corte, perspectiva e contraste antes de processar o OCR.
                    </p>
                  </div>
                </div>

                <Button onClick={openFilePicker} disabled={busy} className="gap-2">
                  {busy && activeTab === 'upload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {busy && activeTab === 'upload' ? 'Tratando imagem...' : 'Escolher imagem'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {preview ? (
          <div className="rounded-[1.25rem] border border-[#e7dcc3] bg-white/92 p-3 shadow-[0_14px_40px_-32px_rgba(15,23,42,0.28)]">
            <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center">
              <div className="overflow-hidden rounded-[1rem] border border-black/5 bg-slate-100">
                <img src={preview.url} alt="Documento tratado para OCR" className="h-24 w-full object-cover md:h-full" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="border-none bg-primary/10 text-primary">
                    {preview.captureMode === 'camera' ? 'Capturado ao vivo' : 'Imagem enviada'}
                  </Badge>
                  <Badge
                    className={cn(
                      'border-none',
                      preview.autoCropped ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'
                    )}
                  >
                    {preview.autoCropped ? 'Recorte automatico aplicado' : 'Tratamento basico aplicado'}
                  </Badge>
                </div>
                <p className="font-semibold text-foreground">Ultimo documento preparado para OCR</p>
                <p className="text-sm text-muted-foreground">
                  {preview.width > 0 && preview.height > 0
                    ? `${preview.width}x${preview.height}px`
                    : 'Resolucao padronizada para acelerar o reconhecimento'}{' '}
                  • score {Math.max(0, Math.round(preview.qualityScore * 100))}
                </p>
                <div className="pt-1">
                  <Button type="button" variant="ghost" className="gap-2" onClick={openFilePicker} disabled={busy}>
                    <RefreshCcw className="h-4 w-4" />
                    Trocar documento
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
            {localError ? 'Scanner precisa de atencao' : 'Fluxo pronto para OCR'}
          </div>
          <p className={cn('leading-6', localError ? 'text-red-600' : 'text-muted-foreground')}>
            {localError || helper || 'Se a camera falhar, troque para a guia de envio manual.'}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (!file) {
              return;
            }

            void handleManualFile(file);
            event.currentTarget.value = '';
          }}
        />
      </CardContent>
    </Card>
  );
}

function getVideoElement(webcamRef: MutableRefObject<Webcam | null>) {
  return webcamRef.current?.video ?? null;
}

async function captureWebcamFrame(
  webcamRef: MutableRefObject<Webcam | null>,
  video: HTMLVideoElement
): Promise<ProcessedDocumentResult> {
  const screenshot = webcamRef.current?.getScreenshot();

  if (screenshot) {
    try {
      return await createProcessedResultFromDataUrl(screenshot);
    } catch {
      // Falls back to direct canvas capture below.
    }
  }

  return captureRawVideoFrame(video);
}

function buildFileFromBlob(blob: Blob, baseName: string, extension: 'png' | 'jpg') {
  return new File([blob], `${baseName}-${Date.now()}.${extension}`, {
    type: blob.type,
    lastModified: Date.now(),
  });
}

async function captureRawVideoFrame(video: HTMLVideoElement): Promise<ProcessedDocumentResult> {
  const canvas = document.createElement('canvas');
  drawVideoToCanvas(video, canvas, 1800);
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);

  if (canvas.width < 10 || canvas.height < 10) {
    throw new Error('A camera nao retornou dimensoes validas para a captura.');
  }

  const previewUrl = URL.createObjectURL(blob);

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    previewUrl,
    autoCropped: false,
    qualityScore: 0,
  };
}

async function createProcessedResultFromDataUrl(dataUrl: string): Promise<ProcessedDocumentResult> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const dimensions = await readBlobDimensions(blob);
  const previewUrl = URL.createObjectURL(blob);

  return {
    blob,
    width: dimensions.width,
    height: dimensions.height,
    previewUrl,
    autoCropped: false,
    qualityScore: 0,
  };
}

function drawVideoToCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement, maxSide: number) {
  const sourceWidth = video.videoWidth || video.clientWidth || 1280;
  const sourceHeight = video.videoHeight || video.clientHeight || 720;
  const longestSide = Math.max(sourceWidth, sourceHeight);
  const scale = longestSide > maxSide ? maxSide / longestSide : 1;

  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Nao foi possivel preparar o canvas da camera.');
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

async function ensureVideoFrameReady(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
    await waitForNextVideoFrame(video);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    let timeoutId: ReturnType<typeof window.setTimeout> | null = null;

    const cleanup = () => {
      video.removeEventListener('loadeddata', handleReady);
      video.removeEventListener('canplay', handleReady);
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };

    const handleReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Timeout aguardando a camera.'));
    }, 4000);

    video.addEventListener('loadeddata', handleReady);
    video.addEventListener('canplay', handleReady);
    handleReady();
  });

  await waitForNextVideoFrame(video);
}

async function waitForNextVideoFrame(video: HTMLVideoElement) {
  if ('requestVideoFrameCallback' in video) {
    await new Promise<void>((resolve) => {
      (video as HTMLVideoElement & {
        requestVideoFrameCallback: (callback: () => void) => number;
      }).requestVideoFrameCallback(() => resolve());
    });
    return;
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Nao foi possivel gerar a imagem capturada.'));
          return;
        }

        resolve(blob);
      },
      type,
      quality
    );
  });
}

function readBlobDimensions(blob: Blob) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Nao foi possivel ler a imagem capturada.'));
    };

    image.src = objectUrl;
  });
}

function stripFileExtension(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, '');
}

function updatePreview(
  setPreview: Dispatch<SetStateAction<ScannerPreview | null>>,
  nextPreview: ScannerPreview
) {
  setPreview((currentPreview) => {
    if (currentPreview) {
      URL.revokeObjectURL(currentPreview.url);
    }

    return nextPreview;
  });
}
