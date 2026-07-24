/**
 * Centralized Types for Frontend
 * Re-export shared types and define local component types
 */

// Re-export from shared package
export type {
  Product,
  ProductImage,
  ProductFilters,
  ProductResponse,
  CreateProductDTO,
  UpdateProductDTO,
  Category,
  CategoryResponse,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  Promotion,
  PromotionImageAsset,
  PromotionTheme,
  PromotionStatus,
  PromotionFilters,
  PromotionResponse,
  CreatePromotionDTO,
  UpdatePromotionDTO,
  CustomerOrder,
  CustomerOrderItem,
  CustomerOrderResponse,
  CheckoutOrderItemDTO,
  PublicCheckoutOrderDTO,
  AuthenticatedCheckoutOrderDTO,
  CheckoutOrderResponse,
  UpdateOrderStatusDTO,
  OrderFilters,
  OrderStatus,
  Sale,
  SaleItem,
  SaleResponse,
  CreateSaleDTO,
  CreateSaleItemDTO,
  UpdateSaleStatusDTO,
  SaleFilters,
  RevenueSummary,
  RevenuePaymentBreakdown,
  CustomerNote,
  CustomerMetrics,
  CustomerListItem,
  CustomerListResponse,
  CustomerTimelineEntry,
  CustomerDetail,
  CustomerStageDistribution,
  CustomerFilters,
  UpdateCustomerCrmDTO,
  CreateCustomerNoteDTO,
  Channel,
  ChannelListing,
  ChannelResponse,
  ChannelListingResponse,
  CreateChannelDTO,
  UpdateChannelDTO,
  ChannelFilters,
  PublishListingDTO,
  ListingFilters,
  ChannelSyncResult,
  QuoteItem,
  QuoteRequest,
  QuoteResponse,
  LeadCapture,
  LeadResponse,
  StartLeadDTO,
  StartLeadResponse,
  QuoteItemInputDTO,
  UpdateQuoteDraftDTO,
  UpdateQuoteStatusDTO,
  UpdateLeadStatusDTO,
  QuoteStatus,
  QuoteOcrStatus,
  LeadStatus,
  User,
  UserRole,
  LoginDTO,
  RegisterDTO,
  ProvisionalCredentials,
  AuthResponse,
  ChangePasswordDTO,
} from '@rebequi/shared/types';

// Enums re-exported as values (used directly in components)
export { PaymentMethod, SaleStatus, StockMovementType, CustomerStage } from '@rebequi/shared/types';
export { ChannelType, ChannelStatus, ListingSyncStatus } from '@rebequi/shared/types';

// Local component types
export interface SlideData {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
}

export interface CategoryItemData {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface NavigationItem {
  name: string;
  href: string;
}

// API Error types
export interface APIError extends Error {
  statusCode?: number;
  code?: string;
}
