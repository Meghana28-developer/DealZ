'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Star, TrendingDown, TrendingUp, Check, X, AlertTriangle, 
  Sparkles, ShieldCheck, Heart, Share2, HelpCircle
} from 'lucide-react';
import { getProductDetails } from '@/lib/api';
import { Product, Review, ReviewSummary } from '@/lib/types';

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [dealScore, setDealScore] = useState<number | null>(null);
  const [buyOrWait, setBuyOrWait] = useState<string | null>(null);
  const [buyOrWaitReason, setBuyOrWaitReason] = useState<string | null>(null);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    
    async function loadDetails() {
      try {
        setLoading(true);
        const data = await getProductDetails(id);
        setProduct(data.product);
        setReviews(data.reviews);
        setDealScore(data.deal_score);
        setBuyOrWait(data.buy_or_wait);
        setBuyOrWaitReason(data.buy_or_wait_reason);
        setSummary(data.summary);
      } catch (err: any) {
        console.error(err);
        setError("Could not load product details. Make sure the backend server is running.");
      } finally {
        setLoading(false);
      }
    }
    
    loadDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0b0f19] text-slate-400 font-bold">
        Analyzing specs and prices...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0b0f19] space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h3 className="text-lg font-bold text-white">Oops, detail loading failed</h3>
        <p className="text-sm text-slate-400 max-w-sm text-center">
          {error || "Product could not be found in our database."}
        </p>
        <button 
          onClick={() => router.back()} 
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-500"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Calculate pricing trend percentages for custom SVG chart
  const prices = product.historical_prices || [];
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  
  // Custom SVG line coordinate generator
  const generateChartPoints = () => {
    if (prices.length < 2) return "";
    const width = 400;
    const height = 120;
    const padding = 15;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;
    
    const maxVal = Math.max(...prices);
    const minVal = Math.min(...prices);
    const range = maxVal - minVal || 1;
    
    return prices.map((price, idx) => {
      const x = padding + (idx / (prices.length - 1)) * graphWidth;
      const y = padding + graphHeight - ((price - minVal) / range) * graphHeight;
      return `${x},${y}`;
    }).join(" ");
  };

  const getScoreBg = (score: number) => {
    if (score >= 8.5) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 6.0) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getBuyWaitColor = (signal: string) => {
    if (signal.includes('BUY')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  };

  return (
    <div className="flex-1 p-6 md:p-10 space-y-8 bg-[#0b0f19]">
      
      {/* Back navigation & Actions */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer hover:bg-white/5 px-3 py-2 rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        
        <div className="flex gap-2">
          <button className="p-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer">
            <Heart className="w-4 h-4" />
          </button>
          <button className="p-2.5 rounded-xl border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main product overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Cover card */}
          <div className="p-5 rounded-2xl bg-[#141b2d] border border-white/5 flex flex-col md:flex-row gap-6 glass shadow-xl">
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full md:w-48 h-48 rounded-xl object-cover border border-white/10 bg-slate-800"
            />
            <div className="flex-1 flex flex-col justify-between py-1 space-y-3">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest leading-none">
                  Product Profile
                </span>
                <h2 className="text-xl md:text-2xl font-black text-white mt-1 leading-snug">
                  {product.name}
                </h2>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                  {product.brand} &bull; {product.category}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Current Price</p>
                  <p className="text-2xl font-black text-white leading-none mt-1">₹{product.price.toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl border flex flex-col items-center justify-center shrink-0 ${getScoreBg(dealScore || 0)}`}>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold leading-none mb-0.5">Deal Score</span>
                  <span className="text-base font-black leading-none">{dealScore}/10</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-300 text-sm font-semibold">
                <Star className="w-4 h-4 fill-indigo-400 text-indigo-400" />
                <span>{product.rating} Rating</span>
                <span className="text-slate-500 font-medium">({reviews.length} reviews analyzed)</span>
              </div>
            </div>
          </div>

          {/* Buy or Wait Price Alert */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${getBuyWaitColor(buyOrWait || '')}`}>
            <div className="flex gap-3">
              {buyOrWait?.includes('BUY') ? (
                <TrendingDown className="w-5 h-5 shrink-0" />
              ) : (
                <TrendingUp className="w-5 h-5 shrink-0" />
              )}
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest leading-none">Price Decision Verdict</h4>
                <p className="text-xs font-bold text-slate-200 mt-1.5 leading-relaxed">{buyOrWaitReason}</p>
              </div>
            </div>
            <span className="text-xs font-black uppercase px-3 py-1.5 rounded bg-white/10 shrink-0 border border-white/10">
              {buyOrWait}
            </span>
          </div>

          {/* Price History Chart */}
          <div className="p-5 rounded-2xl bg-[#141b2d] border border-white/5 space-y-4 glass shadow-xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-indigo-400" /> Historical Pricing (Last 4 Months)
            </h4>
            
            {prices.length >= 2 ? (
              <div className="space-y-4">
                <div className="w-full bg-white/[0.01] rounded-xl border border-white/5 p-4 flex items-center justify-center">
                  <svg viewBox="0 0 400 120" className="w-full max-w-lg h-32 overflow-visible">
                    {/* Gradient fill area under curve */}
                    <defs>
                      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <polyline
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={generateChartPoints()}
                      className="drop-shadow-[0_2px_8px_rgba(99,102,241,0.5)]"
                    />
                    {prices.map((price, idx) => {
                      const width = 400;
                      const height = 120;
                      const padding = 15;
                      const graphWidth = width - padding * 2;
                      const graphHeight = height - padding * 2;
                      const range = maxPrice - minPrice || 1;
                      const x = padding + (idx / (prices.length - 1)) * graphWidth;
                      const y = padding + graphHeight - ((price - minPrice) / range) * graphHeight;
                      const isLowest = price === minPrice;
                      
                      return (
                        <g key={idx}>
                          <circle
                            cx={x}
                            cy={y}
                            r="5"
                            fill={isLowest ? "#10b981" : "#6366f1"}
                            stroke="#0b0f19"
                            strokeWidth="2"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
                
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">
                  {prices.map((p, idx) => (
                    <span key={idx} className={p === minPrice ? 'text-emerald-400' : ''}>
                      M{idx + 1}: ₹{p.toLocaleString()}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 text-center">
                  <span className="text-emerald-400 font-bold">●</span> Green dot = lowest price point
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No price fluctuations recorded.</p>
            )}
          </div>

          {/* Technical Specifications */}
          <div className="p-5 rounded-2xl bg-[#141b2d] border border-white/5 space-y-4 glass shadow-xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" /> Technical Specifications
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(product.specs || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-semibold">
                  <span className="text-slate-500 uppercase tracking-wider">{key}</span>
                  <span className="text-white text-right font-bold ml-4">{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Review Summaries & Raw Reviews */}
        <div className="lg:col-span-5 space-y-6">
          
          {summary && (
            <div className="p-5 rounded-2xl bg-[#141b2d] border border-white/5 space-y-4 glass shadow-xl">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-widest">
                  AI Review Summarizer
                </h4>
              </div>

              <div className="space-y-1.5 bg-indigo-500/5 p-3.5 rounded-xl border border-indigo-500/10">
                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Ideal Users (Best For)</p>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">{summary.best_for}</p>
              </div>

              <div className="space-y-1.5 bg-rose-500/5 p-3.5 rounded-xl border border-rose-500/10">
                <p className="text-[10px] font-black uppercase text-rose-400 tracking-wider">Avoid If</p>
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">{summary.avoid_if}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Common Endorsements (Pros)</p>
                <ul className="space-y-1.5">
                  {summary.pros.map((p, idx) => (
                    <li key={idx} className="text-xs text-slate-400 flex items-start gap-1.5 font-medium leading-relaxed">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Common Criticisms (Cons)</p>
                <ul className="space-y-1.5">
                  {summary.cons.map((c, idx) => (
                    <li key={idx} className="text-xs text-slate-400 flex items-start gap-1.5 font-medium leading-relaxed">
                      <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Frequent Complaint</p>
                <p className="text-xs text-slate-400 leading-relaxed italic font-medium">
                  &ldquo;{summary.complaints}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Raw User Reviews */}
          <div className="p-5 rounded-2xl bg-[#141b2d] border border-white/5 space-y-4 glass shadow-xl flex flex-col" style={{ maxHeight: '500px' }}>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-2 border-b border-white/5 shrink-0">
              Customer Reviews ({reviews.length})
            </h4>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {reviews.map((rev) => (
                <div key={rev.id} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-white">{rev.user_name}</p>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-2.5 h-2.5 ${i < rev.rating ? 'text-indigo-400 fill-indigo-400' : 'text-slate-700'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded border shrink-0 ${
                      rev.sentiment === 'positive' 
                        ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' 
                        : rev.sentiment === 'negative'
                        ? 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                        : 'text-slate-400 border-white/10 bg-white/5'
                    }`}>
                      {rev.sentiment}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
