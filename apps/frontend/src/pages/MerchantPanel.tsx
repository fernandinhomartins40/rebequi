import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BarChart3, Lock, PackageSearch, Settings, Shield } from 'lucide-react';
import { isMerchantUserRole } from '@rebequi/shared/constants';
import { loginSchema, type LoginInput } from '@rebequi/shared/schemas';
import { z } from 'zod';
import { LoginSessionOptions } from '@/components/auth/LoginSessionOptions';
import { PasswordField } from '@/components/auth/PasswordField';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginPreferences } from '@/hooks/use-login-preferences';
import { getDefaultRouteForRole } from '@/lib/auth-routing';
import { getAppBasePath, withAppBasePath } from '@/lib/pwa-routing';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const MERCHANT_PANEL_URL = import.meta.env.VITE_MERCHANT_PANEL_URL;
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

      if (!isMerchantUserRole(user.role)) {
        await logout();
        throw new Error('Sua conta não possui acesso ao painel do lojista.');
      }

      toast({
        title: 'Login realizado',
        description: 'Acesso interno liberado.',
      });

      window.location.href = getAppBasePath()
        ? withAppBasePath(getDefaultRouteForRole(user.role))
        : MERCHANT_PANEL_URL || getDefaultRouteForRole(user.role);
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
    <div className="flex min-h-screen items-center bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#f8fafc_100%)] px-4 py-8 sm:px-6 sm:py-12">
      <div className="container mx-auto">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 xl:[grid-template-columns:1.1fr_0.9fr] xl:items-center xl:gap-12">
          <div className="space-y-5">
            <header className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <Shield className="h-4 w-4" /> Painel do Lojista
              </div>
              <h1 className="text-2xl font-bold sm:text-3xl">Acesso da equipe</h1>
              <p className="text-muted-foreground">Entre com uma conta interna para acessar as funções liberadas para o seu papel.</p>
            </header>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <FeatureCard
                icon={<PackageSearch className="h-6 w-6 text-primary" />}
                title="Catálogo"
                description="Cadastro e manutenção do catálogo."
              />
              <FeatureCard
                icon={<BarChart3 className="h-6 w-6 text-primary" />}
                title="Operação"
                description="Funcoes liberadas por role."
              />
              <FeatureCard
                icon={<Settings className="h-6 w-6 text-primary" />}
                title="Equipe"
                description="Controle de usuários e acessos."
              />
            </div>
          </div>

          <div className="w-full xl:max-w-xl xl:justify-self-end">
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Lock className="h-5 w-5 text-primary" />
                  Acesso do Lojista
                </CardTitle>
                <CardDescription>Entre com e-mail e senha da sua conta interna.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-2">
                    <Label htmlFor="identifier">E-mail ou identificador</Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="admin@rebequi.com.br"
                      autoComplete="username"
                      {...register('identifier')}
                    />
                    {errors.identifier ? <p className="text-sm text-red-500">{errors.identifier.message}</p> : null}
                  </div>

                  <PasswordField
                    id="password"
                    label="Senha"
                    placeholder="Sua senha"
                    autoComplete="current-password"
                    error={errors.password?.message}
                    {...register('password')}
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
  <Card className="h-full border-slate-200/80 shadow-sm">
    <CardHeader className="space-y-1">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">{icon}</div>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent />
  </Card>
);

export default MerchantPanel;
