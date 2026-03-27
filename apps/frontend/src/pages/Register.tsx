import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@rebequi/shared/schemas';
import { formatWhatsapp } from '@rebequi/shared/utils';
import { register as registerRequest } from '@/services/api/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { saveProvisionalCredentials } from '@/lib/provisional-credentials';

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      whatsapp: '',
    },
  });

  const whatsappValue = watch('whatsapp');

  const onSubmit = async (values: RegisterInput) => {
    try {
      setIsLoading(true);
      const response = await registerRequest(values);
      saveProvisionalCredentials(response.provisionalCredentials);
      await refreshSession();

      toast({
        title: 'Acesso criado',
        description: response.provisionalCredentials
          ? `Usuário ${response.provisionalCredentials.identifier} criado com senha provisória ${response.provisionalCredentials.password}.`
          : 'Conta criada com sucesso.',
      });
      navigate('/painel-cliente');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao registrar';
      toast({
        variant: 'destructive',
        title: 'Falha no cadastro',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <Card className="w-full max-w-xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Cadastro rapido
          </CardTitle>
          <CardDescription>
            Informe somente seu nome e WhatsApp. O sistema cria um acesso provisório para você entrar no painel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" placeholder="Seu nome" autoComplete="name" {...register('name')} />
              {errors.name ? <p className="text-sm text-red-500">{errors.name.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp com DDD</Label>
              <Input
                id="whatsapp"
                inputMode="tel"
                placeholder="(11) 99999-0000"
                value={whatsappValue}
                {...register('whatsapp')}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
                  setValue('whatsapp', formatWhatsapp(digits), { shouldValidate: true });
                }}
              />
              {errors.whatsapp ? <p className="text-sm text-red-500">{errors.whatsapp.message}</p> : null}
            </div>

            <div className="rounded-[1.5rem] border border-[#e7dcc3] bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
              Usuário: número do WhatsApp informado.
              <br />
              Senha provisória: as 3 primeiras letras do seu nome.
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Criando acesso...' : 'Criar acesso'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem acesso?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
