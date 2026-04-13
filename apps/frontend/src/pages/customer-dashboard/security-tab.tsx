import { KeyRound, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionPanel } from './components';

interface SecurityTabProps {
  user: { mustChangePassword?: boolean } | null;
  provisionalCredentials: { identifier: string; password: string } | null;
  passwordForm: { currentPassword: string; newPassword: string };
  setPasswordForm: React.Dispatch<React.SetStateAction<{ currentPassword: string; newPassword: string }>>;
  changePasswordPending: boolean;
  onChangePassword: () => void;
}

export function SecurityTab({
  user,
  provisionalCredentials,
  passwordForm,
  setPasswordForm,
  changePasswordPending,
  onChangePassword,
}: SecurityTabProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Acesso</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Segurança</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            user?.mustChangePassword ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {user?.mustChangePassword ? 'Senha provisória' : 'Senha atualizada'}
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Status */}
        <SectionPanel className="p-5">
          <div className="space-y-3">
            {user?.mustChangePassword ? (
              <div className="rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
                Você está usando uma senha provisória. Troque-a ao lado.
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
                Sua senha está atualizada.
              </div>
            )}

            {provisionalCredentials ? (
              <Alert className="border-amber-200/60 bg-amber-50/50">
                <KeyRound className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">Credenciais provisórias</AlertTitle>
                <AlertDescription className="text-amber-800">
                  Identificador: <strong>{provisionalCredentials.identifier}</strong> · Senha:{' '}
                  <strong>{provisionalCredentials.password}</strong>
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </SectionPanel>

        {/* Change password form */}
        <SectionPanel className="p-5">
          <h3 className="text-base font-semibold text-foreground">Trocar senha</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="cp">Senha atual</Label>
              <Input
                id="cp"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm((s) => ({ ...s, currentPassword: e.target.value }))}
                className="mt-1.5 rounded-xl border-slate-200/80 bg-white"
              />
            </div>
            <div>
              <Label htmlFor="np">Nova senha</Label>
              <Input
                id="np"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((s) => ({ ...s, newPassword: e.target.value }))}
                className="mt-1.5 rounded-xl border-slate-200/80 bg-white"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            disabled={changePasswordPending}
            onClick={onChangePassword}
          >
            <Lock className="h-3.5 w-3.5" />
            {changePasswordPending ? 'Atualizando...' : 'Atualizar senha'}
          </Button>
        </SectionPanel>
      </div>
    </div>
  );
}
