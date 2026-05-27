import { BadgePercent, BarChart3, Boxes, FileText, Plug, ReceiptText, ShieldCheck, type LucideIcon } from 'lucide-react';
import { hasMerchantPermission, isMerchantUserRole, type MerchantPermission } from '@rebequi/shared/constants';
import type { UserRole } from '@rebequi/shared/types';

export const ADMIN_BASE_PATH = '/painel-lojista/painel';

/*
 * Sidebar Theme — cores da identidade visual Rebequi
 * Amarelo brand: #FFD700  (hsl 47 100% 50% / 51 100% 50%)
 * Vermelho brand: #DC2626 / #cc2227  (hsl 0 84% 51%)
 * Azul brand: #2563EB  (hsl 217 91% 60%)
 */
export const SIDEBAR_THEME = {
  '--sidebar-background': '220 25% 10%',
  '--sidebar-foreground': '215 20% 90%',
  '--sidebar-primary': '217 91% 60%',
  '--sidebar-primary-foreground': '0 0% 100%',
  '--sidebar-accent': '51 100% 50%',
  '--sidebar-accent-foreground': '0 0% 9%',
  '--sidebar-border': '220 20% 18%',
  '--sidebar-ring': '217 91% 60%',
} as const;

export type MerchantSection =
  | 'visao-geral'
  | 'produtos'
  | 'promocoes'
  | 'pedidos'
  | 'orcamentos'
  | 'integracoes'
  | 'acesso';

export type MerchantNavItem = {
  id: MerchantSection;
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  intro: string;
  requiredPermission: MerchantPermission;
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
    requiredPermission: 'dashboard:view',
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
    requiredPermission: 'catalog:manage',
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
    requiredPermission: 'promotions:manage',
  },
  {
    id: 'pedidos',
    href: `${ADMIN_BASE_PATH}/pedidos`,
    label: 'Pedidos',
    description: 'Checkout e recuperacao',
    icon: ReceiptText,
    eyebrow: 'Pedidos',
    title: 'Gestao de pedidos',
    intro: 'Acompanhe checkouts enviados ao WhatsApp, pedidos abandonados e a recuperacao de vendas.',
    requiredPermission: 'orders:manage',
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
    requiredPermission: 'quotes:manage',
  },
  {
    id: 'integracoes',
    href: `${ADMIN_BASE_PATH}/integracoes`,
    label: 'Integracoes',
    description: 'OCR via OpenRouter',
    icon: Plug,
    eyebrow: 'Integracoes',
    title: 'Integracoes externas',
    intro: 'Configure a chave do OpenRouter, escolha os modelos VLM e teste a conexao usada pelo OCR de orcamentos.',
    requiredPermission: 'integrations:manage',
  },
  {
    id: 'acesso',
    href: `${ADMIN_BASE_PATH}/acesso`,
    label: 'Acesso',
    description: 'Usuarios e permissoes',
    icon: ShieldCheck,
    eyebrow: 'Acesso',
    title: 'Usuarios e niveis de acesso',
    intro: 'Crie usuarios internos, distribua papeis e controle quais funcoes cada colaborador pode usar.',
    requiredPermission: 'access:manage',
  },
];

export function getMerchantNavItemsForRole(role?: UserRole | string | null) {
  if (!isMerchantUserRole(role)) {
    return [];
  }

  return NAV_SECTIONS.filter((item) => hasMerchantPermission(role, item.requiredPermission));
}

export function getDefaultMerchantDashboardHref(role?: UserRole | string | null) {
  const firstAvailableItem = getMerchantNavItemsForRole(role)[0];
  return firstAvailableItem?.href ?? ADMIN_BASE_PATH;
}

export function canAccessMerchantSection(role: UserRole | string | null | undefined, section: MerchantSection) {
  const navItem = NAV_SECTIONS.find((item) => item.id === section);
  return navItem ? hasMerchantPermission(role, navItem.requiredPermission) : false;
}
