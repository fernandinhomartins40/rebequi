import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { registerSchema } from '@rebequi/shared/schemas';
import type { RegisterInput } from '@rebequi/shared/schemas';
import { register as registerUser } from '@/services/api/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { z } from 'zod';

const formSchema = registerSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas nao coincidem',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof formSchema>;

const Register = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerField,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  const passwordStrength = useMemo(() => calculatePasswordStrength(passwordValue), [passwordValue]);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      const payload: RegisterInput = {
        email: values.email,
        name: values.name,
        password: values.password,
      };
      await registerUser(payload);
      toast({
        title: 'Conta criada',
        description: 'Cadastro realizado com sucesso! Voce ja esta autenticado.',
      });
      navigate('/');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Criar conta
          </CardTitle>
          <CardDescription>Cadastre-se para acompanhar pedidos e ofertas.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input id="name" placeholder="Seu nome" autoComplete="name" {...registerField('name')} />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seuemail@dominio.com"
                autoComplete="email"
                {...registerField('email')}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Crie uma senha forte"
                  autoComplete="new-password"
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
              <PasswordChecklist />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Forca da senha</span>
                  <span className={passwordStrength.colorClass}>{passwordStrength.label}</span>
                </div>
                <Progress value={passwordStrength.percentage} className="h-2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  autoComplete="new-password"
                  {...registerField('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
              {!errors.confirmPassword && confirmPasswordValue && (
                <p className={`text-sm ${passwordValue === confirmPasswordValue ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {passwordValue === confirmPasswordValue ? 'Senhas conferem' : 'Senhas diferentes'}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Cadastrando...' : 'Criar conta'}
              </Button>
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Ja tem conta?{' '}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

type PasswordStrength = {
  score: number;
  percentage: number;
  label: string;
  colorClass: string;
};

function calculatePasswordStrength(password: string): PasswordStrength {
  const checks = [
    /.{8,}/.test(password),
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
    /.{12,}/.test(password),
  ];

  const score = checks.filter(Boolean).length;
  const percentage = Math.min((score / checks.length) * 100, 100);

  if (!password) {
    return { score: 0, percentage: 0, label: 'Digite uma senha', colorClass: 'text-muted-foreground' };
  }

  if (score <= 3) {
    return { score, percentage, label: 'Fraca', colorClass: 'text-red-500' };
  }

  if (score === 4 || score === 5) {
    return { score, percentage, label: 'Boa', colorClass: 'text-amber-600' };
  }

  return { score, percentage, label: 'Excelente', colorClass: 'text-emerald-600' };
}

const PasswordChecklist = () => (
  <ul className="text-xs text-muted-foreground space-y-1">
    <li>• Minimo 8 caracteres</li>
    <li>• Pelo menos uma letra maiuscula</li>
    <li>• Pelo menos uma letra minuscula</li>
    <li>• Pelo menos um numero</li>
    <li>• Pelo menos um caractere especial</li>
  </ul>
);

export default Register;
