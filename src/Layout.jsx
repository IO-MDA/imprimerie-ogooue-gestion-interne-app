import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  Users, 
  MessageSquare, 
  Settings,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Bell,
  FileCheck,
  Receipt,
  ClipboardList,
  Printer,
  Clock,
  Megaphone,
  Target,
  BarChart3,
  PieChart,
  HardHat
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    loadUser();
    loadNotifications();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Vérifier si l'utilisateur a un profil client
      const clients = await base44.entities.Client.filter({ user_id: userData.id });
      if (clients.length > 0) {
        setClient(clients[0]);
        // Seuls les non-admins sont considérés comme clients purs
        if (userData.role !== 'admin' && userData.role !== 'manager') {
          setIsClient(true);
          // Rediriger vers le portail client si pas déjà sur cette page
          if (currentPageName !== 'PortailClient') {
            window.location.href = '/PortailClient';
          }
        }
      }
    } catch (e) {
      console.log('User not logged in');
    }
  };

  const loadNotifications = async () => {
    try {
      const messages = await base44.entities.Message.filter({ lu: false });
      setUnreadMessages(messages.length);
      
      const requests = await base44.entities.DemandeModification.filter({ statut: 'en_attente' });
      setPendingRequests(requests.length);
    } catch (e) {
      console.log('Error loading notifications');
    }
  };

  const isAdmin = user?.role === 'admin';

  // Navigation selon le rôle (admin, manager, user/employe)
  const allNavigation = [
        { name: 'Tableau de bord', href: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
        { name: 'Tableau de bord RH', href: 'TableauBordRH', icon: Users, roles: ['admin', 'manager'] },
        { name: 'Performance employés', href: 'PerformanceEmployes', icon: BarChart3, roles: ['admin', 'manager'] },
        { name: 'Pointage', href: 'Pointage', icon: Clock, roles: ['admin', 'manager', 'user'] },
        { name: 'Stats Pointage', href: 'StatsPointage', icon: BarChart3, roles: ['admin', 'manager', 'user'] },
        { name: 'Commandes', href: 'Commandes', icon: Package, roles: ['admin', 'manager', 'user'] },
        { name: 'Demandes RH', href: 'DemandesRH', icon: FileCheck, roles: ['admin', 'manager', 'user'], hideForClients: true },
        { name: 'Modèles documents', href: 'ModelesDocuments', icon: FileText, roles: ['admin'] },
        { name: 'Portail client', href: 'PortailClient', icon: Users, roles: ['admin', 'manager', 'user'] },
        { name: 'Messagerie', href: 'Messagerie', icon: MessageSquare, badge: unreadMessages, roles: ['admin', 'manager', 'user'] },
        { name: 'Clients', href: 'Clients', icon: Users, roles: ['admin', 'manager', 'user'] },
        { name: 'Catalogue produits', href: 'Catalogue', icon: Package, roles: ['admin', 'manager', 'user'] },
        { name: 'Tarifs clients', href: 'TarifsClients', icon: Receipt, roles: ['admin'] },
        { name: 'Rapports journaliers', href: 'RapportsJournaliers', icon: ClipboardList, roles: ['admin', 'manager', 'user'] },
        { name: 'Événements', href: 'Evenements', icon: Bell, roles: ['admin', 'manager', 'user'] },
        { name: 'Communications', href: 'Annonces', icon: Megaphone, roles: ['admin', 'manager', 'user'] },
        { name: 'Demande modification', href: 'DemandeModification', icon: FileCheck, roles: ['admin', 'manager', 'user'] },
        { name: 'Objectifs', href: 'Objectifs', icon: Target, roles: ['admin', 'manager'] },
        { name: 'Projets', href: 'Projets', icon: LayoutDashboard, roles: ['admin', 'manager'] },
        { name: 'Tâches', href: 'Taches', icon: FileCheck, roles: ['admin', 'manager'] },
        { name: 'Calendrier tâches', href: 'CalendrierTaches', icon: LayoutDashboard, roles: ['admin', 'manager'] },
        { name: 'Devis & Factures', href: 'DevisFactures', icon: Receipt, roles: ['admin', 'manager'] },
        { name: 'Rapports & Analyses', href: 'Rapports', icon: BarChart3, roles: ['admin', 'manager'] },
        { name: 'Bilans & Comptabilité', href: 'Bilans', icon: PieChart, roles: ['admin'] },
        { name: 'Finances', href: 'Finances', icon: Receipt, roles: ['admin'] },
        { name: 'Avances & Restes à payer', href: 'Avances', icon: Receipt, roles: ['admin', 'manager'] },
        { name: 'Travaux Groupe Ogooué', href: 'Travaux', icon: HardHat, roles: ['admin', 'manager'] },
        { name: 'Mockups IA', href: 'Mockups', icon: Printer, roles: ['admin', 'manager'] },
        { name: 'Prospection', href: 'Prospection', icon: Users, roles: ['admin', 'manager'] },
        { 
          name: 'Demandes modification', 
          href: 'DemandesModification', 
          icon: FileCheck,
          badge: pendingRequests,
          roles: ['admin', 'manager']
        },
        { name: 'Paramètres', href: 'Parametres', icon: Settings, roles: ['admin'] },
      ];

  // Filtrer selon le rôle et le type d'utilisateur
  const navigation = isClient 
    ? allNavigation.filter(item => item.href === 'PortailClient')
    : allNavigation.filter(item => 
        item.roles.includes(user?.role || 'user')
      );

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <style>{`
        :root {
          --primary: 220 70% 50%;
          --primary-foreground: 0 0% 100%;
        }
      `}</style>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100">
            <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/e66e417ff_LOGO-BON-FINAL1.png" 
                alt="Imprimerie OGOOUE" 
                className="w-12 h-12 rounded-xl object-contain"
              />
              <div>
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">Imprimerie</h1>
                <p className="text-xs text-slate-500 -mt-0.5">OGOOUE</p>
              </div>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = currentPageName === item.href;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.href)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400")} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge > 0 && (
                    <Badge 
                      variant={isActive ? "secondary" : "default"}
                      className={cn(
                        "text-xs px-2",
                        isActive ? "bg-white/20 text-white" : "bg-blue-600 text-white"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          {user && (
            <div className="p-4 border-t border-slate-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-blue-500/20">
                      {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-xs text-slate-500">
                        {isClient ? 'Client' : user.role === 'admin' ? 'Administrateur' : user.role === 'manager' ? 'Manager' : 'Employé'}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Link to={createPageUrl('Messagerie')}>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5 text-slate-600" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}