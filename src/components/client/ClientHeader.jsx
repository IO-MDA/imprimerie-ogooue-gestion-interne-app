import React, { useState, useEffect } from 'react';
import { Menu, Bell, LogOut, ChevronDown, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export default function ClientHeader({ client, notifications = 0 }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <header className={`sticky top-0 z-50 bg-white border-b transition-all duration-300 ${
      scrolled ? 'shadow-lg border-slate-200 py-2' : 'py-3 border-transparent'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo + Nom */}
          <div className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/c22c6636f_LOGO-BON-FINAL1.png"
              alt="Imprimerie Ogooué"
              className={`transition-all rounded-xl object-contain bg-white shadow-sm ${scrolled ? 'w-10 h-10' : 'w-12 h-12'}`}
            />
            <div>
              <h1 className={`font-bold text-slate-900 tracking-tight transition-all ${scrolled ? 'text-base' : 'text-lg'}`}>
                IMPRIMERIE OGOOUÉ
              </h1>
              <p className="text-xs text-slate-500">Moanda, Gabon 🇬🇦</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-slate-600" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {notifications}
                </Badge>
              )}
            </button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-slate-100 p-2 rounded-lg transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                  {client?.nom?.charAt(0)?.toUpperCase() || 'C'}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-500 hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 py-3 border-b bg-slate-50">
                  <p className="text-sm font-semibold text-slate-900">{client?.nom}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{client?.email}</p>
                  <Badge className="mt-2 bg-emerald-100 text-emerald-700 text-xs">
                    Client privilégié
                  </Badge>
                </div>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}