import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  Package, 
  AlertTriangle,
  ArrowRight,
  FileText,
  Clock
} from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import ServiceChart from '@/components/dashboard/ServiceChart';
import RevenueChart from '@/components/dashboard/RevenueChart';
import moment from 'moment';

export default function Dashboard() {
  const [rapports, setRapports] = useState([]);
  const [produits, setProuits] = useState([]);
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [rapportsData, produitsData, devisData, facturesData, userData] = await Promise.all([
      base44.entities.RapportJournalier.list('-date', 100),
      base44.entities.Produit.list(),
      base44.entities.Devis.list('-created_date', 50),
      base44.entities.Facture.list('-created_date', 50),
      base44.auth.me()
    ]);
    setRapports(rapportsData);
    setProuits(produitsData);
    setDevis(devisData);
    setFactures(facturesData);
    setUser(userData);
    setIsLoading(false);
  };

  // Calculate stats
  const today = moment().format('YYYY-MM-DD');
  const thisWeekStart = moment().startOf('week').format('YYYY-MM-DD');
  const thisMonthStart = moment().startOf('month').format('YYYY-MM-DD');

  const todayRapports = rapports.filter(r => r.date === today);
  const weekRapports = rapports.filter(r => r.date >= thisWeekStart);
  const monthRapports = rapports.filter(r => r.date >= thisMonthStart);

  const todayRecettes = todayRapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
  const todayDepenses = todayRapports.reduce((sum, r) => sum + (r.total_depenses || 0), 0);
  const weekRecettes = weekRapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
  const monthRecettes = monthRapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
  const monthDepenses = monthRapports.reduce((sum, r) => sum + (r.total_depenses || 0), 0);

  // Service performance
  const serviceStats = {};
  monthRapports.forEach(r => {
    r.services_data?.forEach(serviceData => {
      if (!serviceStats[serviceData.service]) {
        serviceStats[serviceData.service] = { recettes: 0, depenses: 0 };
      }
      serviceStats[serviceData.service].recettes += serviceData.recettes || 0;
      serviceStats[serviceData.service].depenses += serviceData.depenses || 0;
    });
  });

  const serviceChartData = Object.entries(serviceStats).map(([service, stats]) => ({
    service: service?.split(' ')[0] || 'N/A',
    recettes: stats.recettes,
    depenses: stats.depenses
  }));

  // Weekly trend
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const date = moment().subtract(i, 'days');
    const dayRapports = rapports.filter(r => r.date === date.format('YYYY-MM-DD'));
    const recettes = dayRapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
    const depenses = dayRapports.reduce((sum, r) => sum + (r.total_depenses || 0), 0);
    weeklyData.push({
      label: date.format('ddd'),
      recettes,
      benefice: recettes - depenses
    });
  }

  // Low stock products
  const lowStockProducts = produits.filter(p => p.stock_actuel <= p.stock_minimum);

  // Pending invoices
  const pendingFactures = factures.filter(f => f.statut === 'envoyee' || f.statut === 'en_retard');

  // Recent reports
  const recentRapports = rapports.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Bonjour, {user?.full_name?.split(' ')[0] || 'Opérateur'} 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Voici le résumé de l'activité de l'Imprimerie Ogooué
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Recettes du jour"
          value={`${todayRecettes.toLocaleString()} FCFA`}
          icon={Wallet}
          color="blue"
        />
        <StatCard 
          title="Dépenses du jour"
          value={`${todayDepenses.toLocaleString()} FCFA`}
          icon={TrendingDown}
          color="rose"
        />
        <StatCard 
          title="Recettes du mois"
          value={`${monthRecettes.toLocaleString()} FCFA`}
          subtitle={`Bénéfice: ${(monthRecettes - monthDepenses).toLocaleString()} FCFA`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard 
          title="Factures en attente"
          value={pendingFactures.length}
          subtitle={`${pendingFactures.reduce((s, f) => s + (f.total || 0), 0).toLocaleString()} FCFA`}
          icon={Receipt}
          color="amber"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={weeklyData} title="Évolution sur 7 jours" />
        <ServiceChart data={serviceChartData} title="Performance par service (ce mois)" />
      </div>

      {/* Alerts & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alert */}
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alertes stock
            </CardTitle>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {lowStockProducts.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Aucune alerte stock</p>
            ) : (
              lowStockProducts.slice(0, 4).map(product => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{product.nom}</p>
                    <p className="text-xs text-slate-500">{product.categorie}</p>
                  </div>
                  <Badge variant="outline" className="border-amber-300 text-amber-700">
                    {product.stock_actuel} restant(s)
                  </Badge>
                </div>
              ))
            )}
            <Link to={createPageUrl('Catalogue')}>
              <Button variant="ghost" className="w-full mt-2">
                Voir le catalogue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Reports */}
        <Card className="border-0 shadow-lg shadow-slate-200/50 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Derniers rapports
            </CardTitle>
            <Link to={createPageUrl('RapportsJournaliers')}>
              <Button variant="outline" size="sm">
                Voir tout <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRapports.map(rapport => (
                <div key={rapport.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Rapport du {moment(rapport.date).format('DD/MM/YYYY')}</p>
                      <p className="text-sm text-slate-500">
                        {rapport.operateur_nom} • {rapport.services_data?.filter(s => s.recettes > 0 || s.depenses > 0).length || 0} services
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">+{(rapport.total_recettes || 0).toLocaleString()}</p>
                    <p className="text-sm text-rose-500">-{(rapport.total_depenses || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}