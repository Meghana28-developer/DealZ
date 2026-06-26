export interface ProductSpecs {
  [key: string]: string;
}

export interface Review {
  id: string;
  product_id: string;
  user_name: string;
  rating: number;
  comment: string;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface ReviewSummary {
  pros: string[];
  cons: string[];
  complaints: string;
  best_for: string;
  avoid_if: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  rating: number;
  image_url: string;
  specs: ProductSpecs;
  historical_prices: number[];
  
  // Appended by agent
  deal_score?: number;
  pros?: string[];
  cons?: string[];
  why_recommended?: string;
  buy_or_wait?: string;
  buy_or_wait_reason?: string;
}

export interface Alternative {
  id: string;
  name: string;
  price: number;
  rating: number;
  deal_score: number;
  specs: ProductSpecs;
  why_recommended: string;
  trade_off: string;
}

export interface SetupDetails {
  total_price: number;
  budget: number;
  items: {
    laptop?: Product;
    monitor?: Product;
    keyboard?: Product;
    mouse?: Product;
    [key: string]: Product | undefined;
  };
  reasoning: string;
  deal_score: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentResponse {
  response_text: string;
  category: string | null;
  budget: number | null;
  preferences: string[];
  products: Product[];
  alternatives: Alternative[];
  is_setup: boolean;
  setup_details: SetupDetails | null;
}

export interface CompareResponse {
  products: (Product & { summary: ReviewSummary })[];
  winner_id: string;
  verdict: string;
  same_category: boolean;
}
