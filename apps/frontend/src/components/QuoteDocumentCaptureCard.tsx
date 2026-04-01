import { useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
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
  type DocumentDetection,
  type ProcessedDocumentResult,
  detectDocumentFromVideoFrame,
  loadOpenCv,
  prepareDocumentFromFile,
  prepareDocumentFromVideo,
} from '@/lib/document-scanner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
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

const ANALYSIS_INTERVAL = 320;
const AUTO_CAPTURE_COOLDOWN = 2200;
const AUTO_CAPTURE_STABLE_FRAMES = 3;

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousDetectionRef = useRef<DocumentDetection | null>(null);
  const stableFramesRef = useRef(0);
  const autoCaptureLockRef = useRef(0);
  const lastAnalysisAtRef = useRef(0);
  const openCvReadyRef = useRef(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [scannerReady, setScannerReady] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cameraMessage, setCameraMessage] = useState('Scanner preparado para capturar o documento sem sair da pagina.');
  const [detection, setDetection] = useState<DocumentDetection | null>(null);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [preview, setPreview] = useState<ScannerPreview | null>(null);
  const [videoSize, setVideoSize] = useState({ width: 4, height: 3 });

  useEffect(() => {
    return () => {
      stopCameraStream(streamRef);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    if (activeTab !== 'camera' || cameraState !== 'ready' || localBusy || processing) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      return;
    }

    const analyzeFrame = async () => {
      const now = performance.now();

      if (now - lastAnalysisAtRef.current >= ANALYSIS_INTERVAL) {
        lastAnalysisAtRef.current = now;

        try {
          const video = videoRef.current;
          const analysisCanvas = analysisCanvasRef.current;

          if (video && analysisCanvas && video.readyState >= 2 && openCvReadyRef.current) {
            const nextDetection = await detectDocumentFromVideoFrame({
              video,
              analysisCanvas,
            });

            setDetection(nextDetection);
            updateDetectionState(nextDetection, previousDetectionRef, stableFramesRef);

            if (
              autoCaptureEnabled &&
              nextDetection &&
              stableFramesRef.current >= AUTO_CAPTURE_STABLE_FRAMES &&
              Date.now() > autoCaptureLockRef.current
            ) {
              autoCaptureLockRef.current = Date.now() + AUTO_CAPTURE_COOLDOWN;
              void handleCameraCapture(true);
              return;
            }

            setCameraMessage(buildCameraGuidance(nextDetection));
          }
        } catch {
          setCameraMessage('Centralize o documento e tente novamente com mais luz.');
        }
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        void analyzeFrame();
      });
    };

    animationFrameRef.current = requestAnimationFrame(() => {
      void analyzeFrame();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [activeTab, autoCaptureEnabled, cameraState, localBusy, processing]);

  const openFilePicker = () => {
    inputRef.current?.click();
  };

  const ensureScannerReady = async () => {
    if (openCvReadyRef.current) {
      return true;
    }

    try {
      setCameraMessage('Preparando scanner para analise do documento...');
      await loadOpenCv();
      openCvReadyRef.current = true;
      setScannerReady(true);
      return true;
    } catch {
      setLocalError('Nao foi possivel preparar o scanner de documentos no navegador.');
      setCameraState('error');
      return false;
    }
  };

  const handleStartCamera = async () => {
    if (disabled || processing || localBusy) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setActiveTab('upload');
      setCameraState('unsupported');
      setLocalError('Seu navegador nao oferece camera ao vivo. Use o envio manual da imagem.');
      return;
    }

    setLocalError(null);
    setCameraState('requesting');

    try {
      const scannerIsReady = await ensureScannerReady();
      if (!scannerIsReady) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: 'environment',
          },
          width: {
            ideal: 1920,
          },
          height: {
            ideal: 1080,
          },
        },
      });

      stopCameraStream(streamRef);
      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error('Video nao disponivel');
      }

      video.srcObject = stream;
      await video.play();

      setVideoSize({
        width: video.videoWidth || 4,
        height: video.videoHeight || 3,
      });
      setCameraState('ready');
      setCameraMessage('Documento detectado em tempo real. Centralize o papel dentro da moldura.');
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Permissao da camera negada. Libere o acesso para usar o scanner ao vivo.'
          : 'Nao foi possivel iniciar a camera. Use o envio manual se preferir.';

      setCameraState(error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'error');
      setLocalError(message);
    }
  };

  const handleStopCamera = () => {
    stopCameraStream(streamRef);
    setCameraState('idle');
    setDetection(null);
    stableFramesRef.current = 0;
    previousDetectionRef.current = null;
    setCameraMessage('Scanner pausado. Voce pode reativar a camera quando quiser.');
  };

  const handleCameraCapture = async (autoCaptured = false) => {
    const video = videoRef.current;

    if (!video || disabled || processing || localBusy) {
      return;
    }

    setLocalBusy(true);
    setLocalError(null);

    let prepared;

    try {
      prepared = await prepareDocumentFromVideo({
        video,
        fileName: autoCaptured ? 'orcamento-auto-capturado.png' : 'orcamento-capturado.png',
      });
    } catch {
      setLocalError('Nao foi possivel capturar o documento pela camera. Tente novamente ou envie a imagem manualmente.');
      setLocalBusy(false);
      return;
    }

    const file = buildFileFromBlob(prepared.blob, autoCaptured ? 'orcamento-auto' : 'orcamento-camera', 'png');
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
        autoCaptured,
      });

      setCameraMessage(
        prepared.autoCropped
          ? 'Documento corrigido e enviado para OCR.'
          : 'Frame enviado para OCR sem recorte automatico.'
      );
      handleStopCamera();
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
  const polygon = detection ? buildPolygon(detection.points) : '';
  const progressValue = detection ? Math.min(100, Math.round(detection.coverage * 100)) : 0;

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
            {cameraState === 'ready' ? (
              <div className="space-y-4">
                <div
                  className="relative overflow-hidden rounded-[1.75rem] border border-black/5 bg-slate-950 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.6)]"
                  style={{ aspectRatio: `${videoSize.width} / ${videoSize.height}` }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />

                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),rgba(2,6,23,0.24)_72%)]" />

                  <div className="absolute inset-0 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Badge className="border-none bg-white/90 text-slate-900">
                        {detection ? 'Documento detectado' : 'Procurando documento'}
                      </Badge>
                      <Badge
                        className={cn(
                          'border-none',
                          autoCaptureEnabled ? 'bg-emerald-500/90 text-white' : 'bg-slate-900/70 text-white'
                        )}
                      >
                        {autoCaptureEnabled ? 'Auto captura ligada' : 'Captura manual'}
                      </Badge>
                    </div>

                    <div className="absolute inset-x-4 bottom-4 rounded-[1.4rem] border border-white/15 bg-slate-950/72 px-4 py-3 text-white backdrop-blur">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-sm font-semibold">{cameraMessage}</p>
                          <div className="flex items-center gap-3 text-xs text-white/80">
                            <span>{detection ? `${Math.round(detection.coverage * 100)}% do quadro ocupado` : 'Aproxime o documento'}</span>
                            <span>{scannerReady ? 'Recorte automatico pronto' : 'Carregando scanner'}</span>
                          </div>
                          <Progress value={progressValue} className="h-2 bg-white/15" />
                        </div>

                        <div className="pointer-events-auto flex shrink-0 flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            className="gap-2 bg-white/95 text-slate-900 hover:bg-white"
                            onClick={() => void handleCameraCapture(false)}
                            disabled={busy}
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

                    {polygon ? (
                      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
                        <polygon
                          points={polygon}
                          fill="rgba(59,130,246,0.12)"
                          stroke="rgba(255,255,255,0.92)"
                          strokeWidth="1.2"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-[1.4rem] border border-[#e7dcc3] bg-slate-50/85 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Captura dentro da pagina</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      O quadro e analisado ao vivo, o documento e corrigido automaticamente e so depois segue para o OCR.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Auto captura</span>
                    <Switch checked={autoCaptureEnabled} onCheckedChange={setAutoCaptureEnabled} disabled={busy} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-[#e7dcc3] bg-slate-50/80 p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                      <Sparkles className="h-4 w-4" />
                      Capture sem sair da tela
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">Camera ao vivo com recorte automatico</p>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Ative a camera traseira, enquadre o documento e deixe o scanner corrigir perspectiva, contraste e corte antes do OCR.
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
                  <Badge variant="secondary">Sem app externo</Badge>
                  <Badge variant="secondary">Recorte automatico</Badge>
                  <Badge variant="secondary">{scannerReady ? 'Scanner pronto' : 'Preparacao sob demanda'}</Badge>
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
          <div className="rounded-[1.5rem] border border-[#e7dcc3] bg-white/90 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
              </div>

              <Button type="button" variant="ghost" className="gap-2" onClick={openFilePicker} disabled={busy}>
                <RefreshCcw className="h-4 w-4" />
                Trocar documento
              </Button>
            </div>

            <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-black/5 bg-slate-100">
              <img src={preview.url} alt="Documento tratado para OCR" className="max-h-[360px] w-full object-contain" />
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

        <canvas ref={analysisCanvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}

function stopCameraStream(streamRef: MutableRefObject<MediaStream | null>) {
  const stream = streamRef.current;

  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => track.stop());
  streamRef.current = null;
}

function buildCameraGuidance(detection: DocumentDetection | null) {
  if (!detection) {
    return 'Aproxime o documento e mantenha as bordas visiveis.';
  }

  if (detection.coverage < 0.26) {
    return 'Aproxime mais o documento da camera.';
  }

  if (detection.coverage > 0.85) {
    return 'Afaste um pouco para enquadrar o documento inteiro.';
  }

  if (detection.score < 0.42) {
    return 'Alinhe o documento para reduzir a perspectiva antes da captura.';
  }

  return 'Documento pronto. Segure firme por um instante.';
}

function updateDetectionState(
  detection: DocumentDetection | null,
  previousDetectionRef: MutableRefObject<DocumentDetection | null>,
  stableFramesRef: MutableRefObject<number>
) {
  const previous = previousDetectionRef.current;

  if (!detection || !previous) {
    stableFramesRef.current = detection ? 1 : 0;
    previousDetectionRef.current = detection;
    return;
  }

  const averageMovement =
    detection.points.reduce((total, point, index) => {
      const previousPoint = previous.points[index];
      return total + Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y);
    }, 0) / detection.points.length;

  if (averageMovement < 0.03 && detection.coverage > 0.26) {
    stableFramesRef.current += 1;
  } else {
    stableFramesRef.current = 1;
  }

  previousDetectionRef.current = detection;
}

function buildPolygon(points: DocumentDetection['points']) {
  return points.map((point) => `${Math.round(point.x * 100)},${Math.round(point.y * 100)}`).join(' ');
}

function buildFileFromBlob(blob: Blob, baseName: string, extension: 'png' | 'jpg') {
  return new File([blob], `${baseName}-${Date.now()}.${extension}`, {
    type: blob.type,
    lastModified: Date.now(),
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
