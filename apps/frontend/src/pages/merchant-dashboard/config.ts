import { BarChart3, CheckCircle2, ShieldCheck, Boxes, type LucideIcon } from 'lucide-react';

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

export type MerchantSection = 'visao-geral' | 'produtos' | 'acesso' | 'estabilidade';

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
