export interface OrderBumpService {
  id: string;
  name: string;
  price_cents: number;
  photo_url: string | null;
}

export interface OrderBumpProduct {
  id: string;
  name: string;
  sale_price_cents: number;
  photo_url: string | null;
  description: string | null;
}

export interface OrderBumpMapping {
  id: string;
  product_id: string;
  sort_order: number;
  active: boolean;
  custom_pitch: string | null;
  product: OrderBumpProduct | null;
  pitch_text: string | null;
  pitch_generated_at: string | null;
  pitch_model: string | null;
}

export interface OrderBumpHistorySuggestion {
  product_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  sale_price_cents: number;
  sales_count: number;
  last_sold_at: string;
}

export const MAX_ACTIVE_PER_SERVICE = 3;
export const PITCH_MAX_LENGTH = 220;
export const PITCH_MIN_LENGTH = 1;
