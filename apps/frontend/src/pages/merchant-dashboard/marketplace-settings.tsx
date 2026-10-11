import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MARKETPLACES, type MarketplaceType } from '@rebequi/shared/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { fetchMarketplaceSettings, saveMarketplaceSettings, type MarketplaceSettings } from '@/services/api/integrations';
import { authorizeMercadoLivre, testChannel } from '@/services/api/channels';
import { DashboardSection } from '@/components/dashboard/DashboardElements';
import { ADMIN_BASE_PATH } from './config';

export function MarketplaceSettingsPanel() {
  const [selected, setSelected] = useState<MarketplaceType>('MERCADO_LIVRE');
  const query = useQuery({ queryKey: ['marketplace-settings'], queryFn: fetchMarketplaceSettings });
  return <div className="space-y-5">
    <DashboardSection title="1. Escolha o marketplace">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">{MARKETPLACES.map(provider => <Button key={provider.type} variant={selected === provider.type ? 'default' : 'outline'} className="h-auto min-h-11 whitespace-normal" onClick={() => setSelected(provider.type)} aria-pressed={selected === provider.type}>{provider.name}</Button>)}</div>
    </DashboardSection>
    {query.isLoading ? <p role="status">Carregando configuração…</p> : query.isError ? <div role="alert" className="flex flex-wrap items-center gap-3"><p>Não foi possível consultar as configurações.</p><Button variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></div> : <MarketplaceCredentialsForm key={selected} provider={query.data?.find(provider => provider.type === selected) ?? { ...MARKETPLACES.find(provider => provider.type === selected)!, accounts: [] }} />}
  </div>;
}

function MarketplaceCredentialsForm({ provider }: { provider: MarketplaceSettings }) {
  const client = useQueryClient();
  const { toast } = useToast();
  const [accountId, setAccountId] = useState(provider.accounts.find(account => account.isActive)?.id ?? provider.accounts[0]?.id ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const account = provider.accounts.find(account => account.id === accountId);
  const dirty = removed.length > 0 || Object.values(values).some(value => value.trim());
  const save = useMutation({ mutationFn: () => saveMarketplaceSettings(provider.type, {
    channelId: accountId || undefined,
    credentials: { ...Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim())), ...Object.fromEntries(removed.map(key => [key, null])) },
  }), onSuccess: async data => {
    setAccountId(data.channelId); setValues({}); setRemoved([]); setResult(null);
    await Promise.all([client.invalidateQueries({ queryKey: ['marketplace-settings'] }), client.invalidateQueries({ queryKey: ['merchant-dashboard', 'channels'] })]);
    toast({ title: 'Credenciais salvas com segurança', description: 'Agora autorize ou teste a conta.' });
  }, onError: error => toast({ variant: 'destructive', title: 'Não foi possível salvar', description: error.message }) });
  const test = useMutation({ mutationFn: () => testChannel(accountId), onSuccess: setResult,
    onError: error => setResult({ ok: false, message: error.message }) });
  const authorize = useMutation({ mutationFn: () => authorizeMercadoLivre(accountId), onSuccess: data => window.location.assign(data.url),
    onError: error => setResult({ ok: false, message: error.message }) });
  const busy = save.isPending || test.isPending || authorize.isPending;
  const submit = (event: FormEvent) => { event.preventDefault(); save.mutate(); };
  const requiresWww = window.location.hostname === 'rebequi.com.br';
  return <div className="space-y-5">
    <DashboardSection title={`2. Configure ${provider.name}`} description="Preencha apenas o que deseja cadastrar ou substituir. Campos vazios preservam os valores salvos.">
      {provider.accounts.length > 1 ? <div className="mb-4 space-y-2"><Label htmlFor="marketplace-account">Conta</Label><select id="marketplace-account" className="h-10 w-full rounded-md border bg-background px-3" value={accountId} onChange={event => { setAccountId(event.target.value); setValues({}); setRemoved([]); setResult(null); }}>{provider.accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div> : null}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">{provider.fields.map(field => {
          const configured = account?.configuredFields.includes(field.key);
          const isRemoved = removed.includes(field.key);
          const id = `marketplace-${provider.type}-${field.key}`;
          return <div key={field.key} className="space-y-2"><div className="flex flex-wrap items-center justify-between gap-2"><Label htmlFor={id}>{field.label}</Label>{configured ? <span className="text-xs text-green-700">Cadastrado</span> : null}</div>
            {field.options ? <select id={id} className="h-10 w-full rounded-md border bg-background px-3" disabled={busy || isRemoved} value={values[field.key] ?? ''} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))}><option value="">{configured ? 'Manter configuração atual' : 'Selecione'}</option>{field.options.map(option => <option key={option} value={option}>{({ homologation: 'Homologação', production: 'Produção', 'self-operated': 'Operação própria', 'semi-managed': 'Semigerenciada', 'fully-managed': 'Totalmente gerenciada' } as Record<string, string>)[option] ?? option}</option>)}</select> : <Input id={id} type={field.secret ? 'password' : 'text'} autoComplete={field.secret ? 'new-password' : 'off'} maxLength={4096} disabled={busy || isRemoved} value={values[field.key] ?? ''} placeholder={configured ? 'Deixe vazio para manter' : field.label} onChange={event => setValues(current => ({ ...current, [field.key]: event.target.value }))} />}
            {configured ? <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" disabled={busy} checked={isRemoved} onChange={event => setRemoved(current => event.target.checked ? [...current, field.key] : current.filter(key => key !== field.key))} />Remover este valor ao salvar</label> : null}
          </div>;
        })}</div>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={busy || !dirty}>{save.isPending ? 'Salvando…' : 'Salvar credenciais'}</Button><a className="text-sm text-blue-600 underline" target="_blank" rel="noreferrer" href={provider.docs}>Abrir portal do marketplace</a></div>
      </form>
    </DashboardSection>
    <DashboardSection title="3. Autorize e confira" description="Salvar credenciais não comprova conexão. O resultado do teste aparece abaixo.">
      {requiresWww && provider.authorization === 'oauth' ? <p className="mb-3 text-sm"><a className="text-blue-600 underline" href={`https://www.rebequi.com.br${ADMIN_BASE_PATH}/integrações?tab=marketplaces`}>Abra o painel em www.rebequi.com.br</a> para concluir a autorização com sua sessão.</p> : null}
      {dirty ? <p className="mb-3 text-sm text-muted-foreground">Salve as alterações antes de testar.</p> : null}
      <div className="flex flex-wrap gap-2">
        {provider.type === 'MERCADO_LIVRE' ? <Button disabled={busy || Boolean(dirty) || !account?.isActive || requiresWww} onClick={() => authorize.mutate()}>{authorize.isPending ? 'Abrindo autorização…' : 'Autorizar conta'}</Button> : null}
        <Button variant="outline" disabled={busy || Boolean(dirty) || !account?.isActive || !account.configuredFields.length} onClick={() => { setResult(null); test.mutate(); }}>{test.isPending ? 'Testando…' : 'Testar conexão'}</Button>
        {account ? <Button variant="outline" asChild><Link to={`${ADMIN_BASE_PATH}/canais/${account.id}`}>Abrir canal</Link></Button> : null}
      </div>
      {result ? <p role={result.ok ? 'status' : 'alert'} className={`mt-3 rounded-lg border p-3 text-sm ${result.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{result.message}</p> : null}
    </DashboardSection>
  </div>;
}
