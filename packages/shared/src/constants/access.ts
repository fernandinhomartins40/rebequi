import { UserRole } from '../types/user.js';

export type MerchantPermission =
  | 'dashboard:view'
  | 'catalog:manage'
  | 'promotions:manage'
  | 'orders:manage'
  | 'quotes:manage'
  | 'access:manage'
  | 'integrations:manage';

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
  'dashboard:view': {
    label: 'Visao geral',
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
  'quotes:manage': {
    label: 'Orcamentos',
    description: 'Atende leads, acompanha solicitacoes e atualiza status comerciais.',
  },
  'access:manage': {
    label: 'Acesso',
    description: 'Cria usuarios internos, altera roles e controla a equipe.',
  },
  'integrations:manage': {
    label: 'Integracoes',
    description: 'Configura integracoes externas como OpenRouter (OCR) e chaves de API.',
  },
};

export const MERCHANT_ROLE_PROFILES: Record<InternalUserRole, RoleProfile> = {
  [UserRole.ADMIN]: {
    label: 'Administrador',
    description: 'Controle total do painel, incluindo acesso e configuracao da equipe.',
    permissions: [
      'dashboard:view',
      'catalog:manage',
      'promotions:manage',
      'orders:manage',
      'quotes:manage',
      'access:manage',
      'integrations:manage',
    ],
  },
  [UserRole.MANAGER]: {
    label: 'Gerente operacional',
    description: 'Opera o painel quase por completo, sem gerenciar usuarios internos.',
    permissions: [
      'dashboard:view',
      'catalog:manage',
      'promotions:manage',
      'orders:manage',
      'quotes:manage',
      'integrations:manage',
    ],
  },
  [UserRole.CATALOG_MANAGER]: {
    label: 'Gestor de catalogo',
    description: 'Responsavel por cadastro, manutencao e organizacao do catalogo.',
    permissions: ['dashboard:view', 'catalog:manage'],
  },
  [UserRole.MARKETING]: {
    label: 'Gestor de promocoes',
    description: 'Cuida das campanhas, vitrines e destaques promocionais.',
    permissions: ['promotions:manage'],
  },
  [UserRole.SALES]: {
    label: 'Operador comercial',
    description: 'Atende solicitacoes, pedidos, recuperacao de vendas e acompanha o fluxo comercial.',
    permissions: ['orders:manage', 'quotes:manage'],
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
