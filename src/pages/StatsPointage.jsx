import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, TrendingUp, AlertTriangle, Calendar, Sparkles } from 'lucide-react';
import RoleProtection from '@/components/auth/RoleProtection';
import moment from 'moment';
import { formatMontant } from '@/components/utils/formatMontant.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function StatsPointage() {
  const [user, setUser] = useState(null);
  const [pointages, setPointages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('mois');
  const [isLoading, setIsLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      const pointagesData = await base44.entities.Pointage.list('-date', 1000);
      const usersData = await base44.entities.User.list();
      
      setPointages(pointagesData);
      setUsers(usersData.filter(u => u.role !== 'admin' || userData.role === 'admin'));
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const filteredData = getFilteredPointages();
      
      const employeStats = {};
      filteredData.forEach(p => {
        if (!employeStats[p.employe_id]) {
          employeStats[p.employe_id] = {
            nom: p.employe_nom,
            totalMinutes: 0,
            jours: 0,
            anomalies: []
          };
        }
        employeStats[p.employe_id].totalMinutes += p.duree_minutes || 0;
        employeStats[p.employe_id].jours += 1;
        
        if (!p.heure_sortie && p.statut === 'en_cours') {
          employeStats[p.employe_id].anomalies.push(`Sortie manquante le ${moment(p.date).format('DD/MM')}`);
        }
        if (p.duree_minutes > 720) {
          employeStats[p.employe_id].anomalies.push(`Durée excessive (${Math.floor(p.duree_minutes/60)}h) le ${moment(p.date).format('DD/MM')}`);
        }
      });

      const prompt = `Analyse les données de pointage suivantes pour la période ${selectedPeriod}:
      
${Object.entries(employeStats).map(([id, stats]) => 
  `- ${stats.nom}: ${Math.floor(stats.totalMinutes/60)}h sur ${stats.jours} jours, ${stats.anomalies.length} anomalies`
).join('\n')}

Fournis une analyse au format JSON avec:
{
  "insights": ["insight 1", "insight 2", ...],
  "anomalies_detectees": [{"employe": "nom", "type": "description", "action_recommandee": "solution"}],
  "tendances": [{"employe": "nom", "tendance": "description"}],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            insights: { type: "array", items: { type: "string" } },
            anomalies_detectees: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employe: { type: "string" },
                  type: { type: "string" },
                  action_recommandee: { type: "string" }
                }
              }
            },
            tendances: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  employe: { type: "string" },
                  tendance: { type: "string" }
                }
              }
            },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiAnalysis(response);
      toast.success('Analyse IA terminée');
    } catch (e) {
      console.error('Error analyzing:', e);
      toast.error('Erreur lors de l\'analyse IA');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getFilteredPointages = () => {
    let filtered = pointages;
    
    if (selectedUser !== 'all' && user?.role !== 'user') {
      filtered = filtered.filter(p => p.employe_id === selectedUser);
    } else if (user?.role === 'user') {
      filtered = filtered.filter(p => p.employe_id === user.id);
    }
    
    const now = moment();
    if (selectedPeriod === 'semaine') {
      filtered = filtered.filter(p => moment(p.date).isSame(now, 'week'));
    } else if (selectedPeriod === 'mois') {
      filtered = filtered.filter(p => moment(p.date).isSame(now, 'month'));
    } else if (selectedPeriod === 'annee') {
      filtered = filtered.filter(p => moment(p.date).isSame(now, 'year'));
    }
    
    return filtered;
  };

  const filteredPointages = getFilteredPointages();
  
  const totalHeures = filteredPointages.reduce((sum, p) => sum + (p.duree_minutes || 0), 0) / 60;
  const joursTravailles = new Set(filteredPointages.map(p => p.date)).size;
  const moyenneHeuresJour = joursTravailles > 0 ? totalHeures / joursTravailles : 0;
  const anomalies = filteredPointages.filter(p => !p.heure_sortie || p.duree_minutes > 720 || p.duree_minutes < 60);

  const statsParEmploye = {};
  filteredPointages.forEach(p => {
    if (!statsParEmploye[p.employe_id]) {
      statsParEmploye[p.employe_id] = {
        nom: p.employe_nom,
        heures: 0,
        jours: new Set()
      };
    }
    statsParEmploye[p.employe_id].heures += (p.duree_minutes || 0) / 60;
    statsParEmploye[p.employe_id].jours.add(p.date);
  });

  const chartData = Object.values(statsParEmploye).map(s => ({
    nom: s.nom.split(' ')[0],
    heures: Math.round(s.heures * 10) / 10,
    jours: s.jours.size
  }));

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RoleProtection allowedRoles={['admin', 'manager', 'user']} user={user}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Statistiques Pointage</h1>
            <p className="text-slate-500">Analyse et insights sur les heures travaillées</p>
          </div>
          {(isAdmin || isManager) && (
            <Button 
              onClick={analyzeWithAI}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyse en cours...' : 'Analyse IA'}
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {(isAdmin || isManager) && (
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tous les employés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les employés</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semaine">Cette semaine</SelectItem>
              <SelectItem value="mois">Ce mois</SelectItem>
              <SelectItem value="annee">Cette année</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total heures</p>
                  <p className="text-xl font-bold text-slate-900">{Math.round(totalHeures)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Moyenne/jour</p>
                  <p className="text-xl font-bold text-slate-900">{moyenneHeuresJour.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jours travaillés</p>
                  <p className="text-xl font-bold text-slate-900">{joursTravailles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Anomalies</p>
                  <p className="text-xl font-bold text-slate-900">{anomalies.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {aiAnalysis && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Analyse IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiAnalysis.insights && aiAnalysis.insights.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-slate-900">📊 Insights</h4>
                  <ul className="space-y-1">
                    {aiAnalysis.insights.map((insight, i) => (
                      <li key={i} className="text-sm text-slate-700">• {insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {aiAnalysis.anomalies_detectees && aiAnalysis.anomalies_detectees.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-amber-900">⚠️ Anomalies détectées</h4>
                  <div className="space-y-2">
                    {aiAnalysis.anomalies_detectees.map((anom, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg">
                        <p className="font-medium text-sm text-slate-900">{anom.employe}</p>
                        <p className="text-sm text-slate-600">{anom.type}</p>
                        <p className="text-xs text-blue-600 mt-1">→ {anom.action_recommandee}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiAnalysis.tendances && aiAnalysis.tendances.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-emerald-900">📈 Tendances</h4>
                  <div className="space-y-1">
                    {aiAnalysis.tendances.map((tend, i) => (
                      <p key={i} className="text-sm text-slate-700">
                        <span className="font-medium">{tend.employe}:</span> {tend.tendance}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 text-indigo-900">💡 Recommandations</h4>
                  <ul className="space-y-1">
                    {aiAnalysis.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-slate-700">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Heures par employé</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nom" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="heures" fill="#3b82f6" name="Heures" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Détail par employé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statsParEmploye).map(([id, stats]) => (
                <div key={id} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{stats.nom}</p>
                      <p className="text-sm text-slate-500">
                        {stats.jours.size} jour{stats.jours.size > 1 ? 's' : ''} travaillé{stats.jours.size > 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">{Math.round(stats.heures)}h</p>
                      <p className="text-sm text-slate-500">
                        {(stats.heures / stats.jours.size).toFixed(1)}h/jour
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleProtection>
  );
}