import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import {
  INTERNAL_USER_ROLES,
  MERCHANT_ROLE_PROFILES,
  getMerchantPermissionLabel,
  getMerchantRoleDescription,
  getMerchantRoleLabel,
  type InternalUserRole,
} from '@rebequi/shared/constants';
import type { CreateManagedUserDTO, ManagedUserRole, UpdateManagedUserDTO, User } from '@rebequi/shared/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { useToast } from '@/components/ui/use-toast';
import { createManagedUser, updateManagedUser } from '@/services/api/users';

type UserEditorFields = {
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  name: string;
  password: string;
  role: ManagedUserRole;
  whatsapp: string;
};

function createEmptyValues(): UserEditorFields {
  return {
    email: '',
    isActive: true,
    mustChangePassword: true,
    name: '',
    password: '',
    role: 'MANAGER',
    whatsapp: '',
  };
}

function buildCreatePayload(fields: UserEditorFields): CreateManagedUserDTO {
  return {
    email: fields.email.trim(),
    isActive: fields.isActive,
    mustChangePassword: fields.mustChangePassword,
    name: fields.name.trim(),
    password: fields.password,
    role: fields.role,
    whatsapp: fields.whatsapp.trim() || undefined,
  };
}

function buildUpdatePayload(fields: UserEditorFields): UpdateManagedUserDTO {
  const payload: UpdateManagedUserDTO = {
    email: fields.email.trim(),
    isActive: fields.isActive,
    mustChangePassword: fields.mustChangePassword,
    name: fields.name.trim(),
    role: fields.role,
    whatsapp: fields.whatsapp.trim(),
  };

  if (fields.password.trim()) {
    payload.password = fields.password;
  }

  return payload;
}

export function UserEditorDialog({
  open,
  onOpenChange,
  onSaved,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  user?: User | null;
}) {
  const { toast } = useToast();
  const isEditing = Boolean(user);

  const { register, handleSubmit, reset, watch, formState } = useForm<UserEditorFields>({
    defaultValues: createEmptyValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!user) {
      reset(createEmptyValues());
      return;
    }

    reset({
      email: user.email || user.identifier,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      name: user.name,
      password: '',
      role: user.role as ManagedUserRole,
      whatsapp: user.whatsapp || '',
    });
  }, [open, reset, user]);

  const selectedRole = (watch('role') || 'MANAGER') as InternalUserRole;
  const selectedRoleProfile = MERCHANT_ROLE_PROFILES[selectedRole];

  const saveMutation = useMutation({
    mutationFn: async (fields: UserEditorFields) => {
      if (!fields.name.trim()) {
        throw new Error('Informe o nome do usuario.');
      }

      if (!fields.email.trim()) {
        throw new Error('Informe o e-mail do usuario.');
      }

      if (!isEditing && !fields.password.trim()) {
        throw new Error('Defina a senha inicial do usuario.');
      }

      return isEditing && user
        ? updateManagedUser(user.id, buildUpdatePayload(fields))
        : createManagedUser(buildCreatePayload(fields));
    },
    onSuccess: () => {
      toast({
        title: isEditing ? 'Usuario atualizado' : 'Usuario criado',
        description: 'As permissões do colaborador foram salvas com sucesso.',
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: isEditing ? 'Falha ao atualizar usuario' : 'Falha ao criar usuario',
        description: error instanceof Error ? error.message : 'Erro inesperado ao salvar o usuario.',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalContent size="lg">
        <ModalHeader>
          <ModalTitle>{isEditing ? 'Editar usuario interno' : 'Novo usuario interno'}</ModalTitle>
          <ModalDescription>
            Defina o papel de acesso do funcionario e controle as areas do painel liberadas para ele.
          </ModalDescription>
        </ModalHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit((fields) => {
            void saveMutation.mutateAsync(fields);
          })}
        >
          <ModalBody className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="staff-name">Nome</Label>
                <Input id="staff-name" placeholder="Ex.: Maria Oliveira" {...register('name', { required: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-email">E-mail</Label>
                <Input id="staff-email" type="email" placeholder="maria@empresa.com.br" {...register('email', { required: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-whatsapp">WhatsApp</Label>
                <Input id="staff-whatsapp" placeholder="11999990000" {...register('whatsapp')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-role">Role</Label>
                <select
                  id="staff-role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('role', { required: true })}
                >
                  {INTERNAL_USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {getMerchantRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff-password">{isEditing ? 'Redefinir senha' : 'Senha inicial'}</Label>
                <Input
                  id="staff-password"
                  type="password"
                  placeholder={isEditing ? 'Preencha somente para trocar' : 'Senha forte para o colaborador'}
                  {...register('password')}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white p-2 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-foreground">{getMerchantRoleLabel(selectedRole)}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{getMerchantRoleDescription(selectedRole)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoleProfile.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="inline-flex rounded-full border border-primary/15 bg-white px-3 py-1 text-xs font-semibold text-primary"
                      >
                        {getMerchantPermissionLabel(permission)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-muted/50 px-4 py-3 text-sm">
                <input type="checkbox" {...register('isActive')} />
                Usuario ativo
              </label>

              <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-muted/50 px-4 py-3 text-sm">
                <input type="checkbox" {...register('mustChangePassword')} />
                Exigir troca de senha no primeiro acesso
              </label>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || formState.isSubmitting}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? 'Salvar usuario' : 'Cadastrar usuario'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Dialog>
  );
}
