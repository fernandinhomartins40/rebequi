import { BadgePercent, BarChart3, Boxes, CheckCircle2, FileText, ShieldCheck, type LucideIcon } from 'lucide-react';

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

export type MerchantSection = 'visao-geral' | 'produtos' | 'promocoes' | 'orcamentos' | 'acesso' | 'estabilidade';

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
    label: 'Visão geral',
    description: 'Indicadores da operação',
    icon: BarChart3,
    eyebrow: 'Resumo',
    title: 'Visão geral',
    intro: 'Indicadores principais do painel administrativo.',
  },
  {
    id: 'produtos',
    href: `${ADMIN_BASE_PATH}/produtos`,
    label: 'Produtos',
    description: 'Cadastro e manutenção',
    icon: Boxes,
    eyebrow: 'Produtos',
    title: 'Gestão de produtos',
    intro: 'Cadastre, edite e acompanhe produtos, estoque e imagens.',
  },
  {
    id: 'promocoes',
    href: `${ADMIN_BASE_PATH}/promocoes`,
    label: 'Promoções',
    description: 'Cards e campanhas',
    icon: BadgePercent,
    eyebrow: 'Promoções',
    title: 'Gestão de promoções',
    intro: 'Crie cards promocionais, defina validade e vincule produtos a cada campanha.',
  },
  {
    id: 'orcamentos',
    href: `${ADMIN_BASE_PATH}/orcamentos`,
    label: 'Orçamentos',
    description: 'Solicitações e leads',
    icon: FileText,
    eyebrow: 'Orçamentos',
    title: 'Orçamentos e leads',
    intro: 'Acompanhe orçamentos enviados e clientes capturados que ainda não concluíram o fluxo.',
  },
  {
    id: 'acesso',
    href: `${ADMIN_BASE_PATH}/acesso`,
    label: 'Acesso',
    description: 'Sessão e permissões',
    icon: ShieldCheck,
    eyebrow: 'Acesso',
    title: 'Controle de acesso',
    intro: 'Sessão atual, permissões e validações de autenticação.',
  },
  {
    id: 'estabilidade',
    href: `${ADMIN_BASE_PATH}/estabilidade`,
    label: 'Plataforma',
    description: 'Status técnico',
    icon: CheckCircle2,
    eyebrow: 'Plataforma',
    title: 'Status da plataforma',
    intro: 'Implementações concluídas e pendências do painel.',
  },
];
