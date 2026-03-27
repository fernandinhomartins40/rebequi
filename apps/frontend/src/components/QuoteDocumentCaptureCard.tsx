import { useRef } from 'react';
import { Camera, FileImage, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type QuoteDocumentCaptureCardProps = {
  title: string;
  description: string;
  helper?: string;
  processing?: boolean;
  buttonLabel?: string;
  disabled?: boolean;
  onSelectFile: (file: File) => Promise<void> | void;
};

export function QuoteDocumentCaptureCard({
  title,
  description,
  helper,
  processing = false,
  buttonLabel = 'Abrir câmera',
  disabled = false,
  onSelectFile,
}: QuoteDocumentCaptureCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleOpenPicker = () => {
    inputRef.current?.click();
  };

  return (
    <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
      <CardHeader className="space-y-3">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Camera className="h-4 w-4" />
          Câmera do celular
        </div>
        <div>
          <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
          <CardDescription className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[1.5rem] border border-dashed border-[#e7dcc3] bg-slate-50/80 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-white p-3 shadow-sm">
                <FileImage className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Fotografe o documento do orçamento</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use uma imagem nítida, com boa luz e o documento inteiro visível.
                </p>
              </div>
            </div>

            <Button onClick={handleOpenPicker} disabled={disabled || processing} className="gap-2">
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {processing ? 'Processando OCR...' : buttonLabel}
            </Button>
          </div>

          {helper ? <p className="mt-4 text-sm text-muted-foreground">{helper}</p> : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }

            void onSelectFile(file);
            event.currentTarget.value = '';
          }}
        />
      </CardContent>
    </Card>
  );
}
