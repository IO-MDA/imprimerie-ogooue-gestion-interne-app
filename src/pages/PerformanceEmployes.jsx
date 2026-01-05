import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Award,
  Users,
  ChevronRight,
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  Save,
  X
} from 'lucide-react';
import RoleProtection from '@/components/auth/RoleProtection';
import moment from 'moment';
import { toast } from 'sonner';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function PerformanceEmployes() {
  const [user, setUser] = useState(null);
  const [employes, setEmployes] = useState([]);
  const [pointages, setPointages] = useState([]);
  const [objectifs, setObjectifs] = useState([]);
  const [taches, setTaches] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmploye, setSelectedEmploye] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  
  // États pour édition
  const [showEmployeDetail, setShowEmployeDetail] = useState(null);
  const [editingObjectif, setEditingObjectif] = useState(null);
  const [showAddObjectif, setShowAddObjectif] = useState(false);
  const [newObjectif, setNewObjectif] = useState({
    type: 'mensuel',
    categorie: 'individuel',
    periode: moment().format('YYYY-MM'),
    responsable_id: '',
    responsable_nom: '',
    objectif_recettes: 0,
    description: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, usersData, pointagesData, objectifsData, tachesData, demandesData] = await Promise.all([
        base44.auth.me(),
        base44.entities.User.list(),
        base44.entities.Pointage.list('-date', 1000),
        base44.entities.Objectif.list(),
        base44.entities.Tache.list('-created_date', 500),
        base44.entities.DemandeRH.list('-created_date', 200)
      ]);

      setUser(userData);
      setEmployes(usersData.filter(u => u.role !== 'admin'));
      setPointages(pointagesData);
      setObjectifs(objectifsData);
      setTaches(tachesData);
      setDemandes(demandesData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculer les statistiques par employé
  const getEmployeStats = (employeId) => {
    const employePointages = pointages.filter(p => 
      p.employe_id === employeId && 
      moment(p.date).format('YYYY-MM') === selectedMonth
    );

    const employeTaches = taches.filter(t => t.assigne_a === employes.find(e => e.id === employeId)?.email);
    const employeDemandes = demandes.filter(d => d.demandeur_id === employeId);

    const heuresTravaillees = employePointages.reduce((sum, p) => sum + (p.duree_minutes || 0), 0) / 60;
    const tauxPresence = employePointages.length > 0 
      ? (employePointages.filter(p => p.statut === 'termine').length / employePointages.length) * 100 
      : 0;

    const tachesTerminees = employeTaches.filter(t => t.statut === 'terminee' || t.statut === 'validee').length;
    const tauxCompletionTaches = employeTaches.length > 0 
      ? (tachesTerminees / employeTaches.length) * 100 
      : 0;

    const demandesValidees = employeDemandes.filter(d => d.statut === 'approuvee').length;

    return {
      heuresTravaillees,
      tauxPresence,
      nombreTaches: employeTaches.length,
      tachesTerminees,
      tauxCompletionTaches,
      nombreDemandes: employeDemandes.length,
      demandesValidees,
      score: Math.round((tauxPresence * 0.3) + (tauxCompletionTaches * 0.5) + ((demandesValidees / Math.max(employeDemandes.length, 1)) * 100 * 0.2))
    };
  };

  // Données pour graphiques
  const employesAvecStats = employes.map(emp => ({
    ...emp,
    stats: getEmployeStats(emp.id)
  })).sort((a, b) => b.stats.score - a.stats.score);

  const topPerformers = employesAvecStats.slice(0, 5);

  // Données pour le graphique de tendance
  const tendanceData = Array.from({ length: 6 }, (_, i) => {
    const month = moment().subtract(5 - i, 'months');
    const monthKey = month.format('YYYY-MM');
    
    return {
      mois: month.format('MMM YYYY'),
      tauxPresence: pointages.filter(p => moment(p.date).format('YYYY-MM') === monthKey && p.statut === 'termine').length / Math.max(pointages.filter(p => moment(p.date).format('YYYY-MM') === monthKey).length, 1) * 100,
      tauxCompletion: taches.filter(t => moment(t.created_date).format('YYYY-MM') === monthKey && (t.statut === 'terminee' || t.statut === 'validee')).length / Math.max(taches.filter(t => moment(t.created_date).format('YYYY-MM') === monthKey).length, 1) * 100
    };
  });

  // Données département (si disponible)
  const departementStats = [
    { departement: 'Production', performance: 85, objectifs: 90 },
    { departement: 'Administration', performance: 92, objectifs: 85 },
    { departement: 'Commercial', performance: 78, objectifs: 80 }
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Performance des Employés</h1>
            <p className="text-slate-500">Suivi et analyse de la performance globale</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* KPIs globaux */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employés actifs</p>
                  <p className="text-2xl font-bold text-slate-900">{employes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Taux moyen</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(employesAvecStats.reduce((sum, e) => sum + e.stats.score, 0) / Math.max(employesAvecStats.length, 1))}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Heures travaillées</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {Math.round(employesAvecStats.reduce((sum, e) => sum + e.stats.heuresTravaillees, 0))}h
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Tâches terminées</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {employesAvecStats.reduce((sum, e) => sum + e.stats.tachesTerminees, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="vue-ensemble" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="par-employe">Par employé</TabsTrigger>
            <TabsTrigger value="tendances">Tendances</TabsTrigger>
            <TabsTrigger value="objectifs">Objectifs</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="vue-ensemble" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Top 5 Performers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topPerformers.map((emp, idx) => (
                      <div key={emp.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' :
                          idx === 1 ? 'bg-slate-200 text-slate-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{emp.full_name}</p>
                          <p className="text-xs text-slate-500">{emp.email}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          {emp.stats.score}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Graphique répartition */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>Répartition des performances</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Excellent (>90%)', value: employesAvecStats.filter(e => e.stats.score > 90).length },
                          { name: 'Bon (70-90%)', value: employesAvecStats.filter(e => e.stats.score >= 70 && e.stats.score <= 90).length },
                          { name: 'Moyen (50-70%)', value: employesAvecStats.filter(e => e.stats.score >= 50 && e.stats.score < 70).length },
                          { name: 'Faible (<50%)', value: employesAvecStats.filter(e => e.stats.score < 50).length }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Graphique par département */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Performance par département</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departementStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="departement" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="performance" fill="#3b82f6" name="Performance réelle" />
                    <Bar dataKey="objectifs" fill="#8b5cf6" name="Objectifs" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Par employé */}
          <TabsContent value="par-employe" className="space-y-4">
            <div className="grid gap-4">
              {employesAvecStats.map(emp => (
                <Card key={emp.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setSelectedEmploye(emp)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                          {emp.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900">{emp.full_name}</h3>
                            <Badge className={
                              emp.stats.score >= 90 ? 'bg-emerald-100 text-emerald-700' :
                              emp.stats.score >= 70 ? 'bg-blue-100 text-blue-700' :
                              emp.stats.score >= 50 ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }>
                              Score: {emp.stats.score}%
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500">Présence</p>
                              <p className="font-semibold">{Math.round(emp.stats.tauxPresence)}%</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Heures</p>
                              <p className="font-semibold">{Math.round(emp.stats.heuresTravaillees)}h</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Tâches</p>
                              <p className="font-semibold">{emp.stats.tachesTerminees}/{emp.stats.nombreTaches}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Demandes</p>
                              <p className="font-semibold">{emp.stats.demandesValidees}/{emp.stats.nombreDemandes}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Tendances */}
          <TabsContent value="tendances" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Évolution sur 6 mois</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={tendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tauxPresence" stroke="#3b82f6" name="Taux de présence" strokeWidth={2} />
                    <Line type="monotone" dataKey="tauxCompletion" stroke="#10b981" name="Taux de complétion tâches" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Objectifs */}
          <TabsContent value="objectifs" className="space-y-4">
            {objectifs.filter(o => o.categorie === 'individuel').map(obj => (
              <Card key={obj.id} className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">{obj.responsable_nom}</h3>
                      <p className="text-sm text-slate-600">Période: {obj.periode}</p>
                    </div>
                    <Badge className={obj.statut === 'atteint' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                      {obj.statut}
                    </Badge>
                  </div>
                  {obj.objectif_recettes && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Objectif recettes</span>
                        <span className="font-medium">{Math.round((obj.recettes_reelles / obj.objectif_recettes) * 100)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                          style={{ width: `${Math.min((obj.recettes_reelles / obj.objectif_recettes) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}