import { formatWhatsapp } from '@rebequi/shared/utils';
import { DataRow, SectionPanel } from './components';
import type { QuoteRequest } from '@/types';

interface ProfileTabProps {
  user: {
    name?: string | null;
    identifier?: string | null;
    email?: string | null;
    whatsapp?: string | null;
    mustChangePassword?: boolean;
  } | null;
  quotes: QuoteRequest[];
  draftQuotes: QuoteRequest[];
}

export function ProfileTab({ user, quotes, draftQuotes }: ProfileTabProps) {
  const contact = user?.whatsapp
    ? formatWhatsapp(user.whatsapp)
    : user?.email || 'Sem contato cadastrado';

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Perfil</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Minha conta</h2>
        </div>
        <span className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline-flex">
          {quotes.length} orçamento(s)
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Data rows */}
        <SectionPanel>
          <div className="divide-y divide-slate-100">
            <DataRow label="Nome" value={user?.name || '-'} />
            <DataRow label="Identificador" value={user?.identifier || '-'} />
            <DataRow label="E-mail" value={user?.email || 'Não cadastrado'} />
            <DataRow label="WhatsApp" value={user?.whatsapp ? formatWhatsapp(user.whatsapp) : 'Não cadastrado'} />
            <DataRow label="Orçamentos" value={`${quotes.length} total · ${draftQuotes.length} rascunhos`} />
            <DataRow label="Senha" value={user?.mustChangePassword ? 'Provisória' : 'Atualizada'} />
          </div>
        </SectionPanel>

        {/* Summary */}
        <SectionPanel className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Resumo</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {user?.name || user?.identifier || 'Cliente'}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Mantenha os dados atualizados para acelerar o atendimento.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rascunhos</p>
              <p className="mt-1 text-xl font-bold text-foreground">{draftQuotes.length}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Prontos para revisão ou envio.</p>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contato</p>
              <p className="mt-1 truncate text-sm font-bold text-foreground">{contact}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Canal principal de atendimento.</p>
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
