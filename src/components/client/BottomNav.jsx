import React from 'react';
import { Home, ShoppingBag, FileText, Receipt, MessageSquare, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ activeTab, onTabChange, badges = {} }) {
  const navItems = [
    { id: 'accueil', label: 'Accueil', icon: Home },
    { id: 'catalogue', label: 'Catalogue', icon: ShoppingBag },
    { id: 'demandes', label: 'Demandes', icon: FileText, badge: badges.demandes },
    { id: 'commandes', label: 'Commandes', icon: Package, badge: badges.commandes },
    { id: 'factures', label: 'Factures', icon: Receipt, badge: badges.factures }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 md:hidden">
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg transition-all",
                isActive 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", isActive && "scale-110")} />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium",
                isActive ? "text-blue-600" : "text-slate-600"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}