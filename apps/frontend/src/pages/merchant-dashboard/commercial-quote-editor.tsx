import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch, ApiError } from '@/services/api/client';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ADMIN_BASE_PATH } from './config';
import { fetchAdminProducts } from '@/services/api/products';

type Customer = { id: string; name: string; whatsapp: string; assignmentVersion: number };
type Item = { productId: string | null; name: string; quantity: number; unit: string | null };
export function CommercialQuoteEditor({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate(); const [step, setStep] = useState(1);
  const [search, setSearch] = useState(''); const debounced = useDebouncedValue(search, 300); const [page, setPage] = useState(1);
  const [customer, setCustomer] = useState<Customer>(); const [title, setTitle] = useState(''); const [items, setItems] = useState<Item[]>([]);
  const [name, setName] = useState(''); const [quantity, setQuantity] = useState('1'); const [unit, setUnit] = useState(''); const [note, setNote] = useState('');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState(''); const catalogTerm = useDebouncedValue(catalogSearch, 300);
  const catalog = useQuery({ queryKey: ['commercial-quote-products', catalogTerm], queryFn: () => fetchAdminProducts({ search: catalogTerm, page: 1, limit: 10 }), enabled: step === 2 && catalogTerm.trim().length >= 2, retry: false });
  const intent = useRef<{ fingerprint: string; key: string }>();
  const customers = useQuery({ queryKey: ['commercial-quote-customers', debounced, page], queryFn: async () => (await apiFetch<{ data: { customers: Customer[]; totalPages: number } }>(`/commercial/quote-customers?search=${encodeURIComponent(debounced)}&page=${page}`)).data, retry: false });
  function addItem() {
    const amount = Number(quantity);
    if (!name.trim() || !Number.isFinite(amount) || amount <= 0 || amount > 1000000 || items.length >= 100) { setError('Informe o material e uma quantidade válida. Máximo de 100 materiais.'); return; }
    setItems(previous => [...previous, { productId: null, name: name.trim(), quantity: amount, unit: unit.trim() || null }]); setName(''); setQuantity('1'); setUnit(''); setError('');
  }
  async function submit() {
    if (!customer || saving) return;
    const values = { customerId: customer.id, title: title.trim(), note: note.trim(), items };
    const fingerprint = JSON.stringify(values);
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    setSaving(true); setError('');
    try {
      const result = await apiFetch<{ data: { id: string } }>('/commercial/quotes', { method: 'POST', body: JSON.stringify({ ...values, requestKey: intent.current.key, expectedCustomerVersion: customer.assignmentVersion, confirmed: true }) });
      navigate(`${ADMIN_BASE_PATH}/${encodeURIComponent('orçamentos')}?quoteId=${encodeURIComponent(result.data.id)}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível criar o orçamento.');
      if (failure instanceof ApiError && [404, 409].includes(failure.status)) {
        setCustomer(undefined); setStep(1); await customers.refetch();
      }
    } finally { setSaving(false); }
  }
  return <section aria-label="Criar orçamento para cliente" className="space-y-4 rounded-xl border bg-white p-4">
    <div className="flex items-center justify-between gap-3"><h2 className="font-bold">Novo orçamento</h2><Button variant="ghost" disabled={saving} onClick={onClose}>Fechar</Button></div>
    <ol className="grid grid-cols-3 gap-2 text-xs">{['Cliente', 'Materiais', 'Conferir'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={`rounded-lg p-2 ${step === index + 1 ? 'bg-primary font-bold text-primary-foreground' : 'bg-muted'}`}>{index + 1}. {label}</li>)}</ol>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {step === 1 ? <><label className="block text-sm">Buscar cliente<Input value={search} maxLength={100} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Nome ou WhatsApp" /></label>
      {customers.isFetching ? <p role="status">Buscando clientes…</p> : customers.isError ? <p role="alert">{customers.error.message}</p> : <div className="space-y-2">{customers.data?.customers.map(value => <button type="button" key={value.id} aria-pressed={customer?.id === value.id} onClick={() => setCustomer(value)} className={`block w-full rounded-lg border p-3 text-left text-sm ${customer?.id === value.id ? 'border-primary bg-primary/10' : ''}`}><strong>{value.name}</strong><span className="block text-muted-foreground">{value.whatsapp}</span></button>)}{!customers.data?.customers.length ? <p className="text-sm">Nenhum cliente disponível na sua carteira.</p> : null}</div>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={page === 1 || customers.isFetching} onClick={() => setPage(value => value - 1)}>Anterior</Button><Button variant="outline" disabled={!customers.data || page >= customers.data.totalPages || customers.isFetching} onClick={() => setPage(value => value + 1)}>Próxima</Button><Button disabled={!customer} onClick={() => setStep(2)}>Continuar</Button></div></> : step === 2 ? <>
      <label className="block text-sm">Título do orçamento<Input value={title} maxLength={255} onChange={event => setTitle(event.target.value)} placeholder="Materiais para reforma" /></label>
      <label className="block text-sm">Buscar produto no catálogo<Input value={catalogSearch} maxLength={100} onChange={event => setCatalogSearch(event.target.value)} placeholder="Nome ou SKU" /></label>
      {catalogTerm.trim().length >= 2 ? catalog.isFetching ? <p role="status">Buscando produtos…</p> : catalog.isError ? <p role="alert">{catalog.error.message}</p> : <ul className="space-y-2">{catalog.data?.products.filter(product => product.isActive).map(product => <li key={product.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span className="min-w-0 flex-1 break-words">{product.name}</span><Button variant="outline" disabled={items.length >= 100 || items.some(item => item.productId === product.id)} onClick={() => setItems(values => [...values, { productId: product.id, name: product.name, quantity: 1, unit: null }])}>Selecionar</Button></li>)}</ul> : null}
      <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">Material<Input value={name} maxLength={255} onChange={event => setName(event.target.value)} /></label><label className="text-sm">Quantidade<Input type="number" min="0.001" step="any" value={quantity} onChange={event => setQuantity(event.target.value)} /></label><label className="text-sm">Unidade<Input value={unit} maxLength={30} onChange={event => setUnit(event.target.value)} placeholder="un, kg, m²" /></label></div>
      <Button variant="outline" onClick={addItem}>Adicionar material</Button>
      <ul className="space-y-2">{items.map((item, index) => <li key={index} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"><span className="min-w-0 flex-1 break-words">{item.name}</span><Input className="w-24" aria-label={`Quantidade de ${item.name}`} type="number" min="0.001" step="any" value={item.quantity} onChange={event => setItems(values => values.map((value, position) => position === index ? { ...value, quantity: Number(event.target.value) } : value))} /><span>{item.unit}</span><Button variant="ghost" aria-label={`Remover ${item.name}`} onClick={() => setItems(values => values.filter((_, position) => position !== index))}>Remover</Button></li>)}</ul>
      <label className="block text-sm">Observação opcional<Input value={note} maxLength={1500} onChange={event => setNote(event.target.value)} /></label><div className="flex gap-2"><Button variant="outline" onClick={() => setStep(1)}>Voltar</Button><Button disabled={title.trim().length < 3 || !items.length || items.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1000000)} onClick={() => { setError(''); setStep(3); }}>Conferir</Button></div></> : <>
      <p className="font-semibold">{customer?.name} · {title}</p><ul className="space-y-2 text-sm">{items.map((item, index) => <li key={index} className="break-words">{item.quantity} {item.unit} · {item.name}</li>)}</ul>{note ? <p className="break-words text-sm">{note}</p> : null}<p className="text-xs text-muted-foreground">A solicitação aparecerá na conta do cliente. Preços e disponibilidade serão definidos na proposta.</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={saving} onClick={() => setStep(2)}>Voltar</Button><Button disabled={saving} onClick={submit}>{saving ? 'Criando…' : 'Confirmar orçamento'}</Button></div>
    </>}
  </section>;
}
