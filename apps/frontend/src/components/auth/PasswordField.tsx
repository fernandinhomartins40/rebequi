import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type PasswordFieldProps = Omit<React.ComponentProps<typeof Input>, 'type'> & {
  error?: string;
  label?: string;
  wrapperClassName?: string;
};

export function PasswordField({
  className,
  error,
  id = 'password',
  label = 'Senha',
  wrapperClassName,
  ...props
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={cn('space-y-2', wrapperClassName)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={isVisible ? 'text' : 'password'} className={cn('pr-11', className)} {...props} />
        <button
          type="button"
          onClick={() => setIsVisible((current) => !current)}
          aria-label={isVisible ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
    </div>
  );
}
