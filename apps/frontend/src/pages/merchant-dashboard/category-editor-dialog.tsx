import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import type { Category } from '@rebequi/shared/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createCategory, updateCategory } from '@/services/api/categories';

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

export function CategoryEditorDialog({
  category,
  open,
  onOpenChange,
  onSaved,
}: {
  category?: Category | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isEditing = Boolean(category);

  const { register, handleSubmit, reset, formState } = useForm<CategoryFormFields>({
    defaultValues: createEmptyValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!category) {
      reset(createEmptyValues());
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
  }, [category, open, reset]);

  const saveMutation = useMutation({
    mutationFn: async (fields: CategoryFormFields) => {
      const payload = buildPayload(fields);

      if (!payload.name) {
        throw new Error('Informe o nome da categoria.');
      }

      return isEditing && category
        ? updateCategory(category.id, payload)
        : createCategory(payload);
    },
    onSuccess: () => {
      toast({
        title: isEditing ? 'Categoria atualizada' : 'Categoria criada',
        description: 'A categoria foi salva com sucesso.',
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar categoria',
        description: error instanceof Error ? error.message : 'Erro inesperado ao salvar a categoria.',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>{isEditing ? 'Editar categoria' : 'Nova categoria'}</ModalTitle>
          <ModalDescription>Cadastre e mantenha as categorias usadas no formulario de produtos.</ModalDescription>
        </ModalHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={handleSubmit((fields) => {
            void saveMutation.mutateAsync(fields);
          })}
        >
          <ModalBody className="space-y-5">
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
                <Label htmlFor="category-icon">Icone</Label>
                <Input id="category-icon" placeholder="Hammer" {...register('icon')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-image">Imagem (URL)</Label>
                <Input id="category-image" placeholder="https://..." {...register('image')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-description">Descricao</Label>
              <Textarea
                id="category-description"
                rows={4}
                placeholder="Descricao usada para organizar a catalogacao de produtos."
                {...register('description')}
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50/90 px-4 py-3 text-sm">
              <input type="checkbox" {...register('isActive')} />
              Categoria ativa
            </label>
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || formState.isSubmitting}>
              {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? 'Salvar categoria' : 'Cadastrar categoria'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Dialog>
  );
}
