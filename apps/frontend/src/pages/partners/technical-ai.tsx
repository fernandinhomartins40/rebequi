import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PartnerAiResult } from '@rebequi/shared/schemas';
import { getPartnerAiStatus, interpretPartnerDescription } from '@/services/api/partners';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function TechnicalAi({ onApply }: { onApply: (result: PartnerAiResult) => void }) {
  const client = useQueryClient(); const [description, setDescription] = useState(''); const [consent, setConsent] = useState(false);
  const request = useRef<{ description: string; key: string }>();
  const status = useQuery({ queryKey: ['partners', 'ai-status'], queryFn: getPartnerAiStatus, retry: false });
  const mutation = useMutation({ mutationFn: () => {
    if (request.current?.description !== description) request.current = { description, key: crypto.randomUUID() };
    return interpretPartnerDescription({ description, technicalOnly: true, requestKey: request.current.key });
  }, onSettled: () => client.invalidateQueries({ queryKey: ['partners', 'ai-status'] }) });
  if (!status.data?.enabled) return null;
  const labels = { service: 'Serviço', areaM2: 'Área (m²)', openingsM2: 'Aberturas (m²)', coats: 'Demãos', lossPercent: 'Perda (%)' };
  return <details className="rounded-xl border bg-slate-50 p-4"><summary className="cursor-pointer font-semibold">Preencher medidas com IA</summary><div className="mt-3 space-y-3">
    <label className="block text-sm" htmlFor="technical-description">Descreva o serviço e as medidas confirmadas</label>
    <Textarea id="technical-description" maxLength={4000} value={description} disabled={mutation.isPending} placeholder="Pintar 80 m², descontando 8 m² de janelas, com 2 demãos." onChange={event => { setDescription(event.target.value); mutation.reset(); }} />
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} disabled={mutation.isPending} onChange={event => setConsent(event.target.checked)} />O texto contém somente dados técnicos, sem nomes, endereços ou contatos. Autorizo seu envio ao provedor de IA.</label>
    <p className="text-xs text-slate-500">{status.data.remaining} leituras disponíveis hoje. Confira cada medida antes de usar.</p>
    <Button variant="outline" disabled={!consent || description.trim().length < 10 || mutation.isPending || !status.data.remaining} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Lendo serviço…' : 'Ler descrição'}</Button>
    {mutation.isError ? <div role="alert" className="text-sm text-red-700"><p>{mutation.error.message}</p><Button size="sm" variant="outline" className="mt-2" onClick={() => { request.current = undefined; mutation.reset(); }}>Preparar nova tentativa</Button></div> : null}
    {mutation.data ? <div className="space-y-3 rounded-lg bg-white p-3"><p className="text-sm font-semibold">Confira o que foi identificado</p><dl className="grid grid-cols-2 gap-2 text-sm">{Object.entries(mutation.data.result).map(([key, value]) => <div key={key}><dt className="text-slate-500">{labels[key as keyof typeof labels]}</dt><dd>{value === null ? 'Não informado' : value === 'PAINT' ? 'Pintura' : value === 'TILE' ? 'Pisos' : String(value)}</dd></div>)}</dl><Button onClick={() => { onApply(mutation.data!.result); mutation.reset(); }}>Usar dados e conferir</Button></div> : null}
  </div></details>;
}
