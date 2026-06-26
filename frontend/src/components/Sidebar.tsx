'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, LayoutDashboard, Sparkles, Scale, ShoppingBag } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Concierge Chat', href: '/chat', icon: MessageSquare },
    { name: 'Recommendation Center', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Product Comparison', href: '/compare', icon: Scale },
  ];

  return (
    <aside className="w-64 glass border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-30 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              DEALZ
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Your AI Shopping Concierge
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-105 ${
                isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              <span className="text-sm font-semibold tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-white/5 bg-white/[0.01]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 shrink-0">
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">Agent Model Active</p>
            <p className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase animate-pulse">
              Gemini Fallback Ready
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
