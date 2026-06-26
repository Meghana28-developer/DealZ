'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Star, Scale, Trash2, Check, X, 
  TrendingDown, TrendingUp, Sparkles, AlertTriangle
} from 'lucide-react';
import { compareProducts } from '@/lib/api';
import { Product, ReviewSummary } from '@/lib/types';

interface ComparisonProduct extends Product {
  summary: ReviewSummary;
}

export default function ComparePage() {
  const router = useRouter();
  
  const [productIds, setProductIds] = useState<string[]>([]);
  const [products, setProducts] = useState<ComparisonProduct[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load product IDs from localStorage on mount
  useEffect(() => {
    const list = localStorage.getItem('dealz_compare_list');
    if (list) {
      try {
        const parsed = JSON.parse(list);
        setProductIds(parsed);
      } catch (e) {
        console.error(e);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch comparison details when product IDs change
  useEffect(() => {
    if (productIds.length === 0) {
      setLoading(false);
      return;
    }
    
    async function loadComparison() {
      try {
        setLoading(true);
        setError(null);
        const data = await compareProducts(productIds);
        setProducts(data.products as ComparisonProduct[]);
        setWinnerId(data.winner_id);
        setVerdict(data.verdict);
      } catch (err: any) {
        console.error(err);
        setError("Failed to generate spec comparison. Check if the server is active.");
      } finally {
        setLoading(false);
      }
    }
    
    loadComparison();
  }, [productIds]);

  // Remove a product from comparison list
  const removeProduct = (id: string) => {
    const updated = productIds.filter(pid => pid !== id);
    setProductIds(updated);
    localStorage.setItem('dealz_compare_list', JSON.stringify(updated));
    // Clear list from localStorage if empty
    if (updated.length === 0) {
      localStorage.removeItem('dealz_compare_list');
      setProducts([]);
    }
  };

  const clearAll = () => {
    setProductIds([]);
    setProducts([]);
    localStorage.removeItem('dealz_compare_list');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b0f19] text-slate-400 font-bold">
        Aligning specifications and reviews...
      </div>
    );
  }

  if (productIds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0b0f19] text-center space-y-4 max-w-sm mx-auto">
        <Scale className="w-12 h-12 text-slate-600 animate-pulse" />
        <h3 className="text-lg font-bold text-white">Compare List is Empty</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Go back to the AI Chat page or the Deals Dashboard, and add products to the compare drawer to see side-by-side specs and AI verdicts.
        </p>
        <Link 
          href="/chat" 
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg"
        >
          Go to AI Chat &rarr;
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0b0f19] space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h3 className="text-lg font-bold text-white">Comparison Failed</h3>
        <p className="text-xs text-slate-400 text-center max-w-xs">{error}</p>
        <div className="flex gap-2">
          <button 
            onClick={() => router.back()} 
            className="px-4 py-2 border border-white/10 text-slate-400 hover:text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Go Back
          </button>
          <button 
            onClick={clearAll} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer"
          >
            Clear Compare List
          </button>
        </div>
      </div>
    );
  }

  // Gather all unique specification keys across compared products
  const allSpecKeys = Array.from(
    new Set(products.flatMap(p => Object.keys(p.specs || {})))
  );

  const getScoreBg = (score?: number) => {
    if (!score) return 'bg-slate-800 text-slate-400';
    if (score >= 8.5) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (score >= 6.0) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  const getBuyWaitColor = (signal?: string) => {
    if (!signal) return 'bg-slate-800';
    if (signal.includes('BUY')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  };

  return (
    <div className="flex-1 p-6 md:p-10 space-y-8 bg-[#0b0f19] overflow-x-auto">
      
      {/* Header bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Decision Matrix</span>
          <h2 className="text-2xl font-black text-white mt-1">Product Comparison</h2>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/chat" 
            className="px-4 py-2 border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Chat
          </Link>
          <button 
            onClick={clearAll} 
            className="px-4 py-2 bg-rose-600/15 border border-rose-500/30 text-rose-400 hover:bg-rose-600/25 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Clear Comparison ({products.length})
          </button>
        </div>
      </div>

      {/* Concierge Verdict banner */}
      {verdict && (
        <div className="p-5 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 space-y-2 relative overflow-hidden glass shadow-lg animate-fade-in">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-indigo-400" />
            <h4 className="text-xs font-black uppercase text-white tracking-widest">
              AI Concierge Verdict
            </h4>
          </div>
          <p className="text-sm text-slate-300 font-medium leading-relaxed">
            {verdict}
          </p>
        </div>
      )}

      {/* Comparison Grid Table */}
      <div className="min-w-[800px] border border-white/5 rounded-2xl bg-[#141b2d] overflow-hidden glass shadow-2xl animate-fade-in">
        
        {/* Table Header: Product Cards */}
        <div className="grid grid-cols-4 border-b border-white/5 bg-white/[0.01]">
          <div className="p-6 border-r border-white/5 flex flex-col justify-end">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Specifications</p>
          </div>
          
          {products.map((p) => (
            <div key={p.id} className="p-6 border-r border-white/5 flex flex-col justify-between space-y-4 relative">
              
              {/* Highlight winner sticker */}
              {p.id === winnerId && (
                <span className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded animate-pulse">
                  Concierge Pick
                </span>
              )}
              
              <div className="space-y-2">
                <img 
                  src={p.image_url} 
                  alt={p.name} 
                  className="w-16 h-16 rounded-lg object-cover bg-slate-800 border border-white/10"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-white line-clamp-2 leading-tight">{p.name}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{p.brand} &bull; {p.category}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-lg font-black text-white">₹{p.price.toLocaleString()}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400" />
                  <span>{p.rating} / 5</span>
                </div>
              </div>

              <button
                onClick={() => removeProduct(p.id)}
                className="w-full py-2 hover:bg-rose-600/10 border border-white/5 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>

            </div>
          ))}

          {/* Empty columns if comparing less than 3 */}
          {Array.from({ length: 3 - products.length }).map((_, idx) => (
            <div key={idx} className="p-6 border-r border-white/5 flex flex-col items-center justify-center text-center text-slate-600 italic text-xs font-semibold">
              Slot Empty
            </div>
          ))}
        </div>

        {/* SECTION 1: Deal Score */}
        <div className="grid grid-cols-4 border-b border-white/5 bg-white/[0.01]">
          <div className="p-4 border-r border-white/5 font-bold text-xs text-slate-400 flex items-center">
            Deal Score
          </div>
          {products.map((p) => (
            <div key={p.id} className="p-4 border-r border-white/5 flex items-center">
              <span className={`px-2.5 py-1 rounded-lg border text-xs font-black ${getScoreBg(p.deal_score)}`}>
                {p.deal_score}/10
              </span>
            </div>
          ))}
          {Array.from({ length: 3 - products.length }).map((_, idx) => (
            <div key={idx} className="p-4 border-r border-white/5" />
          ))}
        </div>

        {/* SECTION 2: Decision Signal */}
        <div className="grid grid-cols-4 border-b border-white/5">
          <div className="p-4 border-r border-white/5 font-bold text-xs text-slate-400 flex items-center">
            Buying Verdict
          </div>
          {products.map((p) => (
            <div key={p.id} className="p-4 border-r border-white/5 flex items-center">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${getBuyWaitColor(p.buy_or_wait)}`}>
                {p.buy_or_wait}
              </span>
            </div>
          ))}
          {Array.from({ length: 3 - products.length }).map((_, idx) => (
            <div key={idx} className="p-4 border-r border-white/5" />
          ))}
        </div>

        {/* SECTION 3: Best For */}
        <div className="grid grid-cols-4 border-b border-white/5 bg-white/[0.01]">
          <div className="p-4 border-r border-white/5 font-bold text-xs text-slate-400 flex items-center">
            Ideal For
          </div>
          {products.map((p) => (
            <div key={p.id} className="p-4 border-r border-white/5 text-xs text-slate-300 font-semibold leading-relaxed">
              {p.summary?.best_for || "N/A"}
            </div>
          ))}
          {Array.from({ length: 3 - products.length }).map((_, idx) => (
            <div key={idx} className="p-4 border-r border-white/5" />
          ))}
        </div>

        {/* SECTION 4: Top Pros & Cons */}
        <div className="grid grid-cols-4 border-b border-white/5">
          <div className="p-4 border-r border-white/5 font-bold text-xs text-slate-400 flex items-center">
            Key Pros
          </div>
          {products.map((p) => (
            <div key={p.id} className="p-4 border-r border-white/5 text-xs text-slate-400 space-y-1.5 font-medium">
              {(p.summary?.pros || []).map((pro, idx) => (
                <div key={idx} className="flex items-start gap-1">
                  <Check className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{pro}</span>
                </div>
              ))}
            </div>
          ))}
          {Array.from({ length: 3 - products.length }).map((_, idx) => (
            <div key={idx} className="p-4 border-r border-white/5" />
          ))}
        </div>

        <div className="grid grid-cols-4 border-b border-white/5 bg-white/[0.01]">
          <div className="p-4 border-r border-white/5 font-bold text-xs text-slate-400 flex items-center">
            Key Cons
          </div>
          {products.map((p) => (
            <div key={p.id} className="p-4 border-r border-white/5 text-xs text-slate-400 space-y-1.5 font-medium">
              {(p.summary?.cons || []).map((con, idx) => (
                <div key={idx} className="flex items-start gap-1">
                  <X className="w-3 h-3 text-rose-400 mt-0.5 shrink-0" />
                  <span>{con}</span>
                </div>
              ))}
            </div>
          ))}
          {Array.from({ length: 3 - products.length }).map((_, idx) => (
            <div key={idx} className="p-4 border-r border-white/5" />
          ))}
        </div>

        {/* SECTION 5: Specs rows */}
        <div className="bg-white/[0.02] border-b border-white/5 px-4 py-2 font-bold text-[10px] text-slate-500 uppercase tracking-widest">
          Hardware Specs
        </div>

        {allSpecKeys.map((key) => (
          <div key={key} className="grid grid-cols-4 border-b border-white/5 hover:bg-white/[0.01]">
            <div className="p-4 border-r border-white/5 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center">
              {key}
            </div>
            
            {products.map((p) => (
              <div key={p.id} className="p-4 border-r border-white/5 text-xs text-slate-300 font-bold leading-normal">
                {p.specs[key] || <span className="text-slate-600 font-semibold">—</span>}
              </div>
            ))}
            
            {Array.from({ length: 3 - products.length }).map((_, idx) => (
              <div key={idx} className="p-4 border-r border-white/5" />
            ))}
          </div>
        ))}

      </div>

    </div>
  );
}
