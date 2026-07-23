import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  INTERNAL_USER_ROLES,
  MERCHANT_ROLE_PROFILES,
  getMerchantPermissionLabel,
  getMerchantRoleDescription,
  getMerchantRoleLabel,
  type InternalUserRole,
} from '@rebequi/shared/constants';
import type { CreateManagedUserDTO, ManagedUserRole, UpdateManagedUserDTO } from '@rebequi/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { createManagedUser, fetchManagedUsers, updateManagedUser } from '@/services/api/users';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, EditorBackLink, EditorError, EditorFooter, EditorLoading, PageHeader } from './components';

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

const BACK_HREF = `${ADMIN_BASE_PATH}/acesso`;

export function MerchantUserEditorPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditing = Boolean(userId);

  const usersQuery = useQuery({
    queryKey: ['managed-users', 'snapshot'],
    queryFn: () => fetchManagedUsers({ includeInactive: true, page: 1, limit: 100 }),
    enabled: isEditing,
  });

  const user = isEditing ? usersQuery.data?.users.find((item) => item.id === userId) ?? null : null;

  const { register, handleSubmit, reset, watch, formState } = useForm<UserEditorFields>({
    defaultValues: createEmptyValues(),
  });

  useEffect(() => {
    if (!user) {
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
  }, [reset, user]);

  const selectedRole = (watch('role') || 'MANAGER') as InternalUserRole;
  const selectedRoleProfile = MERCHANT_ROLE_PROFILES[selectedRole];

  const saveMutation = useMutation({
    mutationFn: async (fields: UserEditorFields) => {
      if (!fields.name.trim()) {
        throw new Error('Informe o nome do usuário.');
      }

      if (!fields.email.trim()) {
        throw new Error('Informe o e-mail do usuário.');
      }

      if (!isEditing && !fields.password.trim()) {
        throw new Error('Defina a senha inicial do usuário.');
      }

      return isEditing && user
        ? updateManagedUser(user.id, buildUpdatePayload(fields))
        : createManagedUser(buildCreatePayload(fields));
    },
    onSuccess: async () => {
      toast({
        title: isEditing ? 'Usuário atualizado' : 'Usuário criado',
        description: 'As permissões do colaborador foram salvas com sucesso.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['managed-users'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['auth'] }),
      ]);
      navigate(BACK_HREF);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: isEditing ? 'Falha ao atualizar usuário' : 'Falha ao criar usuário',
        description: error instanceof Error ? error.message : 'Erro inesperado ao salvar o usuário.',
      });
    },
  });

  if (isEditing && usersQuery.isLoading) {
    return <EditorLoading />;
  }

  if (isEditing && (usersQuery.isError || !user)) {
    return <EditorError message="Colaborador não encontrado." backTo={BACK_HREF} />;
  }

  return (
    <div className="space-y-6">
      <EditorBackLink to={BACK_HREF} label="Voltar para acesso" />

      <PageHeader
        title={isEditing ? 'Editar usuário interno' : 'Novo usuário interno'}
        description="Defina o papel de acesso do colaborador e controle as áreas do painel liberadas para ele."
      />

      <form
        className="space-y-6"
        onSubmit={handleSubmit((fields) => {
          void saveMutation.mutateAsync(fields);
        })}
      >
        <DashboardPanel title="Dados do colaborador">
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
              <Label htmlFor="staff-role">Perfil</Label>
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
        </DashboardPanel>

        <DashboardPanel title="Permissões do perfil" description="Áreas do painel liberadas para o perfil selecionado.">
          <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="rounded-full border border-border/60 bg-background p-2 text-muted-foreground">
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
                    className="inline-flex rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {getMerchantPermissionLabel(permission)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" {...register('isActive')} />
              Usuário ativo
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" {...register('mustChangePassword')} />
              Exigir troca de senha no primeiro acesso
            </label>
          </div>
        </DashboardPanel>

        <EditorFooter>
          <Button type="button" variant="outline" onClick={() => navigate(BACK_HREF)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending || formState.isSubmitting}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditing ? 'Salvar usuário' : 'Cadastrar usuário'}
          </Button>
        </EditorFooter>
      </form>
    </div>
  );
}
