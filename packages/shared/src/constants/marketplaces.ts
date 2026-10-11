export type MarketplaceType = 'MERCADO_LIVRE' | 'SHOPEE' | 'AMAZON' | 'MAGALU' | 'CASAS_BAHIA' | 'AMERICANAS' | 'SHEIN';
export type MarketplaceField = { key: string; label: string; secret?: boolean; options?: readonly string[] };
export type MarketplaceDefinition = { type: MarketplaceType; name: string; docs: string; fields: readonly MarketplaceField[]; authorization: 'oauth' | 'credentials' };

export const MARKETPLACES: readonly MarketplaceDefinition[] = [
  { type: 'MERCADO_LIVRE', name: 'Mercado Livre', authorization: 'oauth', docs: 'https://developers.mercadolivre.com.br/pt_br/autenticacao-e-autorizacao', fields: [
    { key: 'clientId', label: 'ID da aplicação' }, { key: 'clientSecret', label: 'Segredo da aplicação', secret: true },
  ] },
  { type: 'SHOPEE', name: 'Shopee', authorization: 'credentials', docs: 'https://open.shopee.com/', fields: [
    { key: 'partnerId', label: 'Partner ID' }, { key: 'partnerKey', label: 'Partner Key', secret: true }, { key: 'shopId', label: 'ID da loja' },
    { key: 'accessToken', label: 'Access token autorizado', secret: true }, { key: 'refreshToken', label: 'Refresh token', secret: true },
  ] },
  { type: 'AMAZON', name: 'Amazon', authorization: 'credentials', docs: 'https://developer-docs.amazon.com/sp-api/docs/connecting-to-the-selling-partner-api', fields: [
    { key: 'clientId', label: 'Client ID do Login with Amazon' }, { key: 'clientSecret', label: 'Client secret', secret: true },
    { key: 'refreshToken', label: 'Refresh token autorizado', secret: true }, { key: 'sellerId', label: 'Seller ID' }, { key: 'marketplaceId', label: 'Marketplace ID do Brasil' },
  ] },
  { type: 'MAGALU', name: 'Magalu', authorization: 'oauth', docs: 'https://developers.magalu.com/docs/first-steps/create-an-application/authentication-authorization/index.html', fields: [
    { key: 'clientId', label: 'Client ID' }, { key: 'clientSecret', label: 'Client secret', secret: true }, { key: 'scopes', label: 'Escopos aprovados, separados por espaço' },
  ] },
  { type: 'CASAS_BAHIA', name: 'Casas Bahia', authorization: 'credentials', docs: 'https://developers.grupocasasbahia.com.br/marketplace/docs/autenticacao', fields: [
    { key: 'clientId', label: 'Client ID da integradora' }, { key: 'accessToken', label: 'Access token do lojista', secret: true },
    { key: 'environment', label: 'Ambiente', options: ['homologation', 'production'] },
  ] },
  { type: 'AMERICANAS', name: 'Americanas', authorization: 'credentials', docs: 'https://desenvolvedores.skyhub.com.br/guias-api-skyhub/autenticacao-e-formato-dos-dados', fields: [
    { key: 'userEmail', label: 'E-mail da conta SkyHub' }, { key: 'apiKey', label: 'API Key', secret: true }, { key: 'accountManagerKey', label: 'Account Manager Key da integradora', secret: true },
  ] },
  { type: 'SHEIN', name: 'SHEIN', authorization: 'credentials', docs: 'https://open.sheincorp.com/', fields: [
    { key: 'appId', label: 'App ID' }, { key: 'appSecretKey', label: 'App Secret Key', secret: true },
    { key: 'openKeyId', label: 'Open Key ID da loja autorizada' }, { key: 'secretKey', label: 'Secret Key decifrada da loja', secret: true },
    { key: 'businessMode', label: 'Modalidade aprovada', options: ['POP', 'self-operated', 'semi-managed', 'fully-managed'] },
  ] },
];
