import { prepareQuotePhoto } from '@/lib/quote-photo';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QuoteAiUpdateBody, QuoteAiProvider } from '@rebequi/shared/schemas';
import { fetchQuoteAiConfig, updateQuoteAiConfig, testAiConnection, testAiRecognition, type AiTestResult } from '@/services/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DashboardHeading, DashboardSection } from '@/components/dashboard/DashboardElements';
import { useToast } from '@/components/ui/use-toast';
import { ImageCropDialog } from './image-crop-dialog';
import { QUOTE_IMAGE_CONFIG, IMAGE_UPLOAD_ACCEPT, readFileAsDataUrl } from './image-tools';
import { useSearchParams } from 'react-router-dom';
import { MarketplaceSettingsPanel } from './marketplace-settings';

export function MerchantDashboardIntegrations() {
 const [params, setParams] = useSearchParams();
 const isAi = params.get('tab') === 'ia';
 return <div className="space-y-5">
  <DashboardHeading title="Configurações de integrações" description="Conecte suas contas e confira cada integração em três passos." />
  <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de integração">
   <Button role="tab" aria-selected={!isAi} variant={!isAi ? 'default' : 'outline'} onClick={() => setParams({ tab: 'marketplaces' })}>Marketplaces</Button>
   <Button role="tab" aria-selected={isAi} variant={isAi ? 'default' : 'outline'} onClick={() => setParams({ tab: 'ia' })}>IA de orçamentos</Button>
  </div>
  {isAi ? <QuoteAiSettings /> : <MarketplaceSettingsPanel />}
 </div>;
}

