import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Search, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Product } from '@rebequi/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatCurrency } from '@/lib/sale-ui';
import { fetchAdminOrderById } from '@/services/api/orders';
import { fetchAdminProducts } from '@/services/api/products';
import { createSale } from '@/services/api/sales';
import { PaymentMethod, SaleStatus } from '@/types';
import type { CreateSaleDTO } from '@/types';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, EditorBackLink, EditorFooter, PageHeader } from './components';

type DraftItem = {
  productId: string;
  name: string;
  stock: number;
  quantity: number;
  unitPrice: number;
};

const PAYMENT_OPTIONS = [
  { label: 'Pix', value: PaymentMethod.PIX },
  { label: 'Dinheiro', value: PaymentMethod.CASH },
  { label: 'Cartão', value: PaymentMethod.CARD },
  { label: 'A prazo / boleto', value: PaymentMethod.INSTALLMENT },
];

export function MerchantSaleEditorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') || undefined;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.PIX);
  const [status, setStatus] = useState<SaleStatus>(SaleStatus.PAID);
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');

  // Se veio de um pedido, carrega os dados para exibir contexto (itens vêm do backend).
  const orderQuery = useQuery({
    queryKey: ['merchant-dashboard', 'sales', 'from-order', orderId],
    queryFn: () => fetchAdminOrderById(orderId as string),
    enabled: Boolean(orderId),
  });

  const productsQuery = useQuery({
    queryKey: ['merchant-dashboard', 'sales', 'product-search', debouncedSearch],
    queryFn: () => fetchAdminProducts({ search: debouncedSearch.trim() || undefined, isActive: true, limit: 20 }),
    enabled: !orderId && debouncedSearch.trim().length > 0,
  });

  const searchResults = productsQuery.data?.products ?? [];
  const order = orderQuery.data;

  const subtotal = useMemo(
    () => (orderId ? order?.subtotal ?? 0 : items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)),
    [items, order, orderId]
  );
  const discountValue = Math.min(Number(discount) || 0, subtotal);
  const total = Math.max(subtotal - discountValue, 0);

  const addProduct = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) } : i
        );
      }
      return [
        ...prev,
        { productId: product.id, name: product.name, stock: product.stock, quantity: 1, unitPrice: product.price },
      ];
    });
    setSearch('');
  };

  const updateItem = (productId: string, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, ...patch } : i)));
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateSaleDTO) => createSale(payload),
    onSuccess: async (sale) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'sales'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'sales-badge'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'orders'] }),
      ]);
      toast({ title: 'Venda registrada', description: `${sale.referenceCode} · ${formatCurrency(sale.total)}` });
      navigate(`${ADMIN_BASE_PATH}/vendas`);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao registrar venda',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    },
  });

  const handleSubmit = () => {
    if (!orderId && items.length === 0) {
      toast({ variant: 'destructive', title: 'Adicione itens', description: 'Inclua ao menos um produto na venda.' });
      return;
    }

    const payload: CreateSaleDTO = {
      paymentMethod,
      status,
      discount: discountValue,
      notes: notes.trim() || null,
    };

    if (orderId) {
      payload.orderId = orderId;
    } else {
      payload.items = items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice }));
      if (customerName.trim()) payload.customerName = customerName.trim();
      if (customerWhatsapp.trim()) payload.customerWhatsapp = customerWhatsapp.trim();
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <EditorBackLink to={`${ADMIN_BASE_PATH}/vendas`} label="Voltar para vendas" />
      <PageHeader
        title={orderId ? 'Registrar venda do pedido' : 'Registrar venda'}
        description={
          orderId
            ? 'Confirme o pagamento do pedido fechado no WhatsApp. O estoque será baixado e o pedido marcado como concluído.'
            : 'Monte a venda de balcão, escolha o pagamento e dê baixa no estoque automaticamente.'
        }
      />

      {orderId ? (
        <DashboardPanel title="Pedido de origem" accent="blue">
          {orderQuery.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando pedido…
            </div>
          ) : order ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-medium">{order.referenceCode}</p>
                  <p className="text-xs text-muted-foreground">{order.customerNameSnapshot} · {order.itemCount} item(ns)</p>
                </div>
                <p className="text-lg font-semibold tabular-nums">{formatCurrency(order.subtotal)}</p>
              </div>
              <div className="space-y-1.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3.5 py-2 text-sm">
                    <span className="text-foreground">{item.quantity}× {item.productNameSnapshot}</span>
                    <span className="tabular-nums text-muted-foreground">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-4 text-sm text-red-600">Pedido não encontrado.</p>
          )}
        </DashboardPanel>
      ) : (
        <DashboardPanel title="Itens da venda" description="Busque produtos ativos e ajuste quantidade e preço." accent="blue">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar produto por nome ou SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {debouncedSearch.trim() && searchResults.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border/70 bg-card shadow-lg">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    disabled={product.stock <= 0}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground">{product.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatCurrency(product.price)} · estoque {product.stock}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 py-8 text-center text-sm text-muted-foreground">
              Nenhum item adicionado. Busque um produto acima.
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.productId} className="rounded-lg border border-border/60 bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Estoque disponível: {item.stock}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => removeItem(item.productId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min={1}
                        max={item.stock}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.productId, { quantity: Math.max(1, Math.min(Number(e.target.value) || 1, item.stock)) })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Preço unit.</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.productId, { unitPrice: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </div>
                    <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                      <p className="text-sm font-semibold tabular-nums text-foreground">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DashboardPanel>
      )}

      {/* Cliente (só na venda avulsa) */}
      {!orderId ? (
        <DashboardPanel title="Cliente (opcional)" description="Identifique o cliente para o histórico. Deixe em branco para venda de balcão." accent="yellow">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">Nome</Label>
              <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-whatsapp">WhatsApp</Label>
              <Input id="customer-whatsapp" value={customerWhatsapp} onChange={(e) => setCustomerWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
        </DashboardPanel>
      ) : null}

      {/* Pagamento e totais */}
      <DashboardPanel title="Pagamento" accent="red">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Situação do pagamento</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SaleStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SaleStatus.PAID}>Pago</SelectItem>
                <SelectItem value={SaleStatus.PENDING_PAYMENT}>A receber</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="discount">Desconto (R$)</Label>
            <Input id="discount" type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observação</Label>
            <Textarea id="notes" rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <div className="mt-4 space-y-1.5 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Desconto</span>
            <span className="tabular-nums">− {formatCurrency(discountValue)}</span>
          </div>
          <div className="flex justify-between border-t border-border/40 pt-1.5 text-base font-semibold text-foreground">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      </DashboardPanel>

      <EditorFooter>
        <Button variant="outline" onClick={() => navigate(`${ADMIN_BASE_PATH}/vendas`)}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gap-1.5">
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Registrar venda
        </Button>
      </EditorFooter>
    </div>
  );
}
