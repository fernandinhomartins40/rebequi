import { BadgePercent, BarChart3, Boxes, FileText, Plug, ReceiptText, ShieldCheck, Store, Users, Wallet, type LucideIcon } from 'lucide-react';
import { hasMerchantPermission, isMerchantUserRole, type MerchantPermission } from '@rebequi/shared/constants';
import type { UserRole } from '@rebequi/shared/types';

export const ADMIN_BASE_PATH = '/painel-lojista/painel';

/*
 * Sidebar Theme — superfície clara e neutra, com o azul da marca
 * reservado para o estado ativo e o anel de foco.
 */
export const SIDEBAR_THEME = {
  '--sidebar-background': '210 38% 97%',
  '--sidebar-foreground': '218 40% 24%',
  '--sidebar-primary': '216 100% 51%',
  '--sidebar-primary-foreground': '0 0% 100%',
  '--sidebar-accent': '216 100% 96%',
  '--sidebar-accent-foreground': '30 10% 12%',
  '--sidebar-border': '216 38% 92%',
  '--sidebar-ring': '216 100% 51%',
} as const;

export type MerchantSection =
  | 'visão-geral'
  | 'produtos'
  | 'promoções'
  | 'pedidos'
  | 'vendas'
  | 'clientes'
  | 'orçamentos'
  | 'canais'
  | 'integrações'
  | 'acesso';

/*
 * Grupos da sidebar — separam o menu por intenção de uso, em vez de
 * empilhar todas as seções numa lista plana:
 *   resumo   → entrada do painel, sem rótulo
 *   vender   → funil comercial, na ordem lead → pedido → venda → relacionamento
 *   catálogo → o que a loja oferece e onde oferece
 *   ajustes  → configuração pontual, ancorada no fim do menu
 */
export type MerchantNavGroup = 'resumo' | 'vender' | 'catálogo' | 'ajustes';

export const NAV_GROUPS: { id: MerchantNavGroup; label: string | null }[] = [
  { id: 'resumo', label: null },
  { id: 'vender', label: 'Vender' },
  { id: 'catálogo', label: 'Catálogo' },
  { id: 'ajustes', label: 'Configurações' },
];

