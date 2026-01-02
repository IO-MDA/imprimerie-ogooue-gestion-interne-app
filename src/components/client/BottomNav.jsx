import React from 'react';
import { Home, ShoppingBag, FileText, Receipt, MessageSquare, Package } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-50 md:hidden">
      <div className="grid grid-cols-5 gap-1 px-2 py-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all relative",
                isActive 
                  ? "text-blue-600 bg-gradient-to-br from-blue-50 to-indigo-50" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <div className="relative">
                <Icon className={cn(
                  "w-6 h-6 transition-transform", 
                  isActive && "scale-110"
                )} />
                {item.badge > 0 && (
                  <Badge className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs border-2 border-white">
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-[10px] mt-1 font-medium leading-tight",
                isActive && "text-blue-600"
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