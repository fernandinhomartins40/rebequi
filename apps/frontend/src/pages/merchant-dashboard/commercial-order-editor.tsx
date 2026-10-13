import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/services/api/client';
import { fetchAdminProducts } from '@/services/api/products';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ADMIN_BASE_PATH } from './config';

type Customer = { id: string; name: string; whatsapp: string | null; assignmentVersion: number };
type Item = { productId: string; name: string; price: number; quantity: number; available: number };

export function CommercialOrderEditor({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [customer, setCustomer] = useState<Customer>();
  const [catalogSearch, setCatalogSearch] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const intent = useRef<{ fingerprint: string; key: string }>();
  const customerTerm = useDebouncedValue(search, 300);
  const catalogTerm = useDebouncedValue(catalogSearch, 300);
  const customers = useQuery({ queryKey: ['commercial-order-customers', customerTerm, page],
    queryFn: async () => (await apiFetch<{ data: { customers: Customer[]; totalPages: number } }>(
      `/commercial/quote-customers?search=${encodeURIComponent(customerTerm)}&page=${page}`)).data, retry: false });
  const catalog = useQuery({ queryKey: ['commercial-order-products', catalogTerm],
    queryFn: () => fetchAdminProducts({ search: catalogTerm, page: 1, limit: 10 }),
    enabled: step === 2 && catalogTerm.trim().length >= 2, retry: false });
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const money = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  async function submit() {
    if (!customer || saving) return;
    const values = { customerId: customer.id, note: note.trim(),
      items: items.map(item => ({ productId: item.productId, quantity: item.quantity,
        expectedUnitPriceCents: String(Math.round(item.price * 100)) })) };
    const fingerprint = JSON.stringify(values);
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    setSaving(true); setError('');
    try {
      const result = await apiFetch<{ data: { id: string } }>('/commercial/orders', { method: 'POST',
        body: JSON.stringify({ ...values, expectedCustomerVersion: customer.assignmentVersion,
          requestKey: intent.current.key, confirmed: true }) });
      navigate(`${ADMIN_BASE_PATH}/pedidos/${encodeURIComponent(result.data.id)}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível criar o pedido.');
      if (failure instanceof ApiError && [404, 409].includes(failure.status)) {
        if (failure.status === 404 || failure.message.includes('responsável pelo cliente')) {
          setCustomer(undefined); setStep(1); await customers.refetch();
        } else {
          setItems([]); setStep(2); await catalog.refetch();
        }
      }
    } finally { setSaving(false); }
  }

  return <section aria-label="Criar pedido para cliente" className="space-y-4 rounded-xl border bg-white p-4">
    <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Novo pedido</h2><Button variant="ghost" disabled={saving} onClick={onClose}>Fechar</Button></div>
    <ol className="grid grid-cols-3 gap-2 text-xs">{['Cliente', 'Produtos', 'Conferir'].map((label, index) =>
      <li key={label} aria-current={step === index + 1 ? 'step' : undefined}
        className={`rounded-lg p-2 ${step === index + 1 ? 'bg-primary font-bold text-primary-foreground' : 'bg-muted'}`}>{index + 1}. {label}</li>)}</ol>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {step === 1 ? <>
      <label className="block text-sm">Buscar cliente<Input value={search} maxLength={100}
        onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Nome ou WhatsApp" /></label>
      {customers.isFetching ? <p role="status">Buscando clientes…</p> : customers.isError ?
        <p role="alert">{customers.error.message}</p> : <div className="space-y-2">{customers.data?.customers.map(value =>
          <button type="button" key={value.id} aria-pressed={customer?.id === value.id}
            onClick={() => { setCustomer(value); setItems([]); }}
            className={`block w-full rounded-lg border p-3 text-left text-sm ${customer?.id === value.id ? 'border-primary bg-primary/10' : ''}`}>
            <strong>{value.name}</strong><span className="block text-muted-foreground">{value.whatsapp || 'WhatsApp não cadastrado'}</span>
          </button>)}{!customers.data?.customers.length ? <p className="text-sm">Nenhum cliente disponível na sua carteira.</p> : null}</div>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={page === 1 || customers.isFetching} onClick={() => setPage(value => value - 1)}>Anterior</Button>
        <Button variant="outline" disabled={!customers.data || page >= customers.data.totalPages || customers.isFetching} onClick={() => setPage(value => value + 1)}>Próxima</Button>
        <Button disabled={!customer?.whatsapp} onClick={() => setStep(2)}>Continuar</Button></div>
    </> : step === 2 ? <>
      <label className="block text-sm">Buscar produto<Input value={catalogSearch} maxLength={100}
        onChange={event => setCatalogSearch(event.target.value)} placeholder="Nome ou SKU" /></label>
      {catalogTerm.trim().length >= 2 ? catalog.isFetching ? <p role="status">Buscando produtos…</p> :
        catalog.isError ? <p role="alert">{catalog.error.message}</p> : <ul className="space-y-2">{catalog.data?.products.filter(product =>
          product.isActive && product.price > 0 && product.stock > (product.reservedStock ?? 0)).map(product =>
          <li key={product.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
            <span className="min-w-0 flex-1 break-words"><strong>{product.name}</strong><span className="block text-muted-foreground">{money(product.price)} · {product.stock - (product.reservedStock ?? 0)} disponíveis</span></span>
            <Button variant="outline" disabled={items.length >= 100 || items.some(item => item.productId === product.id)}
              onClick={() => setItems(previous => [...previous, { productId: product.id, name: product.name,
                price: product.price, quantity: 1, available: product.stock - (product.reservedStock ?? 0) }])}>Selecionar</Button>
          </li>)}</ul> : <p className="text-xs text-muted-foreground">Digite pelo menos dois caracteres.</p>}
      <ul className="space-y-2">{items.map(item => <li key={item.productId} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
        <span className="min-w-0 flex-1 break-words">{item.name}<span className="block text-muted-foreground">{money(item.price)} por unidade</span></span>
        <Input className="w-24" aria-label={`Quantidade de ${item.name}`} type="number" min="1" max={Math.min(99, item.available)} step="1"
          value={item.quantity} onChange={event => setItems(previous => previous.map(value => value.productId === item.productId ?
            { ...value, quantity: Number(event.target.value) } : value))} />
        <Button variant="ghost" aria-label={`Remover ${item.name}`} onClick={() => setItems(previous => previous.filter(value => value.productId !== item.productId))}>Remover</Button>
      </li>)}</ul>
      <label className="block text-sm">Observação opcional<Input value={note} maxLength={1000} onChange={event => setNote(event.target.value)} /></label>
      <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
        <Button disabled={!items.length || items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > Math.min(99, item.available))}
          onClick={() => { setError(''); setStep(3); }}>Conferir</Button></div>
    </> : <>
      <p className="font-semibold">{customer?.name}</p><ul className="space-y-2 text-sm">{items.map(item =>
        <li key={item.productId} className="break-words">{item.quantity} × {item.name} · {money(item.price * item.quantity)}</li>)}</ul>
      <p className="font-bold">Total estimado: {money(subtotal)}</p>{note ? <p className="break-words text-sm">{note}</p> : null}
      <p className="text-xs text-muted-foreground">Preço e disponibilidade serão conferidos novamente ao enviar. O pedido aparecerá para o cliente e ficará em acompanhamento; estoque e pagamento não serão alterados.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={saving} onClick={() => setStep(2)}>Voltar</Button>
        <Button disabled={saving} onClick={submit}>{saving ? 'Criando…' : 'Confirmar pedido'}</Button></div>
    </>}
  </section>;
}
