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

export default function ClientHeader({ client, onMenuToggle }) {
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
    <header className={`sticky top-0 z-40 bg-white border-b transition-all duration-300 ${
      scrolled ? 'shadow-md py-2' : 'py-4'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo + Nom */}
          <div className="flex items-center gap-3">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/3b89b4fe7_LOGO-BON-FINAL1.png"
              alt="Imprimerie Ogooué"
              className={`transition-all ${scrolled ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg object-contain`}
            />
            <div>
              <h1 className={`font-bold text-slate-900 transition-all ${scrolled ? 'text-lg' : 'text-xl'}`}>
                IMPRIMERIE OGOOUÉ
              </h1>
              <p className="text-xs text-slate-500">Moanda - Gabon</p>
            </div>
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-slate-100 p-2 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                {client?.nom?.charAt(0)?.toUpperCase() || 'C'}
              </div>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{client?.nom}</p>
                <p className="text-xs text-slate-500">{client?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}