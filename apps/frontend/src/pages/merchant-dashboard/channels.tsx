import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plug, Plus, RefreshCcw, Settings2, Store, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  getChannelStatusLabel,
  getChannelStatusTone,
  getChannelTypeLabel,
  isAutomatedChannel,
} from '@/lib/channel-ui';
import {
  createChannel,
  deleteChannel,
  fetchChannels,
  syncChannel,
  testChannel,
} from '@/services/api/channels';
import { ChannelType } from '@/types';
import type { Channel } from '@/types';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, PageHeader, StatCard } from './components';

const CHANNEL_TYPE_OPTIONS = [
  { label: 'Mercado Livre', value: ChannelType.MERCADO_LIVRE },
  { label: 'Shopee', value: ChannelType.SHOPEE },
  { label: 'Amazon', value: ChannelType.AMAZON },
  { label: 'Canal manual (sem integração automática)', value: ChannelType.MANUAL },
];

export function MerchantDashboardChannels() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newType, setNewType] = useState<ChannelType>(ChannelType.MANUAL);
  const [newName, setNewName] = useState('');

  const channelsQuery = useQuery({
    queryKey: ['merchant-dashboard', 'channels', 'list'],
    queryFn: () => fetchChannels({ limit: 100, page: 1 }),
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'channels'] }),
    ]);

  const createMutation = useMutation({
    mutationFn: () => createChannel({ type: newType, name: newName.trim() }),
    onSuccess: async () => {
      await invalidate();
      setDialogOpen(false);
      setNewName('');
      setNewType(ChannelType.MANUAL);
      toast({ title: 'Canal criado', description: 'Agora publique produtos e configure as credenciais se necessário.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao criar canal', description: error instanceof Error ? error.message : 'Erro inesperado.' });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => testChannel(id),
    onSuccess: async (result) => {
      await invalidate();
      toast({ variant: result.ok ? 'default' : 'destructive', title: result.ok ? 'Conexão OK' : 'Falha na conexão', description: result.message });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => syncChannel(id),
    onSuccess: async (result) => {
      await invalidate();
      toast({ title: 'Sincronização concluída', description: result.message });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'Falha ao sincronizar', description: error instanceof Error ? error.message : 'Erro inesperado.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteChannel(id),
    onSuccess: async () => {
      await invalidate();
      toast({ title: 'Canal removido' });
    },
  });

  const channels = channelsQuery.data?.channels ?? [];
  const connected = channels.filter((c) => c.status === 'CONNECTED').length;
  const totalListings = channels.reduce((sum, c) => sum + c.listingCounts.total, 0);
  const outOfSync = channels.reduce((sum, c) => sum + c.listingCounts.outOfSync, 0);

  const handleDelete = (channel: Channel) => {
    if (!window.confirm(`Remover o canal "${channel.name}"? Os anúncios vinculados também serão removidos do controle.`)) return;
    deleteMutation.mutate(channel.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Canais de venda"
        description="Organize anúncios por canal. O controle manual funciona aqui; integrações externas só operam após autorização e validação real."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Conectar canal
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Store className="h-4 w-4" />} label="Canais" value={`${channels.length}`} tone="default" />
        <StatCard icon={<Plug className="h-4 w-4" />} label="Conectados" value={`${connected}`} tone="green" />
        <StatCard icon={<Settings2 className="h-4 w-4" />} label="Anúncios" value={`${totalListings}`} tone="blue" />
        <StatCard icon={<RefreshCcw className="h-4 w-4" />} label="Defasados" value={`${outOfSync}`} tone={outOfSync > 0 ? 'yellow' : 'default'} delta={outOfSync > 0 ? 'Precisam sincronizar' : 'Tudo em dia'} />
      </section>

      <DashboardPanel title="Seus canais" accent="blue">
        {channelsQuery.isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />)}
          </div>
        ) : channels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
            Nenhum canal conectado ainda. Comece conectando um marketplace ou criando um canal manual.
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {channels.map((channel) => (
              <article key={channel.id} className="rounded-xl border border-border/70 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{channel.name}</h3>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getChannelStatusTone(channel.status)}`}>
                        {getChannelStatusLabel(channel.status)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getChannelTypeLabel(channel.type)}
                      {!isAutomatedChannel(channel.type) ? ' · modo manual' : ''}
                    </p>
                  </div>
                </div>

                {channel.lastError ? (
                  <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{channel.lastError}</p>
                ) : null}

                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <ListingCount label="Anúncios" value={channel.listingCounts.total} />
                  <ListingCount label="Em dia" value={channel.listingCounts.synced} tone="emerald" />
                  <ListingCount label="Defasados" value={channel.listingCounts.outOfSync} tone="amber" />
                  <ListingCount label="Rascunho" value={channel.listingCounts.draft} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
                  <Button size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/canais/${channel.id}`)} className="gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" /> Anúncios
                  </Button>
                  {isAutomatedChannel(channel.type) ? (
                    <Button size="sm" variant="outline" disabled={testMutation.isPending} onClick={() => testMutation.mutate(channel.id)} className="gap-1.5">
                      {testMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                      Testar conexão
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={syncMutation.isPending || channel.listingCounts.total === 0}
                    onClick={() => syncMutation.mutate(channel.id)}
                    className="gap-1.5"
                  >
                    {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                    Sincronizar tudo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={deleteMutation.isPending}
                    onClick={() => handleDelete(channel)}
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </DashboardPanel>

      {/* Dialog: conectar canal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar canal</DialogTitle>
            <DialogDescription>
              O canal manual funciona na hora. Marketplaces aguardam autorização e validação da integração.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de canal</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as ChannelType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNEL_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="channel-name">Nome do canal</Label>
              <Input
                id="channel-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex.: Mercado Livre — Loja Rebequi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newName.trim()} className="gap-1.5">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Criar canal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ListingCount({ label, value, tone }: { label: string; value: number; tone?: 'emerald' | 'amber' }) {
  const color = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' && value > 0 ? 'text-amber-600' : 'text-foreground';
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
