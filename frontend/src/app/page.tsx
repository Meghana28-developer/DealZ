'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Laptop, Smartphone, Headphones, Layout } from 'lucide-react';

export default function LandingPage() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/chat?q=${encodeURIComponent(query.trim())}`);
  };

  const suggestions = [
    {
      title: "Laptop for AI Dev",
      query: "I need a laptop for AI development under ₹70,000",
      icon: Laptop,
      color: "from-blue-500 to-indigo-500",
    },
    {
      title: "Workstation Setup",
      query: "I have ₹1 lakh and need a complete work setup",
      icon: Layout,
      color: "from-purple-500 to-pink-500",
    },
    {
      title: "ANC Wireless Earbuds",
      query: "I need wireless earbuds with ANC under ₹5,000",
      icon: Headphones,
      color: "from-cyan-500 to-teal-500",
    },
    {
      title: "Best Camera Phone",
      query: "I want the best camera phone under ₹40,000",
      icon: Smartphone,
      color: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden bg-[#0b0f19]">
      {/* Decorative Radial Background Blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-3xl flex flex-col items-center text-center space-y-8 z-10">
        {/* Tagline / Header */}
        <div className="space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Empowered by Gemini AI
          </div>
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Meet <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">DEALZ</span>
          </h2>
          <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto font-medium">
            Your Personal AI Shopping Concierge. Search, compare, score deals, and build custom gear setups with smart recommendations.
          </p>
        </div>

        {/* Search Bar Form */}
        <form 
          onSubmit={handleSearchSubmit} 
          className="w-full bg-[#141b2d]/80 border border-white/5 p-2 rounded-2xl flex items-center gap-2 shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all duration-300 glass"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything (e.g. laptop for coding under ₹70,000, build a setup for ₹1 lakh...)"
            className="flex-1 bg-transparent px-4 py-3 text-white placeholder-slate-500 outline-none text-sm md:text-base font-medium"
          />
          <button
            type="submit"
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 shrink-0 cursor-pointer"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>

        {/* Suggestion Cards */}
        <div className="w-full space-y-4 pt-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest text-left px-2">
            Try these queries
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => router.push(`/chat?q=${encodeURIComponent(item.query)}`)}
                  className="flex items-start text-left p-4 rounded-2xl bg-[#141b2d]/50 hover:bg-[#141b2d] border border-white/5 hover:border-white/10 hover:shadow-xl transition-all duration-300 group glass"
                >
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} text-white mr-4 shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      &ldquo;{item.query}&rdquo;
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
