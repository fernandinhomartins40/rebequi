import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { loginSchema, type LoginInput } from '@rebequi/shared/schemas';
import { UserRole } from '@rebequi/shared/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginInput) => {
    try {
      setIsLoading(true);
      const user = await login(values);
      toast({
        title: 'Login realizado',
        description: 'Sessao autenticada com sucesso.',
      });
      navigate(user.role === UserRole.ADMIN ? '/painel-lojista/painel/visao-geral' : '/painel-cliente');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login';
      toast({
        variant: 'destructive',
        title: 'Falha no login',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <LogIn className="h-6 w-6 text-primary" />
            Entrar
          </CardTitle>
          <CardDescription>Acesse sua conta para continuar com a sessao real da aplicacao.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="identifier">WhatsApp ou email</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="(11) 99999-0000 ou admin@rebequi.com.br"
                autoComplete="username"
                {...registerField('identifier')}
              />
              {errors.identifier && <p className="text-sm text-red-500">{errors.identifier.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  {...registerField('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda nao tem acesso?{' '}
            <Link to="/registrar" className="font-semibold text-primary hover:underline">
              Cadastro rapido
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
