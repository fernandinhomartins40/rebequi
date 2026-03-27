import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type LoginSessionOptionsProps = {
  keepSignedInChecked: boolean;
  keepSignedInId: string;
  onKeepSignedInChange: (checked: boolean) => void;
  onRememberIdentifierChange: (checked: boolean) => void;
  rememberIdentifierChecked: boolean;
  rememberIdentifierId: string;
};

export function LoginSessionOptions({
  keepSignedInChecked,
  keepSignedInId,
  onKeepSignedInChange,
  onRememberIdentifierChange,
  rememberIdentifierChecked,
  rememberIdentifierId,
}: LoginSessionOptionsProps) {
  return (
    <div className="grid gap-3 rounded-2xl border border-black/5 bg-slate-50/80 px-4 py-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id={rememberIdentifierId}
          checked={rememberIdentifierChecked}
          onCheckedChange={(checked) => onRememberIdentifierChange(checked === true)}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label htmlFor={rememberIdentifierId} className="cursor-pointer text-sm font-medium text-foreground">
            Lembrar meus dados
          </Label>
          <p className="text-xs text-muted-foreground">Mantém o identificador preenchido neste dispositivo.</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox
          id={keepSignedInId}
          checked={keepSignedInChecked}
          onCheckedChange={(checked) => onKeepSignedInChange(checked === true)}
          className="mt-0.5"
        />
        <div className="space-y-1">
          <Label htmlFor={keepSignedInId} className="cursor-pointer text-sm font-medium text-foreground">
            Manter conectado
          </Label>
          <p className="text-xs text-muted-foreground">Mantém a sessão ativa mesmo após fechar e reabrir o navegador.</p>
        </div>
      </div>
    </div>
  );
}
