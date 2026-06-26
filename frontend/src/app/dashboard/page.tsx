'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, Star, TrendingDown, Flame, Scale, 
  ArrowUpRight, Heart, Laptop, Smartphone, Headphones, Layout, Plus, CheckSquare
} from 'lucide-react';
import { getProducts, getProductDetails } from '@/lib/api';
import { Product } from '@/lib/types';

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [compareList, setCompareList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Categories lists
  const categories = [
    { id: 'all', name: 'All Gear', icon: Sparkles },
    { id: 'laptop', name: 'Laptops', icon: Laptop },
    { id: 'phone', name: 'Phones', icon: Smartphone },
    { id: 'earbuds', name: 'Audio', icon: Headphones },
    { id: 'monitor', name: 'Monitors', icon: Layout },
  ];

  // Load products and compare list on mount
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const data = await getProducts();
        
        // Enrich products with computed metrics
        const enriched = data.products.map(p => {
          // Calculate deal score locally for dashboard display
          const prices = p.historical_prices || [];
          let price_comp = 1.5;
          if (prices.length > 1) {
            const highest = Math.max(...prices);
            const lowest = Math.min(...prices);
            if (highest > lowest) {
              price_comp = ((highest - p.price) / (highest - lowest)) * 3.0;
            }
          }
          const rating_score = (p.rating / 5.0) * 5.0;
          const ds = Math.min(10.0, Math.max(1.0, rating_score + price_comp + 1.5));
          
          return {
            ...p,
            deal_score: round(ds, 1)
          };
        });
        
        setProducts(enriched);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load products list. Make sure backend is active.");
      } finally {
        setLoading(false);
      }
    }

    const list = localStorage.getItem('dealz_compare_list');
    if (list) {
      try {
        setCompareList(JSON.parse(list));
      } catch (e) {
        console.error(e);
      }
    }

    loadDashboard();
  }, []);

  const round = (value: number, decimals: number) => {
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals);
  };

  const toggleComparison = (id: string) => {
    let updated: string[];
    if (compareList.includes(id)) {
      updated = compareList.filter(item => item !== id);
    } else {
      if (compareList.length >= 3) {
        alert("You can compare a maximum of 3 products at a time.");
        return;
      }
      updated = [...compareList, id];
    }
    setCompareList(updated);
    localStorage.setItem('dealz_compare_list', JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b0f19] text-slate-400 font-bold">
        Curating recommendation dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0b0f19] space-y-4">
        <Flame className="w-12 h-12 text-rose-500 animate-bounce" />
        <h3 className="text-lg font-bold text-white font-extrabold">Dashboard Offline</h3>
        <p className="text-xs text-slate-400 max-w-xs text-center">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
        >
          Try Reconnecting
        </button>
      </div>
    );
  }

  // Filter products by active category
  const filteredProducts = activeCategory === 'all' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  // Curate special dashboard panels
  const hotDeals = [...products]
    .filter(p => (p.deal_score || 0) >= 8.5)
    .sort((a, b) => (b.deal_score || 0) - (a.deal_score || 0))
    .slice(0, 3);

  const topRated = [...products]
    .filter(p => p.rating >= 4.6)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-slate-700 text-slate-300';
    if (score >= 8.5) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 6.0) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
  };

  return (
    <div className="flex-1 p-6 md:p-10 space-y-8 bg-[#0b0f19] relative pb-24">
      
      {/* Decorative Blur */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <div>
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
          Shopping intelligence
        </span>
        <h2 className="text-2xl font-black text-white mt-1">Recommendation Center</h2>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          A real-time display of trending deals, top-rated specs, and price dips loaded from the DEALZ AI catalog.
        </p>
      </div>

      {/* Curated highlights widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Hot Deals widget */}
        <div className="p-5 rounded-2xl bg-[#141b2d] border border-white/5 space-y-4 glass shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Flame className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Hot Trending Deals</h3>
          </div>
          <div className="space-y-3">
            {hotDeals.map((p) => (
              <div 
                key={p.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-800" />
                  <div>
                    <h4 className="text-xs font-extrabold text-white line-clamp-1 leading-snug">{p.name}</h4>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">{p.brand} &bull; ₹{p.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getScoreColor(p.deal_score)}`}>
                    Score: {p.deal_score}
                  </span>
                  <Link 
                    href={`/product/${p.id}`}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Rated widget */}
        <div className="p-5 rounded-2xl bg-[#141b2d] border border-white/5 space-y-4 glass shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-white/5">
            <Star className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Top Rated Gear</h3>
          </div>
          <div className="space-y-3">
            {topRated.map((p) => (
              <div 
                key={p.id} 
                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0 bg-slate-800" />
                  <div>
                    <h4 className="text-xs font-extrabold text-white line-clamp-1 leading-snug">{p.name}</h4>
                    <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">{p.brand} &bull; ₹{p.price.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15 flex items-center gap-0.5">
                    ★ {p.rating}
                  </span>
                  <Link 
                    href={`/product/${p.id}`}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Main product feed with dynamic category filters */}
      <div className="space-y-6">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 pb-1 border-b border-white/5">
          {categories.map((c) => {
            const Icon = c.icon;
            const isTabActive = activeCategory === c.id;
            
            return (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
                  isTabActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Products Grid list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => (
            <div 
              key={p.id} 
              className="p-4 rounded-2xl bg-[#141b2d] border border-white/5 hover:border-white/10 flex flex-col justify-between space-y-4 shadow-xl glass transition-all hover:scale-[1.01]"
            >
              
              <div className="space-y-3">
                {/* Image Cover */}
                <div className="h-40 w-full rounded-xl overflow-hidden relative border border-white/10 bg-slate-800">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  <button className="absolute top-2.5 right-2.5 p-2 rounded-lg bg-[#0b0f19]/70 hover:bg-[#0b0f19] border border-white/5 text-slate-400 hover:text-rose-500 transition-colors">
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-2.5 left-2.5 text-[8px] font-black uppercase tracking-wider text-indigo-400 bg-[#0b0f19]/80 border border-white/10 px-2 py-0.5 rounded">
                    {p.category}
                  </span>
                </div>

                {/* Info titles */}
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-extrabold text-white line-clamp-2 leading-tight">{p.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black border shrink-0 ${getScoreColor(p.deal_score)}`}>
                      DS: {p.deal_score}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{p.brand}</p>
                </div>
              </div>

              {/* Bottom specs and pricing */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black text-white">₹{p.price.toLocaleString()}</span>
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-0.5">
                    ★ {p.rating}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Link 
                    href={`/product/${p.id}`}
                    className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-wider rounded-lg text-center transition-colors shadow-md"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => toggleComparison(p.id)}
                    className={`py-2 border text-[10px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                      compareList.includes(p.id)
                        ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400'
                        : 'border-white/5 hover:border-white/10 hover:bg-white/5 text-slate-300'
                    }`}
                  >
                    {compareList.includes(p.id) ? '✓ Compare' : '+ Compare'}
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>

      {/* Sticky Bottom Compare Drawer shortcut */}
      {compareList.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-[18.5rem] md:right-8 bg-[#141b2d]/90 border border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 z-40 glass backdrop-blur animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Compare Drawer ({compareList.length}/3)</h4>
              <p className="text-xs text-slate-400 font-medium">Add products to side-by-side matrices.</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                setCompareList([]);
                localStorage.removeItem('dealz_compare_list');
              }}
              className="px-4 py-2 border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Clear
            </button>
            <Link
              href="/compare"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg"
            >
              Compare &rarr;
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