function QuoteAiSettings() {
 const { toast } = useToast(); const client = useQueryClient();
 const config = useQuery({ queryKey: ['quote-ai'], queryFn: fetchQuoteAiConfig });
 const [form, setForm] = useState<QuoteAiUpdateBody>({ enabled: false, primaryProvider: 'deepseek', fallbackEnabled: true, qwenModel: 'qwen3-vl-flash', timeoutMs: 30000, maxTokens: 2500 });
 const [keys, setKeys] = useState({ deepseek: '', qwen: '' });
 const [remove, setRemove] = useState({ deepseek: false, qwen: false });
 const [file, setFile] = useState<File | null>(null);
 const [cropSource, setCropSource] = useState<{ url: string; name: string } | null>(null);
 const [connections, setConnections] = useState<Partial<Record<QuoteAiProvider, AiTestResult>>>({});
 const [result, setResult] = useState<AiTestResult | null>(null);
 useEffect(() => { if (config.data) {
  const { enabled, primaryProvider, fallbackEnabled, qwenModel, timeoutMs, maxTokens } = config.data;
  setForm({ enabled, primaryProvider, fallbackEnabled, qwenModel: qwenModel as 'qwen3-vl-flash' | 'qwen3-vl-plus', timeoutMs, maxTokens });
 } }, [config.data]);
 const save = useMutation({ mutationFn: updateQuoteAiConfig, onSuccess: data => {
  setKeys({ deepseek: '', qwen: '' }); setRemove({ deepseek: false, qwen: false }); setResult(null); setConnections({});
  client.setQueryData(['quote-ai'], data); toast({ title: 'Configuração salva' });
 }, onError: error => toast({ title: 'Não foi possível salvar', description: error.message, variant: 'destructive' }) });
 const showConnectionResult = (provider: QuoteAiProvider, data: AiTestResult) => {
  setConnections(current => ({ ...current, [provider]: data }));
  toast({ title: (provider === 'deepseek' ? 'DeepSeek' : 'Qwen') + (data.ok ? ': conexão validada' : ': falha na conexão'), description: data.message, variant: data.ok ? 'default' : 'destructive' });
 };
 const connection = useMutation({
  mutationFn: testAiConnection,
  onMutate: provider => setConnections(current => ({ ...current, [provider]: undefined })),
  onSuccess: (data, provider) => showConnectionResult(provider, data),
  onError: (error, provider) => showConnectionResult(provider, { ok: false, message: error.message }),
 });
 const recognition = useMutation({ mutationFn: async (file: File) => testAiRecognition((await prepareQuotePhoto(file)).file), onSuccess: setResult, onError: error => setResult({ ok: false, message: error.message }) });
 const submit = (event: FormEvent) => {
  event.preventDefault(); save.mutate({ ...form,
   deepseekApiKey: remove.deepseek ? null : keys.deepseek.trim() || undefined,
   qwenApiKey: remove.qwen ? null : keys.qwen.trim() || undefined,
  });
 };
 const dirty = keys.deepseek || keys.qwen || remove.deepseek || remove.qwen || (config.data && ['enabled', 'primaryProvider', 'fallbackEnabled', 'qwenModel', 'timeoutMs', 'maxTokens'].some(key => form[key as keyof QuoteAiUpdateBody] !== config.data![key as keyof typeof config.data]));
 const busy = save.isPending || connection.isPending || recognition.isPending;
 if (config.isLoading) return <p role="status">Carregando integrações…</p>;
 if (config.isError) return <div role="alert"><p>Não foi possível carregar a configuração.</p><Button onClick={() => config.refetch()}>Tentar novamente</Button></div>;
 return <div className="space-y-5">
  <DashboardHeading title="IA de orçamentos" description="As fotos são enviadas diretamente ao provedor escolhido. As chaves ficam criptografadas. Se a leitura falhar, o cliente pode revisar a lista manualmente." />
  <form onSubmit={submit} className="space-y-5">
   <DashboardSection title="1. Conectar os provedores">
    <div className="flex items-center justify-between gap-3 mb-5"><Label htmlFor="ai-enabled">Leitura automática</Label><Switch id="ai-enabled" checked={form.enabled} onCheckedChange={enabled => setForm(f => ({ ...f, enabled }))} /></div>
    <div className="grid gap-5 md:grid-cols-2">{(['deepseek', 'qwen'] as QuoteAiProvider[]).map(provider => {
     const configured = provider === 'deepseek' ? config.data?.hasDeepseekApiKey : config.data?.hasQwenApiKey;
     return <div key={provider} className="rounded-xl border p-4 space-y-3">
      <div className="flex justify-between gap-2"><h4 className="font-bold">{provider === 'deepseek' ? 'DeepSeek' : 'Qwen · Alibaba Cloud'}</h4><span className="text-xs text-muted-foreground">{configured ? 'Chave cadastrada' : 'Sem chave'}</span></div>
      <Label htmlFor={`key-${provider}`}>{configured ? 'Substituir chave' : 'Chave da API'}</Label>
      <Input id={`key-${provider}`} type="password" autoComplete="new-password" value={keys[provider]} disabled={remove[provider]} onChange={e => setKeys(k => ({ ...k, [provider]: e.target.value }))} placeholder={configured ? 'Deixe vazio para manter' : 'Cole a chave aqui'} />
      <div className="flex flex-wrap gap-3 items-center"><a className="text-sm text-blue-600 underline" target="_blank" rel="noreferrer" href={provider === 'deepseek' ? 'https://platform.deepseek.com/api_keys' : 'https://www.alibabacloud.com/help/en/model-studio/get-api-key'}>Obter chave</a>
       <Button type="button" variant="outline" size="sm" disabled={busy || Boolean(dirty) || !configured} aria-busy={connection.isPending && connection.variables === provider} onClick={() => connection.mutate(provider)}>{connection.isPending && connection.variables === provider ? 'Testando…' : 'Testar conexão'}</Button></div>
      {connections[provider] && <div data-testid={`connection-result-${provider}`} role={connections[provider]!.ok ? 'status' : 'alert'} className={connections[provider]!.ok ? 'rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800' : 'rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700'}>{connections[provider]!.message}</div>}
      {dirty && configured && <p className="text-xs text-muted-foreground">Salve as alterações para testar.</p>}
      {provider === 'qwen' && <p className="text-xs text-muted-foreground">Use uma chave da região Singapura (DashScope internacional).</p>}
      {configured && <label className="flex gap-2 text-xs items-center"><input type="checkbox" checked={remove[provider]} onChange={e => setRemove(r => ({ ...r, [provider]: e.target.checked }))} />Remover chave ao salvar</label>}
     </div>;
    })}</div>
   </DashboardSection>
   <DashboardSection title="2. Definir prioridade e limites">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
     <div className="space-y-2"><Label htmlFor="primary">Provedor principal</Label><select id="primary" className="w-full border rounded-md h-10 px-3" value={form.primaryProvider} onChange={e => setForm(f => ({ ...f, primaryProvider: e.target.value as QuoteAiProvider }))}><option value="deepseek">DeepSeek Flash</option><option value="qwen">Qwen</option></select></div>
     <div className="space-y-2"><Label htmlFor="qwen-model">Modelo Qwen</Label><select id="qwen-model" className="w-full border rounded-md h-10 px-3" value={form.qwenModel} onChange={e => setForm(f => ({ ...f, qwenModel: e.target.value as 'qwen3-vl-flash' | 'qwen3-vl-plus' }))}><option value="qwen3-vl-flash">VL Flash · econômico</option><option value="qwen3-vl-plus">VL Plus · maior capacidade</option></select></div>
     <div className="space-y-2"><Label htmlFor="max-tokens">Limite de tokens de saída</Label><Input id="max-tokens" type="number" min={512} max={8000} required value={form.maxTokens} onChange={e => setForm(f => ({ ...f, maxTokens: Number(e.target.value) }))} /></div>
     <div className="space-y-2"><Label htmlFor="timeout">Tempo por provedor (segundos)</Label><Input id="timeout" type="number" min={10} max={45} required value={(form.timeoutMs ?? 30000) / 1000} onChange={e => setForm(f => ({ ...f, timeoutMs: Number(e.target.value) * 1000 }))} /></div>
    </div>
    <div className="flex gap-3 items-center mt-5"><Switch id="fallback" checked={form.fallbackEnabled} onCheckedChange={fallbackEnabled => setForm(f => ({ ...f, fallbackEnabled }))} /><Label htmlFor="fallback">Usar o outro provedor se a leitura falhar</Label></div>
    <p className="text-xs text-muted-foreground mt-3">Até uma chamada por provedor. A reserva também pode consumir saldo. O limite de saída não inclui os tokens da imagem e da entrada.</p>
    <div className="mt-4"><Button type="submit" disabled={busy || !dirty}>{save.isPending ? 'Salvando…' : 'Salvar configuração'}</Button></div>
   </DashboardSection>
  </form>
  <DashboardSection title="3. Testar uma lista real" description="O teste usa a configuração salva e consome tokens na conta do provedor. Confira produtos e quantidades antes de liberar para os clientes.">
   {dirty && <p className="text-sm mb-3">Salve as alterações antes de testar.</p>}
   {!config.data?.enabled && <p className="text-sm mb-3">Ative a leitura automática após cadastrar uma chave.</p>}
   <p className="text-xs text-muted-foreground mb-3">Este teste consome tokens na conta do provedor.</p>
   <div className="flex flex-wrap gap-3"><Input aria-label="Foto da lista para teste" type="file" accept={IMAGE_UPLOAD_ACCEPT} className="max-w-sm" onChange={async e => { const selected = e.target.files?.[0]; e.target.value = ''; if (!selected) return; try { setCropSource({ url: await readFileAsDataUrl(selected), name: selected.name }); } catch (error) { toast({ variant: 'destructive', title: 'Imagem inválida', description: error instanceof Error ? error.message : 'Escolha outra imagem.' }); } }} /><Button disabled={busy || Boolean(dirty) || !file || !config.data?.enabled} onClick={() => file && recognition.mutate(file)}>{recognition.isPending ? 'Lendo…' : 'Testar leitura'}</Button></div>
   {file && <p className="mt-2 text-xs text-muted-foreground">Imagem preparada · {Math.ceil(file.size / 1024)} KB · WebP</p>}
   {result && <div className="mt-4 space-y-2" role="status"><p className={result.ok ? 'text-green-700' : 'text-red-600'}>{result.message}</p>{result.modelId && <p className="text-xs text-muted-foreground">{result.engine} · {result.modelId} · entrada {result.promptTokens ?? '—'} / saída {result.completionTokens ?? '—'} tokens</p>}
    {result.items?.length ? <ul className="divide-y">{result.items.map((item, index) => <li key={index} className="py-2 text-sm">{item.quantity ?? 1} {item.unit} · {item.text}</li>)}</ul> : null}
   </div>}
   <div className="mt-4 text-xs text-muted-foreground flex gap-4"><a href="https://api-docs.deepseek.com/quick_start/pricing/" target="_blank" rel="noreferrer">Preços DeepSeek</a><a href="https://www.alibabacloud.com/help/en/model-studio/model-pricing" target="_blank" rel="noreferrer">Preços Qwen</a></div>
  </DashboardSection>
 <ImageCropDialog config={QUOTE_IMAGE_CONFIG} open={Boolean(cropSource)} sourceUrl={cropSource?.url} fileName={cropSource?.name || 'lista'} onOpenChange={open => { if (!open) setCropSource(null); }} onConfirm={file => setFile(file)} />
 </div>;
}
