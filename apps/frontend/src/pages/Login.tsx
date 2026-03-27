import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
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

const LOGIN_PREFERENCES_STORAGE_KEY = 'rebequi:auth:customer-login';

type LoginFormValues = LoginInput & {
  rememberIdentifier: boolean;
};

const loginFormSchema = loginSchema.extend({
  rememberIdentifier: z.boolean().default(false),
});

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const { initialPreferences, persistPreferences } = useLoginPreferences(LOGIN_PREFERENCES_STORAGE_KEY);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
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

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
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

      toast({
        title: 'Login realizado',
        description: 'Sessão autenticada com sucesso.',
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
          <CardDescription>Acesse sua conta para continuar com a sessão real da aplicação.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="identifier">WhatsApp ou e-mail</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="(11) 99999-0000 ou admin@rebequi.com.br"
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
              rememberIdentifierId="remember-identifier"
              rememberIdentifierChecked={rememberIdentifier}
              onRememberIdentifierChange={(checked) => setValue('rememberIdentifier', checked)}
              keepSignedInId="keep-signed-in"
              keepSignedInChecked={keepSignedIn}
              onKeepSignedInChange={(checked) => setValue('keepSignedIn', checked)}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ainda não tem acesso?{' '}
            <Link to="/registrar" className="font-semibold text-primary hover:underline">
              Cadastro rápido
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
