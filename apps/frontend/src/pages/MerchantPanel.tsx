import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { BarChart3, Lock, PackageSearch, Settings, Shield } from 'lucide-react';
import type { LoginInput } from '@rebequi/shared/schemas';
import { UserRole } from '@rebequi/shared/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

const MERCHANT_PANEL_URL = import.meta.env.VITE_MERCHANT_PANEL_URL || '/painel-lojista/painel/produtos';

const MerchantPanel = () => {
  const { toast } = useToast();
  const { login, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginInput) => {
    try {
      setLoading(true);
      const user = await login(values);

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
              <p className="text-muted-foreground">
                Entre com uma conta ADMIN para acessar a área interna da operação.
              </p>
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
                description="Autenticacao administrativa com controle de acesso."
              />
              <FeatureCard
                icon={<Settings className="h-6 w-6 text-primary" />}
                title="Plataforma"
                description="Painel estruturado para expansão de novas ?reas."
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
                <CardDescription>Entre com email e senha de administrador.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-2">
                    <Label htmlFor="identifier">Email do administrador</Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="admin@rebequi.com.br"
                      {...register('identifier', { required: true })}
                    />
                    {errors.identifier && <p className="text-sm text-red-500">Informe o email do admin.</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Sua senha"
                      {...register('password', { required: true })}
                    />
                    {errors.password && <p className="text-sm text-red-500">Informe a senha.</p>}
                  </div>

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
