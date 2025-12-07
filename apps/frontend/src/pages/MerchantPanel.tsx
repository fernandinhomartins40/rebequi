import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Shield, BarChart3, PackageSearch, Settings, Lock, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { login, updateAdminCredentials } from '@/services/api/auth';
import type { UpdateAdminCredentialsInput } from '@rebequi/shared/schemas';

const MERCHANT_PANEL_URL = import.meta.env.VITE_MERCHANT_PANEL_URL || '/painel-lojista/painel';

const MerchantPanel = () => {
  const { toast } = useToast();
  const [changingDefaults, setChangingDefaults] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UpdateAdminCredentialsInput>({
    defaultValues: {
      currentEmail: 'admin@rebequi.com',
      currentPassword: '',
      newEmail: 'admin@rebequi.com',
      newPassword: '',
    },
  });

  const onSubmit = async (values: UpdateAdminCredentialsInput) => {
    try {
      setLoading(true);

      if (changingDefaults) {
        await updateAdminCredentials(values);
        await login({ email: values.newEmail, password: values.newPassword });
        toast({
          title: 'Credenciais atualizadas',
          description: 'Você já está autenticado como administrador.',
        });
      } else {
        await login({ email: values.currentEmail, password: values.currentPassword });
        toast({
          title: 'Login realizado',
          description: 'Bem-vindo ao painel do lojista.',
        });
      }

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

  const newPassword = watch('newPassword');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12 flex items-center">
      <div className="container mx-auto">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:[grid-template-columns:1.15fr_0.85fr] lg:items-center lg:gap-14">
          <div className="space-y-6">
            <header className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                <Shield className="h-4 w-4" /> Painel do Lojista
              </div>
              <h1 className="text-3xl font-bold">Controle total da sua loja</h1>
              <p className="text-muted-foreground">
                Acesse com o usuário administrador padrão para gerenciar produtos, pedidos e configurações.
                No primeiro acesso, altere o email e a senha padrão para manter a segurança.
              </p>
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Credenciais padrão (alterar no primeiro acesso)</p>
                <p>
                  Email: <span className="font-mono">admin@rebequi.com</span>
                </p>
                <p>
                  Senha: <span className="font-mono">Admin@123</span>
                </p>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FeatureCard
                icon={<PackageSearch className="h-6 w-6 text-primary" />}
                title="Produtos"
                description="Cadastre e organize catálogo, estoque e imagens."
              />
              <FeatureCard
                icon={<BarChart3 className="h-6 w-6 text-primary" />}
                title="Vendas"
                description="Acompanhe pedidos e indicadores em tempo real."
              />
              <FeatureCard
                icon={<Settings className="h-6 w-6 text-primary" />}
                title="Configurações"
                description="Controle usuários, permissões e dados da loja."
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
                <CardDescription>Use o admin padrão ou altere credenciais no primeiro login.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-2">
                    <Label htmlFor="currentEmail">Email do administrador</Label>
                    <Input
                      id="currentEmail"
                      type="email"
                      placeholder="admin@rebequi.com"
                      {...register('currentEmail', { required: true })}
                    />
                    {errors.currentEmail && <p className="text-sm text-red-500">Informe o email do admin.</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Senha atual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Admin@123"
                      {...register('currentPassword', { required: true })}
                    />
                    {errors.currentPassword && <p className="text-sm text-red-500">Informe a senha atual.</p>}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="change-defaults"
                      checked={changingDefaults}
                      onCheckedChange={(val) => setChangingDefaults(Boolean(val))}
                    />
                    <Label htmlFor="change-defaults" className="text-sm">
                      Alterar email e senha padrão no primeiro acesso
                    </Label>
                  </div>

                  {changingDefaults && (
                    <div className="rounded-md border bg-slate-50 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <KeyRound className="h-4 w-4" /> Novas credenciais
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newEmail">Novo email</Label>
                        <Input
                          id="newEmail"
                          type="email"
                          placeholder="novo-email@rebequi.com"
                          {...register('newEmail', { required: true })}
                        />
                        {errors.newEmail && <p className="text-sm text-red-500">Novo email é obrigatório.</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">Nova senha</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="Nova senha forte"
                          {...register('newPassword', { required: true, minLength: 8 })}
                        />
                        {errors.newPassword && <p className="text-sm text-red-500">Nova senha inválida.</p>}
                        {newPassword && (
                          <p className="text-xs text-muted-foreground">
                            Use maiúscula, minúscula, número e caractere especial.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Processando...' : changingDefaults ? 'Atualizar e acessar' : 'Entrar no painel'}
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
  <Card className="shadow-sm h-full">
    <CardHeader className="space-y-1">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">{icon}</div>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent></CardContent>
  </Card>
);

export default MerchantPanel;
