import { BadgePercent, BarChart3, CheckCircle2, FileText, ShieldCheck, Boxes, Tag, type LucideIcon } from 'lucide-react';

export const ADMIN_BASE_PATH = '/painel-lojista/painel';

export const SIDEBAR_THEME = {
  '--sidebar-background': '48 100% 98%',
  '--sidebar-foreground': '0 0% 12%',
  '--sidebar-primary': '217 91% 60%',
  '--sidebar-primary-foreground': '0 0% 100%',
  '--sidebar-accent': '51 100% 50%',
  '--sidebar-accent-foreground': '0 0% 10%',
  '--sidebar-border': '44 40% 85%',
  '--sidebar-ring': '217 91% 60%',
} as const;

export type MerchantSection = 'visao-geral' | 'produtos' | 'promocoes' | 'ofertas' | 'orcamentos' | 'acesso' | 'estabilidade';

export type MerchantNavItem = {
  id: MerchantSection;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  intro: string;
  badge?: string;
};

export const NAV_SECTIONS: Omit<MerchantNavItem, 'badge'>[] = [
  {
    id: 'visao-geral',
    href: `${ADMIN_BASE_PATH}/visao-geral`,
    label: 'Visao geral',
    description: 'Indicadores da operacao',
    icon: BarChart3,
    eyebrow: 'Resumo',
    title: 'Visao geral',
    intro: 'Indicadores principais do painel administrativo.',
  },
  {
    id: 'produtos',
    href: `${ADMIN_BASE_PATH}/produtos`,
    label: 'Produtos',
    description: 'Cadastro e manutencao',
    icon: Boxes,
    eyebrow: 'Produtos',
    title: 'Gestao de produtos',
    intro: 'Cadastre, edite e acompanhe produtos, estoque e imagens.',
  },
  {
    id: 'promocoes',
    href: `${ADMIN_BASE_PATH}/promocoes`,
    label: 'Promocoes',
    description: 'Cards e campanhas',
    icon: BadgePercent,
    eyebrow: 'Promocoes',
    title: 'Gestao de promocoes',
    intro: 'Crie cards promocionais, defina validade e vincule produtos a cada campanha.',
  },
  {
    id: 'ofertas',
    href: `${ADMIN_BASE_PATH}/ofertas`,
    label: 'Ofertas',
    description: 'Promocoes avulsas',
    icon: Tag,
    eyebrow: 'Ofertas',
    title: 'Ofertas individuais',
    intro: 'Gerencie promocoes avulsas de um unico produto exibidas na home.',
  },
  {
    id: 'orcamentos',
    href: `${ADMIN_BASE_PATH}/orcamentos`,
    label: 'Orcamentos',
    description: 'Solicitacoes e leads',
    icon: FileText,
    eyebrow: 'Orcamentos',
    title: 'Orcamentos e leads',
    intro: 'Acompanhe orcamentos enviados e clientes capturados que ainda nao concluiram o fluxo.',
  },
  {
    id: 'acesso',
    href: `${ADMIN_BASE_PATH}/acesso`,
    label: 'Acesso',
    description: 'Sessao e permissoes',
    icon: ShieldCheck,
    eyebrow: 'Acesso',
    title: 'Controle de acesso',
    intro: 'Sessao atual, permissoes e validacoes de autenticacao.',
  },
  {
    id: 'estabilidade',
    href: `${ADMIN_BASE_PATH}/estabilidade`,
    label: 'Plataforma',
    description: 'Status tecnico',
    icon: CheckCircle2,
    eyebrow: 'Plataforma',
    title: 'Status da plataforma',
    intro: 'Implementacoes concluidas e pendencias do painel.',
  },
];
