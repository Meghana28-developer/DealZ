import { AgentResponse, ChatMessage, CompareResponse, Product } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function chatWithAgent(message: string, history: ChatMessage[]): Promise<AgentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, history }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch response from DEALZ agent');
  }

  return response.json();
}

export async function getProducts(params?: {
  category?: string;
  query?: string;
  min_price?: number;
  max_price?: number;
  brand?: string;
}): Promise<{ count: number; products: Product[] }> {
  const queryParams = new URLSearchParams();
  if (params) {
    if (params.category) queryParams.append('category', params.category);
    if (params.query) queryParams.append('query', params.query);
    if (params.min_price !== undefined) queryParams.append('min_price', params.min_price.toString());
    if (params.max_price !== undefined) queryParams.append('max_price', params.max_price.toString());
    if (params.brand) queryParams.append('brand', params.brand);
  }

  const response = await fetch(`${API_BASE_URL}/api/products?${queryParams.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }

  return response.json();
}

export async function getProductDetails(id: string): Promise<{
  product: Product;
  reviews: any[];
  deal_score: number;
  buy_or_wait: string;
  buy_or_wait_reason: string;
  summary: any;
}> {
  const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch product details for ${id}`);
  }

  return response.json();
}

export async function compareProducts(productIds: string[]): Promise<CompareResponse> {
  const response = await fetch(`${API_BASE_URL}/api/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product_ids: productIds }),
  });

  if (!response.ok) {
    throw new Error('Failed to compare products');
  }

  return response.json();
}

export async function buildGoalSetup(query: string, budget: number): Promise<AgentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/goal-setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, budget }),
  });

  if (!response.ok) {
    throw new Error('Failed to build workspace setup');
  }

  return response.json();
}
