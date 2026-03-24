import { BarChart3, CheckCircle2, PackageSearch, ShieldCheck, type LucideIcon } from 'lucide-react';

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

export type MerchantSection = 'visao-geral' | 'catalogo' | 'acesso' | 'estabilidade';

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
    description: 'Resumo real do backoffice',
    icon: BarChart3,
    eyebrow: 'Panorama',
    title: 'Visao geral da operacao',
    intro: 'Leitura direta do que a plataforma administrativa consegue sustentar hoje com dados reais.',
  },
  {
    id: 'catalogo',
    href: `${ADMIN_BASE_PATH}/catalogo`,
    label: 'Catalogo',
    description: 'Dados persistidos no banco',
    icon: PackageSearch,
    eyebrow: 'Catalogo',
    title: 'Catalogo conectado ao banco',
    intro: 'Produtos e categorias carregados da API publica, sem inventar dados operacionais no frontend.',
  },
  {
    id: 'acesso',
    href: `${ADMIN_BASE_PATH}/acesso`,
    label: 'Acesso',
    description: 'Sessao ADMIN autenticada',
    icon: ShieldCheck,
    eyebrow: 'Acesso',
    title: 'Autenticacao administrativa',
    intro: 'Sessao, role e validacao do backend expostos como uma pagina propria do backoffice.',
  },
  {
    id: 'estabilidade',
    href: `${ADMIN_BASE_PATH}/estabilidade`,
    label: 'Base estavel',
    description: 'O que existe e o que falta',
    icon: CheckCircle2,
    eyebrow: 'Base estavel',
    title: 'Fundacao pronta para evoluir',
    intro: 'Separacao clara entre o que ja existe com persistencia real e o que ainda segue pendente.',
  },
];
