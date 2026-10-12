import { UserRole } from '../types/user.js';

export type MerchantPermission =
  | 'dashboard:view'
  | 'catalog:manage'
  | 'catalog:read'
  | 'commercial:assign'
  | 'promotions:manage'
  | 'orders:manage'
  | 'sales:manage'
  | 'customers:manage'
  | 'quotes:manage'
  | 'channels:manage'
  | 'access:manage'
  | 'integrations:manage'
  | 'partners:manage'
  | 'partners:finance';

export type InternalUserRole = Exclude<UserRole, UserRole.CUSTOMER>;

type RoleProfile = {
  description: string;
  label: string;
  permissions: MerchantPermission[];
};

type PermissionProfile = {
  description: string;
  label: string;
};

export const INTERNAL_USER_ROLES: InternalUserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.CATALOG_MANAGER,
  UserRole.MARKETING,
  UserRole.SALES,
];

export const MERCHANT_PERMISSION_PROFILES: Record<MerchantPermission, PermissionProfile> = {
  'catalog:read': { label: 'Consulta de catálogo', description: 'Consulta produtos, preços e disponibilidade sem editar o catálogo.' },
  'commercial:assign': { label: 'Distribuição comercial', description: 'Atribui e redistribui clientes, atendimentos, pedidos e vendas entre colaboradores.' },
  'partners:finance': { label: 'Financeiro de parceiros', description: 'Publica regras, confere extratos, registra pagamentos e gerencia recompensas e resgates.' },
  'partners:manage': { label: 'Parceiros', description: 'Confere e aprova cadastros de profissionais parceiros.' },
  'dashboard:view': {
    label: 'Visão geral',
    description: 'Acompanha o resumo operacional do painel do lojista.',
  },
  'catalog:manage': {
    label: 'Catalogo',
    description: 'Cadastra, edita e publica categorias, produtos, imagens e estoque.',
  },
  'promotions:manage': {
    label: 'Promocoes',
    description: 'Cria campanhas promocionais, ofertas e destaques de vitrine.',
  },
  'orders:manage': {
    label: 'Pedidos',
    description: 'Acompanha pedidos do carrinho, checkout por WhatsApp e recuperacao de vendas.',
  },
  'sales:manage': {
    label: 'Vendas',
    description: 'Registra vendas, controla pagamentos, estoque e acompanha o faturamento.',
  },
  'customers:manage': {
    label: 'Clientes',
    description: 'Gerencia a base de clientes, histórico, funil de relacionamento, notas e follow-up.',
  },
  'quotes:manage': {
    label: 'Orcamentos',
    description: 'Atende leads, acompanha solicitacoes e atualiza status comerciais.',
  },
  'channels:manage': {
    label: 'Canais',
    description: 'Conecta marketplaces, publica anúncios e sincroniza preço e estoque com canais externos.',
  },
  'access:manage': {
    label: 'Acesso',
    description: 'Cria usuarios internos, altera roles e controla a equipe.',
  },
  'integrations:manage': {
    label: 'Integracoes',
    description: 'Configura integracoes externas como IA de orçamentos e chaves de API.',
  },
};

export const MERCHANT_ROLE_PROFILES: Record<InternalUserRole, RoleProfile> = {
  [UserRole.ADMIN]: {
    label: 'Administrador',
    description: 'Controle total do painel, incluindo acesso e configuracao da equipe.',
    permissions: [
      'catalog:read', 'commercial:assign',
      'partners:finance',
      'partners:manage',
      'dashboard:view',
      'catalog:manage',
      'promotions:manage',
      'orders:manage',
      'sales:manage',
      'customers:manage',
      'quotes:manage',
      'channels:manage',
      'access:manage',
      'integrations:manage',
    ],
  },
  [UserRole.MANAGER]: {
    label: 'Gerente operacional',
    description: 'Opera o painel quase por completo, sem gerenciar usuarios internos.',
    permissions: [
      'catalog:read', 'commercial:assign',
      'partners:finance',
      'partners:manage',
      'dashboard:view',
      'catalog:manage',
      'promotions:manage',
      'orders:manage',
      'sales:manage',
      'customers:manage',
      'quotes:manage',
      'channels:manage',
      'integrations:manage',
    ],
  },
  [UserRole.CATALOG_MANAGER]: {
    label: 'Gestor de catalogo',
    description: 'Responsavel por cadastro, manutencao e organizacao do catalogo.',
    permissions: ['dashboard:view', 'catalog:read', 'catalog:manage'],
  },
  [UserRole.MARKETING]: {
    label: 'Gestor de promoções',
    description: 'Cuida das campanhas, vitrines e destaques promocionais.',
    permissions: ['promotions:manage'],
  },
  [UserRole.SALES]: {
    label: 'Operador comercial',
    description: 'Atende solicitacoes, pedidos, recuperacao de vendas e acompanha o fluxo comercial.',
    permissions: ['catalog:read', 'orders:manage', 'sales:manage', 'customers:manage', 'quotes:manage'],
  },
};

export function isMerchantUserRole(role?: UserRole | string | null): role is InternalUserRole {
  return Boolean(role && INTERNAL_USER_ROLES.includes(role as InternalUserRole));
}

export function getMerchantPermissionsForRole(role?: UserRole | string | null): MerchantPermission[] {
  if (!isMerchantUserRole(role)) {
    return [];
  }

  return MERCHANT_ROLE_PROFILES[role].permissions;
}

export function hasMerchantPermission(
  role: UserRole | string | null | undefined,
  permission: MerchantPermission,
): boolean {
  return getMerchantPermissionsForRole(role).includes(permission);
}

export function getMerchantRoleLabel(role?: UserRole | string | null): string {
  if (!isMerchantUserRole(role)) {
    return role === UserRole.CUSTOMER ? 'Cliente' : 'Nao definido';
  }

  return MERCHANT_ROLE_PROFILES[role].label;
}

export function getMerchantRoleDescription(role?: UserRole | string | null): string {
  if (!isMerchantUserRole(role)) {
    return role === UserRole.CUSTOMER ? 'Acesso do cliente ao painel do comprador.' : 'Perfil sem definicao de acesso.';
  }

  return MERCHANT_ROLE_PROFILES[role].description;
}

export function getMerchantPermissionLabel(permission: MerchantPermission): string {
  return MERCHANT_PERMISSION_PROFILES[permission].label;
}

export function getMerchantPermissionDescription(permission: MerchantPermission): string {
  return MERCHANT_PERMISSION_PROFILES[permission].description;
}

export function getRolesForMerchantPermission(permission: MerchantPermission): InternalUserRole[] {
  return INTERNAL_USER_ROLES.filter((role) => MERCHANT_ROLE_PROFILES[role].permissions.includes(permission));
}
