import { formatWhatsapp } from '@rebequi/shared/utils';
import { ContentPanel, DataRow, SectionPanel } from './components';
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
    <div className="space-y-6">
      {/* Título da seção */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Perfil</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">Minha conta</h2>
        </div>
        <span className="hidden rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:inline-flex">
          {quotes.length} orçamento(s)
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Dados do usuário */}
        <SectionPanel>
          <div className="divide-y divide-slate-100">
            <DataRow label="Nome" value={user?.name || '-'} />
            <DataRow label="Identificador" value={user?.identifier || '-'} />
            <DataRow label="E-mail" value={user?.email || 'Não cadastrado'} />
            <DataRow
              label="WhatsApp"
              value={user?.whatsapp ? formatWhatsapp(user.whatsapp) : 'Não cadastrado'}
            />
            <DataRow
              label="Orçamentos"
              value={`${quotes.length} total · ${draftQuotes.length} rascunho(s)`}
            />
            <DataRow label="Senha" value={user?.mustChangePassword ? 'Provisória' : 'Atualizada'} />
          </div>
        </SectionPanel>

        {/* Resumo */}
        <ContentPanel title="Resumo da conta" description="Informações principais do seu acesso.">
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Nome
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-foreground">
                {user?.name || user?.identifier || 'Cliente'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Rascunhos
                </p>
                <p className="mt-1 text-xl font-bold text-foreground">{draftQuotes.length}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Para revisar ou enviar.</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Contato
                </p>
                <p className="mt-1 truncate text-sm font-bold text-foreground">{contact}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Canal de atendimento.</p>
              </div>
            </div>
          </div>
        </ContentPanel>
      </div>
    </div>
  );
}
