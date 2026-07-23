import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createCategory, fetchCategories, updateCategory } from '@/services/api/categories';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, EditorBackLink, EditorError, EditorFooter, EditorLoading, PageHeader } from './components';

type CategoryFormFields = {
  name: string;
  slug: string;
  icon: string;
  image: string;
  description: string;
  isActive: boolean;
};

function createEmptyValues(): CategoryFormFields {
  return {
    name: '',
    slug: '',
    icon: '',
    image: '',
    description: '',
    isActive: true,
  };
}

function buildPayload(fields: CategoryFormFields) {
  return {
    name: fields.name.trim(),
    slug: fields.slug.trim() || undefined,
    icon: fields.icon.trim() || undefined,
    image: fields.image.trim() || undefined,
    description: fields.description.trim() || undefined,
    isActive: fields.isActive,
  };
}

const BACK_HREF = `${ADMIN_BASE_PATH}/produtos`;

export function MerchantCategoryEditorPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditing = Boolean(categoryId);

  const categoriesQuery = useQuery({
    queryKey: ['merchant-dashboard', 'categories', 'all'],
    queryFn: () => fetchCategories({ includeInactive: true }),
    enabled: isEditing,
  });

  const category = isEditing
    ? categoriesQuery.data?.categories.find((item) => item.id === categoryId) ?? null
    : null;

  const { register, handleSubmit, reset, formState } = useForm<CategoryFormFields>({
    defaultValues: createEmptyValues(),
  });

  useEffect(() => {
    if (!category) {
      return;
    }

    reset({
      name: category.name,
      slug: category.slug || '',
      icon: category.icon || '',
      image: category.image || '',
      description: category.description || '',
      isActive: category.isActive,
    });
  }, [category, reset]);

  const saveMutation = useMutation({
    mutationFn: async (fields: CategoryFormFields) => {
      const payload = buildPayload(fields);

      if (!payload.name) {
        throw new Error('Informe o nome da categoria.');
      }

      return isEditing && category ? updateCategory(category.id, payload) : createCategory(payload);
    },
    onSuccess: async () => {
      toast({
        title: isEditing ? 'Categoria atualizada' : 'Categoria criada',
        description: 'A categoria foi salva com sucesso.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
      ]);
      navigate(BACK_HREF);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar categoria',
        description: error instanceof Error ? error.message : 'Erro inesperado ao salvar a categoria.',
      });
    },
  });

  if (isEditing && categoriesQuery.isLoading) {
    return <EditorLoading />;
  }

  if (isEditing && (categoriesQuery.isError || !category)) {
    return <EditorError message="Categoria não encontrada." backTo={BACK_HREF} />;
  }

  return (
    <div className="space-y-6">
      <EditorBackLink to={BACK_HREF} label="Voltar para produtos" />

      <PageHeader
        title={isEditing ? 'Editar categoria' : 'Nova categoria'}
        description="Cadastre e mantenha as categorias usadas no formulário de produtos."
      />

      <form
        className="space-y-6"
        onSubmit={handleSubmit((fields) => {
          void saveMutation.mutateAsync(fields);
        })}
      >
        <DashboardPanel title="Dados da categoria">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nome</Label>
                <Input id="category-name" placeholder="Ex.: Ferramentas" {...register('name', { required: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-slug">Slug</Label>
                <Input id="category-slug" placeholder="ferramentas" {...register('slug')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-icon">Ícone</Label>
                <Input id="category-icon" placeholder="Hammer" {...register('icon')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-image">Imagem (URL)</Label>
                <Input id="category-image" placeholder="https://..." {...register('image')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Descrição</Label>
              <Textarea
                id="category-description"
                rows={4}
                placeholder="Descrição usada para organizar a catalogação de produtos."
                {...register('description')}
              />
            </div>

            <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" {...register('isActive')} />
              Categoria ativa
            </label>
          </div>
        </DashboardPanel>

        <EditorFooter>
          <Button type="button" variant="outline" onClick={() => navigate(BACK_HREF)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending || formState.isSubmitting}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditing ? 'Salvar categoria' : 'Cadastrar categoria'}
          </Button>
        </EditorFooter>
      </form>
    </div>
  );
}
