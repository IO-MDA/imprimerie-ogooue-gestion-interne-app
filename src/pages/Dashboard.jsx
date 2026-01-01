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
  const [objectifs, setObjectifs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [rapportsData, produitsData, devisData, facturesData, objectifsData, userData] = await Promise.all([
      base44.entities.RapportJournalier.list('-date', 300),
      base44.entities.Produit.list(),
      base44.entities.Devis.list('-created_date', 50),
      base44.entities.Facture.list('-created_date', 50),
      base44.entities.Objectif.list(),
      base44.auth.me()
    ]);
    setRapports(rapportsData);
    setProuits(produitsData);
    setDevis(devisData);
    setFactures(facturesData);
    setObjectifs(objectifsData);
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

  // Objectifs du mois et année
  const currentMonth = moment().format('YYYY-MM');
  const currentYear = moment().format('YYYY');
  const objectifMois = objectifs.find(o => o.type === 'mensuel' && o.periode === currentMonth);
  const objectifAnnee = objectifs.find(o => o.type === 'annuel' && o.periode === currentYear);

  // Calcul prévisionnel basé sur historique (3 derniers mois)
  const last3Months = [];
  for (let i = 1; i <= 3; i++) {
    const monthKey = moment().subtract(i, 'months').format('YYYY-MM');
    const monthData = rapports.filter(r => moment(r.date).format('YYYY-MM') === monthKey);
    const recettes = monthData.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
    const benefice = monthData.reduce((sum, r) => sum + (r.total_recettes - r.total_depenses || 0), 0);
    last3Months.push({ recettes, benefice });
  }

  const avgRecettes3Mois = last3Months.length > 0 ? last3Months.reduce((s, m) => s + m.recettes, 0) / last3Months.length : 0;
  const avgBenefice3Mois = last3Months.length > 0 ? last3Months.reduce((s, m) => s + m.benefice, 0) / last3Months.length : 0;
  const tendanceRecettes = last3Months.length >= 2 ? ((last3Months[0].recettes - last3Months[last3Months.length - 1].recettes) / last3Months[last3Months.length - 1].recettes * 100) : 0;
  
  const previsionMoisProchain = avgRecettes3Mois * (1 + tendanceRecettes / 100);
  const previsionAnnee = avgRecettes3Mois * 12 * (1 + tendanceRecettes / 200);

  // Progression objectif mensuel
  const progressionMois = objectifMois ? (monthRecettes / objectifMois.objectif_recettes * 100) : 0;
  const progressionAnnee = objectifAnnee ? (rapports.filter(r => moment(r.date).format('YYYY') === currentYear).reduce((s, r) => s + (r.total_recettes || 0), 0) / objectifAnnee.objectif_recettes * 100) : 0;

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

      {/* Objectifs & Prévisions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Objectif mensuel */}
        <Card className="border-0 shadow-lg shadow-blue-200/50 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg">Objectif du mois</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectifMois ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Objectif</p>
                    <p className="text-2xl font-bold text-blue-900">{objectifMois.objectif_recettes.toLocaleString()} F</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Réalisé</p>
                    <p className="text-2xl font-bold text-emerald-600">{monthRecettes.toLocaleString()} F</p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progression</span>
                    <span className="font-bold">{progressionMois.toFixed(1)}%</span>
                  </div>
                  <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${progressionMois >= 100 ? 'bg-emerald-500' : progressionMois >= 75 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(progressionMois, 100)}%` }}
                    />
                  </div>
                </div>
                {progressionMois >= 100 && (
                  <p className="text-sm text-emerald-600 font-medium">🎉 Objectif atteint !</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">Aucun objectif défini pour ce mois</p>
            )}
          </CardContent>
        </Card>

        {/* Objectif annuel */}
        <Card className="border-0 shadow-lg shadow-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="text-lg">Objectif annuel {currentYear}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {objectifAnnee ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Objectif</p>
                    <p className="text-2xl font-bold text-purple-900">{objectifAnnee.objectif_recettes.toLocaleString()} F</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Réalisé</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {rapports.filter(r => moment(r.date).format('YYYY') === currentYear).reduce((s, r) => s + (r.total_recettes || 0), 0).toLocaleString()} F
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progression</span>
                    <span className="font-bold">{progressionAnnee.toFixed(1)}%</span>
                  </div>
                  <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${progressionAnnee >= 100 ? 'bg-emerald-500' : progressionAnnee >= 75 ? 'bg-purple-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(progressionAnnee, 100)}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Aucun objectif défini pour cette année</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prévisions */}
      <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Prévisions (basées sur les 3 derniers mois)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-slate-600 mb-1">Moyenne mensuelle</p>
              <p className="text-2xl font-bold text-emerald-900">{avgRecettes3Mois.toLocaleString()} F</p>
              <p className="text-xs text-slate-500 mt-1">Bénéfice moyen: {avgBenefice3Mois.toLocaleString()} F</p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Prévision mois prochain</p>
              <p className="text-2xl font-bold text-blue-900">{previsionMoisProchain.toLocaleString()} F</p>
              <p className={`text-xs mt-1 flex items-center gap-1 ${tendanceRecettes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {tendanceRecettes >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {tendanceRecettes >= 0 ? '+' : ''}{tendanceRecettes.toFixed(1)}% de tendance
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-1">Prévision annuelle</p>
              <p className="text-2xl font-bold text-purple-900">{previsionAnnee.toLocaleString()} F</p>
              <p className="text-xs text-slate-500 mt-1">Objectif atteignable</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
    </RoleProtection>
  );
}