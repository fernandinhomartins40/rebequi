import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Product } from '@/types';

const STORAGE_KEY = 'rebequi:cart:v1';
const PRODUCT_PLACEHOLDER = '/placeholder.svg';

export type CartItem = {
  productId: string;
  promotionId?: string;
  slug: string;
  name: string;
  image: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  quantity: number;
  isOffer: boolean;
  isNew: boolean;
};

type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  isEmpty: boolean;
  addItem: (product: Product, quantity?: number, promotionId?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  hasItem: (productId: string) => boolean;
  getItemQuantity: (productId: string) => number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function clampQuantity(quantity: number, stock: number) {
  if (!Number.isFinite(quantity)) {
    return 1;
  }

  if (stock <= 0) {
    return 0;
  }

  return Math.min(Math.max(Math.round(quantity), 1), stock);
}

function getProductPrimaryImage(product: Product) {
  return (
    product.images?.find((image) => image.isPrimary)?.url ||
    product.images?.[0]?.url ||
    PRODUCT_PLACEHOLDER
  );
}

function toCartItem(product: Product, quantity: number, promotionId?: string): CartItem {
  return {
    category: product.category?.name || 'Catalogo',
    image: getProductPrimaryImage(product),
    isNew: product.isNew,
    isOffer: product.isOffer,
    name: product.name,
    originalPrice: product.originalPrice,
    price: product.price,
    productId: product.id,
    promotionId,
    quantity: clampQuantity(quantity, (product.availableStock ?? product.stock)),
    slug: product.slug,
    stock: (product.availableStock ?? product.stock),
  };
}

function readInitialCart() {
  if (typeof window === 'undefined') {
    return [] as CartItem[];
  }

  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) {
    return [] as CartItem[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [] as CartItem[];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readInitialCart);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);

    return {
      addItem: (product, quantity = 1, promotionId) => {
        if ((product.availableStock ?? product.stock) <= 0) {
          return;
        }

        setItems((currentItems) => {
          const existingItem = currentItems.find((item) => item.productId === product.id);

          if (!existingItem) {
            return [...currentItems, toCartItem(product, quantity, promotionId)];
          }

          return currentItems.map((item) =>
            item.productId === product.id
              ? {
                  ...item,
                  image: getProductPrimaryImage(product),
                  originalPrice: product.originalPrice,
                  price: product.price,
                  promotionId: promotionId ?? item.promotionId,
                  quantity: clampQuantity(item.quantity + quantity, (product.availableStock ?? product.stock)),
                  stock: (product.availableStock ?? product.stock),
                }
              : item
          );
        });
      },
      clearCart: () => setItems([]),
      getItemQuantity: (productId) => items.find((item) => item.productId === productId)?.quantity ?? 0,
      hasItem: (productId) => items.some((item) => item.productId === productId),
      isEmpty: items.length === 0,
      items,
      removeItem: (productId) => {
        setItems((currentItems) => currentItems.filter((item) => item.productId !== productId));
      },
      subtotal,
      totalItems,
      updateQuantity: (productId, quantity) => {
        setItems((currentItems) =>
          currentItems.flatMap((item) => {
            if (item.productId !== productId) {
              return [item];
            }

            const nextQuantity = clampQuantity(quantity, item.stock);
            return nextQuantity > 0 ? [{ ...item, quantity: nextQuantity }] : [];
          })
        );
      },
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}
