import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, Lock, PackageSearch, Settings, Shield } from 'lucide-react';
import { loginSchema, type LoginInput } from '@rebequi/shared/schemas';
import { UserRole } from '@rebequi/shared/types';
import { z } from 'zod';
import { LoginSessionOptions } from '@/components/auth/LoginSessionOptions';
import { PasswordField } from '@/components/auth/PasswordField';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginPreferences } from '@/hooks/use-login-preferences';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const MERCHANT_PANEL_URL = import.meta.env.VITE_MERCHANT_PANEL_URL || '/painel-lojista/painel/produtos';
const MERCHANT_LOGIN_PREFERENCES_STORAGE_KEY = 'rebequi:auth:merchant-login';

type MerchantLoginFormValues = LoginInput & {
  rememberIdentifier: boolean;
};

const merchantLoginFormSchema = loginSchema.extend({
  rememberIdentifier: z.boolean().default(false),
});

const MerchantPanel = () => {
  const { toast } = useToast();
  const { login, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const { initialPreferences, persistPreferences } = useLoginPreferences(MERCHANT_LOGIN_PREFERENCES_STORAGE_KEY);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MerchantLoginFormValues>({
    resolver: zodResolver(merchantLoginFormSchema),
    defaultValues: {
      identifier: initialPreferences.identifier,
      password: '',
      keepSignedIn: initialPreferences.keepSignedIn,
      rememberIdentifier: initialPreferences.rememberIdentifier,
    },
  });

  useEffect(() => {
    register('rememberIdentifier');
    register('keepSignedIn');
  }, [register]);

  const rememberIdentifier = watch('rememberIdentifier');
  const keepSignedIn = watch('keepSignedIn');

  const onSubmit = async (values: MerchantLoginFormValues) => {
    try {
      setLoading(true);
      persistPreferences({
        identifier: values.identifier,
        keepSignedIn: values.keepSignedIn,
        rememberIdentifier: values.rememberIdentifier,
      });

      const user = await login({
        identifier: values.identifier,
        password: values.password,
        keepSignedIn: values.keepSignedIn,
      });

      if (user.role !== UserRole.ADMIN) {
        await logout();
        throw new Error('Sua conta não possui acesso administrativo.');
      }

      toast({
        title: 'Login realizado',
        description: 'Acesso administrativo liberado.',
      });

      window.location.href = MERCHANT_PANEL_URL;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao autenticar';
      toast({
        variant: 'destructive',
        title: 'Falha',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8 sm:px-6 sm:py-12">
      <div className="container mx-auto">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:[grid-template-columns:1.15fr_0.85fr] lg:items-center lg:gap-14">
          <div className="space-y-6">
            <header className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <Shield className="h-4 w-4" /> Painel do Lojista
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">Acesso administrativo</h1>
              <p className="text-muted-foreground">Entre com uma conta ADMIN para acessar a área interna da operação.</p>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <FeatureCard
                icon={<PackageSearch className="h-6 w-6 text-primary" />}
                title="Produtos"
                description="Cadastro, edição e exclusão."
              />
              <FeatureCard
                icon={<BarChart3 className="h-6 w-6 text-primary" />}
                title="Sessão"
                description="Autenticação administrativa com controle de acesso."
              />
              <FeatureCard
                icon={<Settings className="h-6 w-6 text-primary" />}
                title="Plataforma"
                description="Painel estruturado para expansão de novas áreas."
              />
            </div>
          </div>

          <div className="w-full lg:max-w-xl lg:justify-self-end">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Lock className="h-5 w-5 text-primary" />
                  Acesso do Lojista
                </CardTitle>
                <CardDescription>Entre com e-mail e senha de administrador.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-2">
                    <Label htmlFor="identifier">E-mail do administrador</Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="admin@rebequi.com.br"
                      autoComplete="username"
                      {...register('identifier', { required: true })}
                    />
                    {errors.identifier ? <p className="text-sm text-red-500">Informe o e-mail do admin.</p> : null}
                  </div>

                  <PasswordField
                    id="password"
                    label="Senha"
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    error={errors.password?.message}
                    {...register('password', { required: true })}
                  />

                  <LoginSessionOptions
                    rememberIdentifierId="merchant-remember-identifier"
                    rememberIdentifierChecked={rememberIdentifier}
                    onRememberIdentifierChange={(checked) => setValue('rememberIdentifier', checked)}
                    keepSignedInId="merchant-keep-signed-in"
                    keepSignedInChecked={keepSignedIn}
                    onKeepSignedInChange={(checked) => setValue('keepSignedIn', checked)}
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Processando...' : 'Entrar no painel'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <Card className="h-full shadow-sm">
    <CardHeader className="space-y-1">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">{icon}</div>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent />
  </Card>
);

export default MerchantPanel;
