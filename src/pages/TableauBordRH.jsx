import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Clock, 
  DollarSign, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  FileText,
  CheckCircle,
  XCircle
} from 'lucide-react';
import RoleProtection from '@/components/auth/RoleProtection';
import moment from 'moment';
import { formatMontant } from '@/components/utils/formatMontant.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function TableauBordRH() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [pointages, setPointages] = useState([]);
  const [avances, setAvances] = useState([]);
  const [chargesFixes, setChargesFixes] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [
        userData,
        usersData,
        pointagesData,
        avancesData,
        chargesData,
        demandesData
      ] = await Promise.all([
        base44.auth.me(),
        base44.entities.User.list(),
        base44.entities.Pointage.list('-date', 500),
        base44.entities.Avance.list('-date_avance', 200),
        base44.entities.ChargeFixe.filter({ type: 'salaire', active: true }),
        base44.entities.DemandeModification.filter({ statut: 'en_attente' })
      ]);

      setUser(userData);
      setUsers(usersData.filter(u => u.role !== 'admin' || userData.role === 'admin'));
      setPointages(pointagesData);
      setAvances(avancesData);
      setChargesFixes(chargesData);
      setDemandes(demandesData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  // Calculs pour le mois sélectionné
  const pointagesMois = pointages.filter(p => 
    moment(p.date).format('YYYY-MM') === selectedMonth
  );

  const avancesMois = avances.filter(a => 
    a.mois_comptable === selectedMonth && (a.statut === 'validee' || a.statut === 'deduite')
  );

  // Stats par employé
  const statsEmployes = users.map(employe => {
    // Pointages
    const pointagesEmploye = pointagesMois.filter(p => p.employe_id === employe.id);
    const heuresTravaillees = pointagesEmploye.reduce((sum, p) => sum + (p.duree_minutes || 0), 0) / 60;
    const joursPresents = pointagesEmploye.filter(p => p.statut === 'termine').length;

    // Avances
    const avancesEmploye = avancesMois.filter(a => a.employe_id === employe.id);
    const totalAvances = avancesEmploye.reduce((sum, a) => sum + a.montant, 0);

    // Salaire
    const charge = chargesFixes.find(c => c.beneficiaire === employe.full_name);
    const salaireBrut = charge?.montant_mensuel || 0;
    const resteAPayer = salaireBrut - totalAvances;

    return {
      id: employe.id,
      nom: employe.full_name,
      email: employe.email,
      role: employe.role,
      heuresTravaillees: Math.round(heuresTravaillees * 10) / 10,
      joursPresents,
      salaireBrut,
      totalAvances,
      resteAPayer,
      nombreAvances: avancesEmploye.length
    };
  });

  // KPIs globaux
  const totalHeures = statsEmployes.reduce((sum, e) => sum + e.heuresTravaillees, 0);
  const totalSalaires = statsEmployes.reduce((sum, e) => sum + e.salaireBrut, 0);
  const totalAvancesGlobal = statsEmployes.reduce((sum, e) => sum + e.totalAvances, 0);
  const totalResteAPayer = statsEmployes.reduce((sum, e) => sum + e.resteAPayer, 0);

  // Graphique des heures par employé
  const heuresParEmployeData = statsEmployes
    .filter(e => e.heuresTravaillees > 0)
    .sort((a, b) => b.heuresTravaillees - a.heuresTravaillees)
    .slice(0, 10)
    .map(e => ({
      nom: e.nom.split(' ')[0],
      heures: e.heuresTravaillees
    }));

  // Graphique salaires vs avances
  const salairesVsAvancesData = statsEmployes
    .filter(e => e.salaireBrut > 0)
    .map(e => ({
      nom: e.nom.split(' ')[0],
      salaire: e.salaireBrut,
      avances: e.totalAvances,
      reste: e.resteAPayer
    }));

  // Répartition des coûts
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b'];
  const coutsTotaux = totalSalaires;
  const repartitionCouts = [
    { name: 'Salaires à payer', value: totalResteAPayer, color: '#f59e0b' },
    { name: 'Avances versées', value: totalAvancesGlobal, color: '#10b981' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RoleProtection allowedRoles={['admin', 'manager']} user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tableau de bord RH</h1>
            <p className="text-slate-500">Vue d'ensemble des ressources humaines</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Mois:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Employés actifs</p>
                  <p className="text-2xl font-bold text-slate-900">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Heures totales</p>
                  <p className="text-2xl font-bold text-slate-900">{Math.round(totalHeures)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Masse salariale</p>
                  <p className="text-xl font-bold text-slate-900">{formatMontant(totalSalaires)} F</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Demandes en attente</p>
                  <p className="text-2xl font-bold text-slate-900">{demandes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="vue-ensemble" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vue-ensemble">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="pointages">Pointages</TabsTrigger>
            <TabsTrigger value="salaires">Salaires & Avances</TabsTrigger>
            <TabsTrigger value="demandes">Demandes</TabsTrigger>
          </TabsList>

          {/* Vue d'ensemble */}
          <TabsContent value="vue-ensemble" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Graphique heures */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Heures travaillées par employé</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={heuresParEmployeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nom" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="heures" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Répartition des coûts */}
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Répartition financière</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={repartitionCouts}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${formatMontant(entry.value)} F`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {repartitionCouts.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Résumé financier */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Résumé financier du mois</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Masse salariale totale</p>
                    <p className="text-2xl font-bold text-blue-900">{formatMontant(totalSalaires)} F</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Avances versées</p>
                    <p className="text-2xl font-bold text-emerald-900">{formatMontant(totalAvancesGlobal)} F</p>
                    <p className="text-xs text-slate-500 mt-1">{Math.round(totalAvancesGlobal / totalSalaires * 100)}% de la masse salariale</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Reste à payer</p>
                    <p className="text-2xl font-bold text-amber-900">{formatMontant(totalResteAPayer)} F</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pointages */}
          <TabsContent value="pointages" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Détail des pointages par employé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statsEmployes
                    .filter(e => e.heuresTravaillees > 0 || e.joursPresents > 0)
                    .sort((a, b) => b.heuresTravaillees - a.heuresTravaillees)
                    .map(employe => (
                      <div key={employe.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">{employe.nom}</p>
                            <p className="text-xs text-slate-500">{employe.email}</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700">
                            {employe.role}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Heures travaillées</p>
                            <p className="font-bold text-slate-900">{employe.heuresTravaillees}h</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Jours présents</p>
                            <p className="font-bold text-slate-900">{employe.joursPresents} jours</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  {statsEmployes.filter(e => e.heuresTravaillees > 0).length === 0 && (
                    <p className="text-center text-slate-500 py-8">Aucun pointage pour ce mois</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Salaires & Avances */}
          <TabsContent value="salaires" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Salaires et avances par employé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statsEmployes
                    .filter(e => e.salaireBrut > 0)
                    .sort((a, b) => b.salaireBrut - a.salaireBrut)
                    .map(employe => (
                      <div key={employe.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-slate-900">{employe.nom}</p>
                            <p className="text-xs text-slate-500">{employe.email}</p>
                          </div>
                          <Badge className={
                            employe.resteAPayer === 0 ? 'bg-emerald-100 text-emerald-700' :
                            employe.totalAvances > 0 ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {employe.resteAPayer === 0 ? 'Soldé' :
                             employe.totalAvances > 0 ? 'Partiellement payé' :
                             'En attente'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-3 text-sm">
                          <div className="p-2 bg-white rounded">
                            <p className="text-slate-500 text-xs">Salaire brut</p>
                            <p className="font-bold text-slate-900">{formatMontant(employe.salaireBrut)} F</p>
                          </div>
                          <div className="p-2 bg-emerald-50 rounded">
                            <p className="text-slate-500 text-xs">Avances</p>
                            <p className="font-bold text-emerald-700">{formatMontant(employe.totalAvances)} F</p>
                            {employe.nombreAvances > 0 && (
                              <p className="text-xs text-slate-500">({employe.nombreAvances} versement{employe.nombreAvances > 1 ? 's' : ''})</p>
                            )}
                          </div>
                          <div className="p-2 bg-amber-50 rounded">
                            <p className="text-slate-500 text-xs">Reste à payer</p>
                            <p className="font-bold text-amber-700">{formatMontant(employe.resteAPayer)} F</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded">
                            <p className="text-slate-500 text-xs">% payé</p>
                            <p className="font-bold text-blue-700">
                              {employe.salaireBrut > 0 ? Math.round(employe.totalAvances / employe.salaireBrut * 100) : 0}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Graphique salaires vs avances */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Comparaison salaires et avances</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={salairesVsAvancesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nom" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="salaire" fill="#3b82f6" name="Salaire brut" />
                    <Bar dataKey="avances" fill="#10b981" name="Avances versées" />
                    <Bar dataKey="reste" fill="#f59e0b" name="Reste à payer" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demandes */}
          <TabsContent value="demandes" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Demandes en attente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {demandes.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-3" />
                      <p className="text-slate-500">Aucune demande en attente</p>
                    </div>
                  ) : (
                    demandes.map(demande => (
                      <div key={demande.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold text-slate-900">{demande.titre}</p>
                            <p className="text-sm text-slate-600 mt-1">{demande.description}</p>
                            {demande.demandeur_nom && (
                              <p className="text-xs text-slate-500 mt-2">Par: {demande.demandeur_nom}</p>
                            )}
                          </div>
                          <Badge className="bg-amber-100 text-amber-700">En attente</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-3">
                          <Calendar className="w-3 h-3" />
                          <span>{moment(demande.created_date).fromNow()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleProtection>
  );
}