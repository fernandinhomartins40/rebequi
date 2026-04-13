import type { ComponentType } from 'react';
import type { QuoteItemInputDTO } from '@/types';

export type EditableQuoteItem = QuoteItemInputDTO & { id?: string };

export type DraftEditorState = {
  title: string;
  customerNote: string;
  items: EditableQuoteItem[];
};

export type ActiveTab = 'overview' | 'quotes' | 'profile' | 'security';

export type DashboardNavItem = {
  id: ActiveTab;
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  badge?: string;
};

export const EMPTY_ITEM: EditableQuoteItem = { name: '', quantity: 1, unit: '', notes: '' };
