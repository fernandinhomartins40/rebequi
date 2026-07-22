import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  Plug,
  RefreshCcw,
  Save,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  fetchOpenRouterConfig,
  testOpenRouterConnection,
  updateOpenRouterConfig,
  type OpenRouterConfig,
  type OpenRouterTestResult,
} from '@/services/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { DashboardPanel, PageHeader } from './components';

type FormState = {
  enabled: boolean;
  apiKey: string;
  primaryModel: string;
  fallbackModel: string;
  timeoutMs: number;
  referer: string;
  title: string;
};

const FREE_VISION_MODELS = [
  'qwen/qwen2.5-vl-72b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-4-maverick:free',
];

const PAID_VISION_MODELS = [
  'qwen/qwen3-vl-8b-instruct',
  'qwen/qwen-vl-plus',
  'qwen/qwen2.5-vl-72b-instruct',
];

function dateLabel(value: string | null) {
  if (!value) return 'nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'nunca';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function MerchantDashboardIntegrations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const configQuery = useQuery({
    queryKey: ['integrations', 'openrouter'],
    queryFn: fetchOpenRouterConfig,
  });

  const [form, setForm] = useState<FormState | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const [testResult, setTestResult] = useState<OpenRouterTestResult | null>(null);

  useEffect(() => {
    if (configQuery.data && !form) {
      setForm({
        enabled: configQuery.data.enabled,
        apiKey: '',
        primaryModel: configQuery.data.primaryModel,
        fallbackModel: configQuery.data.fallbackModel,
        timeoutMs: configQuery.data.timeoutMs,
        referer: configQuery.data.referer,
        title: configQuery.data.title,
      });
    }
  }, [configQuery.data, form]);

  const saveMutation = useMutation({
    mutationFn: (state: FormState) =>
      updateOpenRouterConfig({
        enabled: state.enabled,
        apiKey: apiKeyDirty ? state.apiKey.trim() : undefined,
        primaryModel: state.primaryModel,
        fallbackModel: state.fallbackModel,
        timeoutMs: state.timeoutMs,
        referer: state.referer,
        title: state.title,
      }),
    onSuccess: (next) => {
      queryClient.setQueryData<OpenRouterConfig>(['integrations', 'openrouter'], next);
      setApiKeyDirty(false);
      setForm((prev) => (prev ? { ...prev, apiKey: '' } : prev));
      toast({
        title: 'Configuração salva',
        description: 'Cadeia OCR via OpenRouter atualizada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: (apiKey?: string) => testOpenRouterConnection(apiKey),
    onSuccess: (result) => {
      setTestResult(result);
      toast({
        variant: result.ok ? 'default' : 'destructive',
        title: result.ok ? 'Conexão validada' : 'Falha no teste',
        description: result.message,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha no teste',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });

  if (configQuery.isLoading || !form) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (configQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Não foi possível carregar a configuração. Tente novamente.
      </div>
    );
  }

  const config = configQuery.data;
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (form) saveMutation.mutate(form);
  };

  const handleApiKeyChange = (value: string) => {
    setApiKeyDirty(true);
    setForm((prev) => (prev ? { ...prev, apiKey: value } : prev));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="OpenRouter (OCR de orçamentos)"
        description="Habilita uma cadeia de modelos VLM grátis/pagos para reconhecer listas de materiais. Quando indisponível, o sistema cai automaticamente no PaddleOCR atual."
        actions={
          <Button asChild variant="outline" size="sm">
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noreferrer"
              className="gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Obter chave
            </a>
          </Button>
        }
      />

      {/* Status atual */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatusCard
          label="Status"
          value={config?.enabled ? 'Ativado' : 'Desativado'}
          tone={config?.enabled ? 'green' : 'slate'}
          icon={config?.enabled ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        />
        <StatusCard
          label="Chave de API"
          value={config?.hasApiKey ? config.apiKeyPreview || 'configurada' : 'não configurada'}
          tone={config?.hasApiKey ? 'green' : 'yellow'}
          icon={<KeyRound className="h-4 w-4" />}
        />
        <StatusCard
          label="Última atualização"
          value={dateLabel(config?.updatedAt ?? null)}
          tone="slate"
          icon={<RefreshCcw className="h-4 w-4" />}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <DashboardPanel title="Conexão" description="Credenciais e identificação enviadas ao OpenRouter." accent="blue">
          <div className="space-y-5">
            {/* Toggle enabled */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="min-w-0">
                <Label className="text-sm font-semibold">Usar OpenRouter no OCR</Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Quando desativado o sistema usa apenas o PaddleOCR clássico (comportamento atual).
                </p>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) => setForm({ ...form, enabled: checked })}
              />
            </div>

            {/* API key */}
            <div className="space-y-1.5">
              <Label htmlFor="api-key">Chave de API</Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder={config?.hasApiKey ? `Substituir (atual: ${config.apiKeyPreview})` : 'sk-or-v1-…'}
                  value={form.apiKey}
                  onChange={(event) => handleApiKeyChange(event.target.value)}
                  autoComplete="off"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((value) => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
                  aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                A chave fica criptografada no banco. Deixe em branco para manter a atual; informe e salve em branco
                para remover.
              </p>
              {apiKeyDirty && form.apiKey.trim() !== '' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => testMutation.mutate(form.apiKey.trim())}
                  disabled={testMutation.isPending}
                  className="mt-1 gap-1.5"
                >
                  {testMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Testar com esta chave (sem salvar)
                </Button>
              ) : null}
            </div>

            {/* Referer / Title */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="referer">HTTP-Referer</Label>
                <Input
                  id="referer"
                  type="url"
                  value={form.referer}
                  onChange={(event) => setForm({ ...form, referer: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="title">X-Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                />
              </div>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Modelos VLM"
          description="O modelo principal é tentado primeiro; se falhar ou esgotar quota, cai no fallback. Se ambos falharem, usa o PaddleOCR local."
          accent="yellow"
        >
          <div className="space-y-5">
            <ModelField
              id="primary-model"
              label="Modelo principal"
              hint="Recomendado: free com maior qualidade (Qwen2.5-VL-72B)."
              value={form.primaryModel}
              onChange={(value) => setForm({ ...form, primaryModel: value })}
            />
            <ModelField
              id="fallback-model"
              label="Modelo de fallback"
              hint="Recomendado: outro modelo free para alternar quando o primário falhar."
              value={form.fallbackModel}
              onChange={(value) => setForm({ ...form, fallbackModel: value })}
            />

            <div className="space-y-1.5">
              <Label htmlFor="timeout">Timeout por chamada (ms)</Label>
              <Input
                id="timeout"
                type="number"
                min={2000}
                max={60000}
                step={500}
                value={form.timeoutMs}
                onChange={(event) => setForm({ ...form, timeoutMs: Number(event.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Limite por modelo. Após estourar, o sistema tenta o próximo modelo da cadeia.
              </p>
            </div>
          </div>
        </DashboardPanel>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || !config?.hasApiKey}
            className="gap-1.5"
          >
            {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Testar conexão salva
          </Button>
          <Button type="submit" disabled={saveMutation.isPending} className="gap-1.5">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </form>

      {testResult ? (
        <div
          className={cn(
            'rounded-xl border p-4 text-sm',
            testResult.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          )}
        >
          <div className="flex items-start gap-2">
            {testResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            )}
            <div className="min-w-0">
              <p className="font-semibold">{testResult.ok ? 'Conexão OK' : 'Falha na conexão'}</p>
              <p className="mt-1">{testResult.message}</p>
              {testResult.ok && testResult.modelCount ? (
                <p className="mt-1 text-xs">
                  {testResult.modelCount} modelos disponíveis na sua conta.
                  {testResult.sampleModels && testResult.sampleModels.length > 0
                    ? ` Exemplos: ${testResult.sampleModels.slice(0, 3).join(', ')}.`
                    : null}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <DashboardPanel
        title="Como funciona"
        description="Fluxo de OCR de orçamentos com a configuração ativa."
        accent="blue"
      >
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              1
            </span>
            <span>
              Cliente envia foto da lista. Sistema tenta o <strong>modelo principal</strong> no OpenRouter.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              2
            </span>
            <span>
              Se falhar (timeout, erro 5xx, quota): tenta o <strong>modelo de fallback</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              3
            </span>
            <span>
              Se ambos falharem: usa o <strong>PaddleOCR local</strong> como rede de segurança (não custa nada, sempre funciona).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
              4
            </span>
            <span>
              O texto reconhecido passa pelo normalizador de domínio (sinônimos de construção civil) e faz matching com o catálogo.
            </span>
          </li>
        </ol>
      </DashboardPanel>
    </div>
  );
}

function StatusCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: 'green' | 'yellow' | 'slate';
  icon: React.ReactNode;
}) {
  const tones = {
    green: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    yellow: 'border-amber-200 bg-amber-50 text-amber-800',
    slate: 'border-border/70 bg-card text-foreground',
  } as const;
  return (
    <div className={cn('rounded-xl border p-4', tones[tone])}>
      <div className="flex items-center gap-2 text-xs font-medium">
        {icon}
        {label}
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function ModelField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const allOptions = [...FREE_VISION_MODELS, ...PAID_VISION_MODELS];
  const listId = `${id}-suggestions`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} list={listId} value={value} onChange={(event) => onChange(event.target.value)} />
      <datalist id={listId}>
        {allOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {FREE_VISION_MODELS.map((model) => (
          <button
            key={model}
            type="button"
            onClick={() => onChange(model)}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-medium transition',
              value === model
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/50'
            )}
          >
            <Plug className="mr-1 inline h-2.5 w-2.5" />
            {model.split('/').pop()}
          </button>
        ))}
      </div>
    </div>
  );
}