export type MerchantNavItem = {
  id: MerchantSection;
  group: MerchantNavGroup;
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
    id: 'visão-geral',
    group: 'resumo',
    href: `${ADMIN_BASE_PATH}/visão-geral`,
    label: 'Visão geral',
    description: 'Indicadores da operação',
    icon: BarChart3,
    eyebrow: 'Resumo',
    title: 'Visão geral',
    intro: 'Indicadores principais do painel administrativo.',
    requiredPermission: 'dashboard:view',
  },
  {
    id: 'produtos',
    group: 'catálogo',
    href: `${ADMIN_BASE_PATH}/produtos`,
    label: 'Produtos',
    description: 'Cadastro e manutenção',
    icon: Boxes,
    eyebrow: 'Produtos',
    title: 'Gestão de produtos',
    intro: 'Cadastre, edite e acompanhe produtos, estoque e imagens.',
    requiredPermission: 'catalog:manage',
  },
  {
    id: 'promoções',
    group: 'catálogo',
    href: `${ADMIN_BASE_PATH}/promoções`,
    label: 'Promoções',
    description: 'Cards e campanhas',
    icon: BadgePercent,
    eyebrow: 'Promoções',
    title: 'Gestão de promoções',
    intro: 'Crie cards promocionais, defina validade e vincule produtos a cada campanha.',
    requiredPermission: 'promotions:manage',
  },
  {
    id: 'orçamentos',
    group: 'vender',
    href: `${ADMIN_BASE_PATH}/orçamentos`,
    label: 'Orçamentos',
    description: 'Solicitações e leads',
    icon: FileText,
    eyebrow: 'Orçamentos',
    title: 'Orçamentos e leads',
    intro: 'Acompanhe orçamentos enviados e clientes capturados que ainda não concluíram o fluxo.',
    requiredPermission: 'quotes:manage',
  },
  {
    id: 'pedidos',
    group: 'vender',
    href: `${ADMIN_BASE_PATH}/pedidos`,
    label: 'Pedidos',
    description: 'Checkout e recuperação',
    icon: ReceiptText,
    eyebrow: 'Pedidos',
    title: 'Gestão de pedidos',
    intro: 'Acompanhe checkouts enviados ao WhatsApp, pedidos abandonados e a recuperação de vendas.',
    requiredPermission: 'orders:manage',
  },
  {
    id: 'vendas',
    group: 'vender',
    href: `${ADMIN_BASE_PATH}/vendas`,
    label: 'Vendas',
    description: 'Faturamento e registro',
    icon: Wallet,
    eyebrow: 'Vendas',
    title: 'Vendas e faturamento',
    intro: 'Registre vendas fechadas, controle o pagamento, dê baixa no estoque e acompanhe o faturamento da loja.',
    requiredPermission: 'sales:manage',
  },
  {
    id: 'clientes',
    group: 'vender',
    href: `${ADMIN_BASE_PATH}/clientes`,
    label: 'Clientes',
    description: 'Base e relacionamento',
    icon: Users,
    eyebrow: 'Clientes',
    title: 'Clientes e relacionamento',
    intro: 'Veja o histórico de cada cliente, acompanhe o funil de relacionamento, registre notas e agende follow-ups.',
    requiredPermission: 'customers:manage',
  },
  {
    id: 'canais',
    group: 'catálogo',
    href: `${ADMIN_BASE_PATH}/canais`,
    label: 'Canais',
    description: 'Marketplaces e anúncios',
    icon: Store,
    eyebrow: 'Canais',
    title: 'Canais de venda',
    intro: 'Conecte marketplaces, publique produtos como anúncios e mantenha preço e estoque sincronizados a partir da loja.',
    requiredPermission: 'channels:manage',
  },
  {
    id: 'integrações',
    group: 'ajustes',
    href: `${ADMIN_BASE_PATH}/integrações`,
    label: 'Integrações',
    description: 'OCR via OpenRouter',
    icon: Plug,
    eyebrow: 'Integrações',
    title: 'Integrações externas',
    intro: 'Configure a chave do OpenRouter, escolha os modelos VLM e teste a conexão usada pelo OCR de orçamentos.',
    requiredPermission: 'integrations:manage',
  },
  {
    id: 'acesso',
    group: 'ajustes',
    href: `${ADMIN_BASE_PATH}/acesso`,
    label: 'Acesso',
    description: 'Usuários e permissões',
    icon: ShieldCheck,
    eyebrow: 'Acesso',
    title: 'Usuários e níveis de acesso',
    intro: 'Crie usuários internos, distribua papeis e controle quais funções cada colaborador pode usar.',
    requiredPermission: 'access:manage',
  },
];

export function getMerchantNavItemsForRole(role?: UserRole | string | null) {
  if (!isMerchantUserRole(role)) {
    return [];
  }

  return NAV_SECTIONS.filter((item) => hasMerchantPermission(role, item.requiredPermission));
}

/*
 * Agrupa os itens permitidos preservando a ordem de NAV_GROUPS e descartando
 * grupos que ficaram vazios para o papel do usuário.
 */
export function groupMerchantNavItems(items: MerchantNavItem[]) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: items.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0);
}

export function getDefaultMerchantDashboardHref(role?: UserRole | string | null) {
  const firstAvailableItem = getMerchantNavItemsForRole(role)[0];
  return firstAvailableItem?.href ?? ADMIN_BASE_PATH;
}

export function canAccessMerchantSection(role: UserRole | string | null | undefined, section: MerchantSection) {
  const navItem = NAV_SECTIONS.find((item) => item.id === section);
  return navItem ? hasMerchantPermission(role, navItem.requiredPermission) : false;
}
