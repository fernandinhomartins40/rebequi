import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PARTNER_SPECIALTIES, PARTNER_TERMS_VERSION, partnerProfileSchema, type PartnerProfileInput } from '@rebequi/shared/schemas';
import type { PartnerProfile } from '@rebequi/shared/types';
import { savePartnerProfile } from '@/services/api/partners';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function PartnerProfileForm({ profile }: { profile: PartnerProfile | null }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1); const [accepted, setAccepted] = useState(Boolean(profile));
  const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<PartnerProfileInput>({ specialties: (profile?.specialties ?? []) as PartnerProfileInput['specialties'], city: profile?.city ?? '', region: profile?.region ?? '', services: profile?.services ?? '', experienceYears: profile?.experienceYears ?? 0, expectedVersion: profile?.version ?? 0, acceptedTermsVersion: PARTNER_TERMS_VERSION });
  const mutation = useMutation({ mutationFn: savePartnerProfile, onSuccess: async result => {
    setForm(current => ({ ...current, expectedVersion: result.version })); setSaved(true); setError('');
    await queryClient.invalidateQueries({ queryKey: ['partners', 'profile'] });
  }, onError: failure => setError(failure.message) });
  const checkStep = () => {
    if (step === 1 && !form.specialties.length) { setError('Escolha ao menos uma especialidade.'); return; }
    if (step === 2 && (form.city.trim().length < 2 || form.region.trim().length < 2)) { setError('Informe a cidade e a região de atendimento.'); return; }
    setError(''); setStep(current => current + 1);
  };
  const submit = () => {
    if (!accepted) { setError('Confirme as condições do cadastro.'); return; }
    const parsed = partnerProfileSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    mutation.mutate(parsed.data);
  };
  return <section className="rounded-2xl border bg-white p-5 sm:p-6">
    <h1 className="text-xl font-bold">{profile ? 'Seu perfil profissional' : 'Seja um parceiro Rebequi'}</h1>
    {saved ? <p role="status" className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-900">Perfil salvo. A situação do cadastro aparece no início.</p> : null}
    <ol aria-label="Etapas do cadastro" className="my-5 grid grid-cols-3 gap-2 text-xs">{['Especialidades', 'Atendimento', 'Conferir'].map((title, index) => <li key={title} aria-current={step === index + 1 ? 'step' : undefined} className={`rounded-lg p-3 ${step === index + 1 ? 'bg-yellow-100 font-semibold' : 'bg-slate-50'}`}>{index + 1}. {title}</li>)}</ol>
    {step === 1 ? <fieldset><legend className="mb-3 text-sm font-semibold">O que você faz?</legend><div className="grid gap-2 sm:grid-cols-2">{PARTNER_SPECIALTIES.map(specialty => <label key={specialty} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm"><input type="checkbox" checked={form.specialties.includes(specialty)} onChange={event => setForm(current => ({ ...current, specialties: event.target.checked ? [...current.specialties, specialty] : current.specialties.filter(value => value !== specialty) }))} />{specialty}</label>)}</div></fieldset> : null}
    {step === 2 ? <div className="space-y-4"><div><Label htmlFor="partner-city">Cidade</Label><Input id="partner-city" maxLength={100} value={form.city} onChange={event => setForm(current => ({ ...current, city: event.target.value }))} /></div><div><Label htmlFor="partner-region">Região ou bairros atendidos</Label><Input id="partner-region" maxLength={180} value={form.region} onChange={event => setForm(current => ({ ...current, region: event.target.value }))} /></div><div><Label htmlFor="partner-years">Anos de experiência</Label><Input id="partner-years" type="number" inputMode="numeric" min={0} max={80} value={form.experienceYears} onChange={event => setForm(current => ({ ...current, experienceYears: Number(event.target.value) }))} /></div><div><Label htmlFor="partner-services">Serviços oferecidos (opcional)</Label><Textarea id="partner-services" maxLength={1000} value={form.services} onChange={event => setForm(current => ({ ...current, services: event.target.value }))} /></div></div> : null}
    {step === 3 ? <div className="space-y-4 text-sm"><dl className="space-y-3"><div><dt className="text-muted-foreground">Especialidades</dt><dd className="font-medium">{form.specialties.join(', ')}</dd></div><div><dt className="text-muted-foreground">Atendimento</dt><dd className="break-words">{form.city} · {form.region}</dd></div><div><dt className="text-muted-foreground">Experiência</dt><dd>{form.experienceYears} anos</dd></div></dl><div className="rounded-xl bg-slate-50 p-4"><p>A loja analisará seu cadastro. Aprovação não certifica habilitação técnica nem garante comissões. Benefícios financeiros dependem de regras específicas, ainda não ativadas. Seus dados serão usados para gerenciar a parceria; contatos de clientes não serão compartilhados automaticamente.</p><label className="mt-3 flex min-h-11 items-center gap-3"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />Li e aceito as condições deste cadastro.</label></div></div> : null}
    {error ? <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="mt-6 flex items-center justify-between gap-3"><Button className="min-h-11" variant="outline" disabled={step === 1 || mutation.isPending} onClick={() => { setStep(current => current - 1); setError(''); }}>Voltar</Button>{step < 3 ? <Button className="min-h-11" onClick={checkStep}>Continuar</Button> : <Button className="min-h-11" disabled={mutation.isPending} onClick={submit}>{mutation.isPending ? 'Salvando…' : profile ? 'Salvar perfil' : 'Solicitar aprovação'}</Button>}</div>
  </section>;
}
