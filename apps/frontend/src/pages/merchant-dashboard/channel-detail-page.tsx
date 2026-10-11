import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Loader2, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  formatCurrency,
  getChannelStatusLabel,
  getChannelStatusTone,
  getChannelTypeLabel,
  getListingStatusLabel,
  getListingStatusTone,
} from '@/lib/channel-ui';
import {
  fetchChannelById,
  fetchChannelListings,
  publishListing,
  removeListing,
  syncListing,
  updateChannel,
  testChannel,
  authorizeMercadoLivre,
} from '@/services/api/channels';
import { fetchAdminProducts } from '@/services/api/products';
import type { ChannelListing } from '@/types';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, EditorBackLink, PageHeader } from './components';

export function MerchantChannelDetailPage() {
  const needsCanonicalHost = window.location.hostname === 'rebequi.com.br';
  const { channelId } = useParams<{ channelId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [productSearch, setProductSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const debouncedProductSearch = useDebouncedValue(productSearch, 300);

  const channelQuery = useQuery({
    queryKey: ['merchant-dashboard', 'channels', 'detail', channelId],
    queryFn: () => fetchChannelById(channelId as string),
    enabled: Boolean(channelId),
  });

  const listingsQuery = useQuery({
    queryKey: ['merchant-dashboard', 'channels', 'listings', channelId],
    queryFn: () => fetchChannelListings(channelId as string, { limit: 100, page: 1 }),
    enabled: Boolean(channelId),
  });

  const productsQuery = useQuery({
    queryKey: ['merchant-dashboard', 'channels', 'product-search', debouncedProductSearch],
    queryFn: () => fetchAdminProducts({ search: debouncedProductSearch.trim() || undefined, isActive: true, limit: 20 }),
    enabled: Boolean(channelId) && debouncedProductSearch.trim().length > 0,
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'channels'] }),
    ]);

  const publishMutation = useMutation({
    mutationFn: (productId: string) => publishListing(channelId as string, { productId }),
    onSuccess: async (result) => {
      await invalidate();
      setProductSearch('');
      toast({ title: 'Produto publicado', description: result.message });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao publicar', description: error instanceof Error ? error.message : 'Erro inesperado.' });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (listingId: string) => syncListing(channelId as string, listingId),
    onSuccess: async (result) => {
      await invalidate();
      toast({ title: 'Anúncio sincronizado', description: result.message });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao sincronizar', description: error instanceof Error ? error.message : 'Erro inesperado.' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (listingId: string) => removeListing(channelId as string, listingId),
    onSuccess: async () => {
      await invalidate();
      toast({ title: 'Anúncio removido' });
    },
  });

  const channel = channelQuery.data;
  const connectMutation = useMutation({
    mutationFn: async () => {
      if (clientId.trim() || clientSecret.trim()) {
        if (!clientId.trim() || !clientSecret.trim()) throw new Error('Informe o ID e o segredo da aplicação.');
        await updateChannel(channelId as string, { credentials: { clientId: clientId.trim(), clientSecret: clientSecret.trim() } });
      }
      return authorizeMercadoLivre(channelId as string);
    },
    onSuccess: result => { setClientSecret(''); window.location.assign(result.url); },
    onError: error => toast({ variant: 'destructive', title: 'Não foi possível conectar', description: error instanceof Error ? error.message : 'Tente novamente.' }),
  });
  const testMutation = useMutation({
    mutationFn: () => testChannel(channelId as string),
    onSuccess: async result => { await invalidate(); toast({ title: result.ok ? 'Conta verificada' : 'Revise a conexão', description: result.message, variant: result.ok ? 'default' : 'destructive' }); },
    onError: error => toast({ variant: 'destructive', title: 'Falha na conexão', description: error instanceof Error ? error.message : 'Tente novamente.' }),
  });
  const listings = listingsQuery.data?.listings ?? [];
  const listedProductIds = new Set(listings.map((l) => l.productId));
  const searchResults = (productsQuery.data?.products ?? []).filter((p) => !listedProductIds.has(p.id));

  return (
    <div className="space-y-6">
      <EditorBackLink to={`${ADMIN_BASE_PATH}/canais`} label="Voltar para canais" />
      <PageHeader
        title={channel?.name ?? 'Canal'}
        description={channel ? getChannelTypeLabel(channel.type) : 'Carregando…'}
        actions={
          channel ? (
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getChannelStatusTone(channel.status)}`}>
              {getChannelStatusLabel(channel.status)}
            </span>
          ) : undefined
        }
      />

      {channel?.capabilities?.accountAuthorization ? (
        <DashboardPanel title="Conectar Mercado Livre" description="1. Configure a aplicação · 2. Autorize a conta · 3. Confira a conexão">
          {needsCanonicalHost ? <p className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Para concluir a autorização com sua sessão, <a className="font-semibold underline" href={`https://www.rebequi.com.br${window.location.pathname}`}>abra este painel em www.rebequi.com.br</a> e entre na sua conta.</p> : null}
          <p className="mb-3 break-all text-xs text-muted-foreground">URL de retorno: https://www.rebequi.com.br/api/channels/oauth/mercado-livre/callback</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="channel-client-id">ID da aplicação</Label><Input id="channel-client-id" value={clientId} onChange={e => setClientId(e.target.value)} autoComplete="off" placeholder={channel.hasCredentials ? 'Já configurado; deixe vazio para manter' : 'Client ID'} /></div>
            <div><Label htmlFor="channel-client-secret">Segredo da aplicação</Label><Input id="channel-client-secret" type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)} autoComplete="new-password" placeholder="Client secret" /></div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={connectMutation.isPending || !channel.isActive || needsCanonicalHost} onClick={() => connectMutation.mutate()}>Autorizar conta</Button>
            <Button variant="outline" disabled={testMutation.isPending || !channel.hasCredentials || !channel.isActive} onClick={() => testMutation.mutate()}>Testar conexão</Button>
          </div>
        </DashboardPanel>
      ) : null}
      {channel && channel.type !== 'MANUAL' ? <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Publicação, pedidos e estoque externos aguardam validação do conector. Nenhum anúncio será enviado nesta etapa.</p> : null}

      {/* Publicar produto */}
      {channel?.type === 'MANUAL' && channel.isActive ? <DashboardPanel title="Vincular produto" description="Controle interno. A publicação no canal é feita manualmente." accent="blue">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar produto por nome ou SKU…"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          {debouncedProductSearch.trim() && searchResults.length > 0 ? (
            <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border/70 bg-card shadow-lg">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate(product.id)}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">{product.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {formatCurrency(product.price)} · est. {product.stock}
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </DashboardPanel> : null}

      {/* Anúncios */}
      <DashboardPanel title="Anúncios neste canal" description="Preço e estoque vêm da loja. 'Defasado' significa que a loja mudou desde a última sincronização." accent="red">
        {listingsQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
            Nenhum produto publicado neste canal ainda.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-medium">Produto</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="text-right font-medium">Preço loja</TableHead>
                  <TableHead className="text-right font-medium">Estoque loja</TableHead>
                  <TableHead className="font-medium">Publicado</TableHead>
                  <TableHead className="text-right font-medium">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.map((listing) => (
                  <ListingRow
                    key={listing.id}
                    listing={listing}
                    isSyncing={syncMutation.isPending || channel?.type !== 'MANUAL' || !channel?.isActive}
                    isRemoving={removeMutation.isPending || channel?.type !== 'MANUAL' || !channel?.isActive}
                    onSync={() => syncMutation.mutate(listing.id)}
                    onRemove={() => {
                      if (window.confirm('Remover este anúncio do canal?')) removeMutation.mutate(listing.id);
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DashboardPanel>
    </div>
  );
}

function ListingRow({
  listing,
  isSyncing,
  isRemoving,
  onSync,
  onRemove,
}: {
  listing: ChannelListing;
  isSyncing: boolean;
  isRemoving: boolean;
  onSync: () => void;
  onRemove: () => void;
}) {
  const storePrice = listing.product?.price ?? 0;
  const storeStock = listing.product?.stock ?? 0;
  const priceChanged = listing.publishedPrice != null && listing.publishedPrice !== storePrice;
  const stockChanged = listing.publishedStock != null && listing.publishedStock !== storeStock;

  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <p className="font-medium text-foreground">{listing.product?.name ?? 'Produto removido'}</p>
        {listing.product?.sku ? <p className="text-xs text-muted-foreground">SKU {listing.product.sku}</p> : null}
        {listing.externalUrl ? (
          <a href={listing.externalUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
            Ver anúncio <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </TableCell>
      <TableCell>
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getListingStatusTone(listing.syncStatus)}`}>
          {getListingStatusLabel(listing.syncStatus)}
        </span>
        {listing.lastError ? <p className="mt-1 max-w-[16rem] text-[11px] text-red-600">{listing.lastError}</p> : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatCurrency(storePrice)}
        {priceChanged ? <p className="text-[11px] text-amber-600">publicado: {formatCurrency(listing.publishedPrice as number)}</p> : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {storeStock}
        {stockChanged ? <p className="text-[11px] text-amber-600">publicado: {listing.publishedStock}</p> : null}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {listing.lastSyncedAt ? new Date(listing.lastSyncedAt).toLocaleDateString('pt-BR') : '—'}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="ghost" disabled={isSyncing} onClick={onSync} className="h-8 gap-1.5">
            {isSyncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Sincronizar
          </Button>
          <Button size="sm" variant="ghost" disabled={isRemoving} onClick={onRemove} className="h-8 text-red-600 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
