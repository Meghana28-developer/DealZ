'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, Send, Bot, User, Check, X, AlertTriangle, 
  TrendingDown, TrendingUp, RefreshCw, BarChart2, Plus, CheckSquare, ExternalLink
} from 'lucide-react';
import { chatWithAgent, compareProducts } from '@/lib/api';
import { ChatMessage, Product, Alternative, SetupDetails } from '@/lib/types';

function ChatInterface() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Right side panel state: dynamically parsed from last agent response
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [setupDetails, setSetupDetails] = useState<SetupDetails | null>(null);
  const [isSetup, setIsSetup] = useState(false);
  
  // Product Comparison state (synced with localStorage)
  const [compareList, setCompareList] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchLoaded = useRef(false);

  // Load comparison list on mount
  useEffect(() => {
    const list = localStorage.getItem('dealz_compare_list');
    if (list) {
      try {
        setCompareList(JSON.parse(list));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Auto-scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle URL query parameter e.g., ?q=laptop
  useEffect(() => {
    const initialQuery = searchParams.get('q');
    if (initialQuery && !searchLoaded.current) {
      searchLoaded.current = true;
      handleSendMessage(initialQuery);
    }
  }, [searchParams]);

  // Toggle item in comparison list
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

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;
    
    // Add user message
    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // Call backend API
      const result = await chatWithAgent(textToSend, messages);
      
      // Add assistant response
      setMessages(prev => [...prev, { role: 'assistant', content: result.response_text }]);
      
      // Update UI panels based on agent recommendation details
      setRecommendedProducts(result.products || []);
      setAlternatives(result.alternatives || []);
      setSetupDetails(result.setup_details || null);
      setIsSetup(result.is_setup || false);
      
    } catch (err: any) {
      console.error(err);
      setError("Unable to reach the DEALZ agent. Please make sure the backend server is running.");
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I ran into an error connecting to my database service. Could you please double-check if the FastAPI server is running on port 8000?" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    handleSendMessage(inputValue);
  };

  // Helper to color Deal Scores
  const getScoreColor = (score?: number) => {
    if (!score) return 'bg-slate-700 text-slate-300';
    if (score >= 8.5) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (score >= 6.0) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
  };

  // Helper to color Buy/Wait signal
  const getSignalColor = (signal?: string) => {
    if (!signal) return 'text-slate-400';
    const s = signal.toUpperCase();
    if (s.includes('BUY NOW') || s === 'BUY') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (s.includes('WAIT')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-slate-400 bg-white/5 border-white/10';
  };

  return (
    <div className="flex-1 flex h-screen overflow-hidden relative">
      
      {/* 1. Chat Column (Left) */}
      <div className="w-[50%] flex flex-col border-r border-white/5 h-full bg-[#0b0f19]">
        {/* Chat Title bar */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Concierge Session</h3>
          </div>
          <button 
            onClick={() => {
              setMessages([]);
              setRecommendedProducts([]);
              setAlternatives([]);
              setSetupDetails(null);
              setIsSetup(false);
            }} 
            className="text-xs text-slate-500 hover:text-white flex items-center gap-1 hover:bg-white/5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Clear Chat
          </button>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <h4 className="text-base font-bold text-white">Ask your first question</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                DEALZ will read your requirements, query our local product database, and generate personalized recommendations, scores, and review summaries.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex gap-4 animate-fade-in ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Bot Icon */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
                
                {/* Content Bubble */}
                <div 
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed border ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-[#141b2d] text-slate-300 border-white/5 glass'
                  }`}
                >
                  <p className="whitespace-pre-line font-medium">{msg.content}</p>
                </div>

                {/* User Icon */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-indigo-400" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex gap-4 items-center animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="bg-[#141b2d] border border-white/5 rounded-2xl px-4 py-3 text-xs text-slate-400 font-semibold tracking-wider flex items-center gap-2 glass">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
                Analyzing recommendations...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/5 bg-white/[0.01]">
          <form onSubmit={onSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Refine requirements or ask follow-up..."
              className="flex-1 bg-[#141b2d] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/50 glass"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl shadow-lg transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* 2. Context Dashboard Column (Right) */}
      <div className="w-[50%] overflow-y-auto p-6 bg-[#090d16] h-full space-y-6">
        
        {/* Header Indicator */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Concierge Recommendations
          </h2>
        </div>

        {recommendedProducts.length === 0 && !isLoading && (
          <div className="h-[80%] flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/5 rounded-2xl max-w-sm mx-auto space-y-3">
            <BarChart2 className="w-8 h-8 text-slate-600" />
            <h4 className="text-sm font-bold text-slate-400">Contextual Dashboard</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              When the agent identifies specific products, their detailed breakdown cards, prices, pros, cons, and comparisons will appear dynamically on this side.
            </p>
          </div>
        )}

        {/* --- CASE A: Workspace Setup Bundle Builder --- */}
        {isSetup && setupDetails && (
          <div className="space-y-6 animate-fade-in">
            {/* Setup Summary Card */}
            <div className="p-5 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 space-y-3 relative overflow-hidden shadow-lg glass">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">Package Solution</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">Optimized Workstation Setup</h3>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-extrabold text-sm shadow-md">
                  Score: {setupDetails.deal_score}/10
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {setupDetails.reasoning}
              </p>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Cost</p>
                  <p className="text-lg font-black text-indigo-400">₹{setupDetails.total_price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-right">Limit Constraint</p>
                  <p className="text-xs font-semibold text-slate-300 text-right">₹{setupDetails.budget.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Individual Setup Products List */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Included Hardware</h4>
              <div className="grid grid-cols-1 gap-4">
                {recommendedProducts.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl bg-[#141b2d] border border-white/5 flex gap-4 glass hover:border-white/10 transition-colors">
                    <img 
                      src={p.image_url} 
                      alt={p.name} 
                      className="w-16 h-16 rounded-lg object-cover shrink-0 border border-white/10 bg-slate-800"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h5 className="text-sm font-bold text-white leading-tight line-clamp-1">{p.name}</h5>
                        <span className="text-xs font-extrabold text-indigo-400 shrink-0">₹{p.price.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{p.category} &bull; {p.brand}</p>
                      
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-300 flex items-center gap-1">
                          <span className="text-indigo-400 font-bold">★</span> {p.rating}
                        </span>
                        <div className="flex gap-2">
                          <Link 
                            href={`/product/${p.id}`}
                            className="text-[10px] text-slate-400 hover:text-white font-bold flex items-center gap-0.5"
                          >
                            Specs <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                          <button
                            onClick={() => toggleComparison(p.id)}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            {compareList.includes(p.id) ? '✓ Added' : '+ Compare'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- CASE B: Single Recommendation Cards --- */}
        {!isSetup && recommendedProducts.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {recommendedProducts.map((p) => (
              <div 
                key={p.id} 
                className="p-5 rounded-2xl bg-[#141b2d] border border-white/5 shadow-xl space-y-4 relative overflow-hidden glass"
              >
                {/* Ribbon decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* Score & Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-indigo-400 uppercase">Top Recommendation</span>
                    <h3 className="text-lg font-bold text-white mt-0.5 leading-tight">{p.name}</h3>
                  </div>
                  <div className={`px-2.5 py-1 border rounded-lg text-center font-bold text-xs shrink-0 ${getScoreColor(p.deal_score)}`}>
                    <p className="text-[8px] uppercase tracking-wider text-slate-400 font-semibold">Deal Score</p>
                    <p className="text-sm font-black">{p.deal_score}/10</p>
                  </div>
                </div>

                {/* Main product card UI */}
                <div className="flex gap-4 bg-white/[0.02] p-3 rounded-xl border border-white/5">
                  <img 
                    src={p.image_url} 
                    alt={p.name} 
                    className="w-20 h-20 rounded-lg object-cover bg-slate-800 border border-white/5 shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <p className="text-lg font-black text-white">₹{p.price.toLocaleString()}</p>
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{p.brand} &bull; {p.category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-300 font-medium">★ {p.rating} / 5</span>
                      <Link 
                        href={`/product/${p.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                      >
                        Specs & Prices <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Buy Wait & Concierge Reasoning */}
                <div className="space-y-3">
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${getSignalColor(p.buy_or_wait)}`}>
                    <div className="flex items-center gap-2">
                      {p.buy_or_wait?.toUpperCase().includes('WAIT') ? (
                        <TrendingUp className="w-4 h-4 shrink-0" />
                      ) : (
                        <TrendingDown className="w-4 h-4 shrink-0" />
                      )}
                      <div>
                        <p className="text-[10px] uppercase font-black tracking-wider leading-none">Decision Signal</p>
                        <p className="text-xs font-bold mt-1 leading-normal text-slate-200">{p.buy_or_wait_reason}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black uppercase px-2 py-1 rounded bg-white/10 shrink-0 border border-white/10">
                      {p.buy_or_wait}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Concierge Notes</h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      {p.why_recommended}
                    </p>
                  </div>
                </div>

                {/* Pros and Cons */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/5">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Pros
                    </span>
                    <ul className="space-y-1.5">
                      {p.pros?.map((pro, index) => (
                        <li key={index} className="text-xs text-slate-400 flex items-start gap-1 font-medium">
                          <span className="text-emerald-500 shrink-0">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Cons
                    </span>
                    <ul className="space-y-1.5">
                      {p.cons?.map((con, index) => (
                        <li key={index} className="text-xs text-slate-400 flex items-start gap-1 font-medium">
                          <span className="text-rose-500 shrink-0">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action Compare */}
                <div className="pt-2">
                  <button
                    onClick={() => toggleComparison(p.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      compareList.includes(p.id)
                        ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20'
                        : 'border-white/5 hover:border-white/10 hover:bg-white/5 text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {compareList.includes(p.id) ? 'Added to Compare List (Click to remove)' : 'Add to Compare List'}
                  </button>
                </div>
              </div>
            ))}

            {/* Alternatives Checklist */}
            {alternatives.length > 0 && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3 glass">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Concierge Alternatives
                </h4>
                <div className="space-y-3">
                  {alternatives.map((alt) => (
                    <div 
                      key={alt.id} 
                      className="p-3 rounded-lg bg-[#141b2d]/60 border border-white/5 space-y-2 hover:border-white/10 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h5 className="text-xs font-bold text-white">{alt.name}</h5>
                          <p className="text-[10px] text-indigo-400 font-bold">₹{alt.price.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link 
                            href={`/product/${alt.id}`}
                            className="text-[9px] text-slate-400 hover:text-white font-bold flex items-center gap-0.5"
                          >
                            View <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                          <button
                            onClick={() => toggleComparison(alt.id)}
                            className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold"
                          >
                            {compareList.includes(alt.id) ? '✓ Compare' : '+ Compare'}
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        <strong className="text-[9px] uppercase tracking-wider text-rose-400 font-bold block mb-0.5">Trade-off</strong>
                        {alt.trade_off}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Floating Sticky Comparison Drawer */}
      {compareList.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 md:left-[27rem] md:right-8 bg-[#141b2d]/90 border border-indigo-500/30 p-4 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 z-40 glass backdrop-blur animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Compare List ({compareList.length}/3)</h4>
              <p className="text-xs text-slate-400 font-medium">Add up to 3 items for side-by-side spec comparisons.</p>
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
              Clear All
            </button>
            <Link
              href="/compare"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
            >
              Go to Compare Page &rarr;
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-[#0b0f19] text-slate-400 font-bold">
        Loading Shopping Concierge...
      </div>
    }>
      <ChatInterface />
    </Suspense>
  );
}
