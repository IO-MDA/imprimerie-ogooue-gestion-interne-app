import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar, Target, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function TableauBordFinancierIA({ travaux, projet }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);

  // Calculs financiers
  const totalDepenses = travaux.reduce((sum, t) => sum + (t.montant || 0), 0);
  const totalPaye = travaux.reduce((sum, t) => sum + (t.montant_paye || 0), 0);
  const totalRestant = totalDepenses - totalPaye;
  
  // Tendances par type
  const depensesParType = {};
  travaux.forEach(t => {
    if (!depensesParType[t.type_travail]) {
      depensesParType[t.type_travail] = { montant: 0, nombre: 0 };
    }
    depensesParType[t.type_travail].montant += t.montant || 0;
    depensesParType[t.type_travail].nombre += 1;
  });

  const chartDataTypes = Object.entries(depensesParType).map(([type, data]) => ({
    type: type || 'Autre',
    montant: data.montant,
    nombre: data.nombre
  }));

  // Évolution temporelle
  const travauxParMois = {};
  travaux.forEach(t => {
    const mois = moment(t.date).format('YYYY-MM');
    if (!travauxParMois[mois]) {
      travauxParMois[mois] = { depenses: 0, paye: 0 };
    }
    travauxParMois[mois].depenses += t.montant || 0;
    travauxParMois[mois].paye += t.montant_paye || 0;
  });

  const chartDataTemporel = Object.entries(travauxParMois)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mois, data]) => ({
      mois: moment(mois).format('MMM YYYY'),
      depenses: data.depenses,
      paye: data.paye,
      reste: data.depenses - data.paye
    }));

  // Statut paiement
  const statutPaiement = [
    { name: 'Payé', value: totalPaye, color: '#10b981' },
    { name: 'Reste', value: totalRestant, color: '#ef4444' }
  ];

  // Dépassements budgétaires (travaux avec avancement > budget)
  const depassements = travaux.filter(t => {
    return (t.montant_paye || 0) > (t.montant || 0);
  });

  const analyzeWithIA = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Analyse financière détaillée des travaux du projet "${projet}".

Données:
- Total dépenses: ${totalDepenses} FCFA
- Total payé: ${totalPaye} FCFA
- Reste à payer: ${totalRestant} FCFA
- Nombre de travaux: ${travaux.length}
- Répartition par type: ${JSON.stringify(depensesParType)}
- Évolution temporelle: ${JSON.stringify(travauxParMois)}

Fournis une analyse JSON avec:
{
  "tendances_principales": ["tendance 1", "tendance 2", "tendance 3"],
  "risques_financiers": [{"risque": "...", "impact": "faible|moyen|élevé", "recommandation": "..."}],
  "previsions_3_mois": {
    "depenses_estimees": nombre,
    "commentaire": "..."
  },
  "opportunites_economie": ["opportunité 1", "opportunité 2"],
  "indicateurs_cles": {
    "taux_paiement": pourcentage,
    "cout_moyen_par_travail": nombre,
    "tendance_generale": "hausse|baisse|stable"
  }
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            tendances_principales: { type: "array", items: { type: "string" } },
            risques_financiers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risque: { type: "string" },
                  impact: { type: "string" },
                  recommandation: { type: "string" }
                }
              }
            },
            previsions_3_mois: {
              type: "object",
              properties: {
                depenses_estimees: { type: "number" },
                commentaire: { type: "string" }
              }
            },
            opportunites_economie: { type: "array", items: { type: "string" } },
            indicateurs_cles: {
              type: "object",
              properties: {
                taux_paiement: { type: "number" },
                cout_moyen_par_travail: { type: "number" },
                tendance_generale: { type: "string" }
              }
            }
          }
        }
      });

      setInsights(response);
      toast.success('Analyse IA terminée');
    } catch (e) {
      toast.error('Erreur lors de l\'analyse IA');
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Tableau de Bord Financier IA</h2>
        <Button 
          onClick={analyzeWithIA}
          disabled={isAnalyzing || travaux.length === 0}
          className="bg-gradient-to-r from-violet-600 to-purple-600"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analyser avec l'IA
            </>
          )}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Total dépenses</p>
                <p className="text-xl font-bold text-slate-900">{totalDepenses.toLocaleString()} F</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Total payé</p>
                <p className="text-xl font-bold text-emerald-900">{totalPaye.toLocaleString()} F</p>
                <p className="text-xs text-emerald-600">
                  {((totalPaye / totalDepenses) * 100).toFixed(0)}% payé
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Reste à payer</p>
                <p className="text-xl font-bold text-rose-900">{totalRestant.toLocaleString()} F</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Travaux</p>
                <p className="text-xl font-bold text-blue-900">{travaux.length}</p>
                <p className="text-xs text-slate-500">
                  {(totalDepenses / travaux.length).toLocaleString()} F moy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution temporelle */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Évolution des dépenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartDataTemporel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mois" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} F`} />
                <Legend />
                <Line type="monotone" dataKey="depenses" stroke="#f97316" strokeWidth={2} name="Dépenses" />
                <Line type="monotone" dataKey="paye" stroke="#10b981" strokeWidth={2} name="Payé" />
                <Line type="monotone" dataKey="reste" stroke="#ef4444" strokeWidth={2} name="Reste" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par type */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Dépenses par type de travaux</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartDataTypes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} F`} />
                <Bar dataKey="montant" fill="#3b82f6" name="Montant" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Statut paiement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>État des paiements</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statutPaiement}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statutPaiement.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toLocaleString()} F`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dépassements */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Alertes & Dépassements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {depassements.length === 0 ? (
              <p className="text-slate-500 text-center py-8">Aucun dépassement détecté</p>
            ) : (
              <div className="space-y-2">
                {depassements.map(d => (
                  <div key={d.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="font-medium text-slate-900">{d.description}</p>
                    <p className="text-sm text-amber-700">
                      Dépassement: {((d.montant_paye - d.montant) || 0).toLocaleString()} F
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights IA */}
      {insights && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-600" />
            Insights IA
          </h3>

          {/* Tendances */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Tendances principales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.tendances_principales?.map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-600">•</span>
                    <span className="text-slate-700">{t}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Risques */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-rose-50 to-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Risques financiers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.risques_financiers?.map((r, i) => (
                <div key={i} className="p-4 bg-white rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-900">{r.risque}</p>
                    <Badge className={
                      r.impact === 'élevé' ? 'bg-red-100 text-red-700' :
                      r.impact === 'moyen' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {r.impact}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">{r.recommandation}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Prévisions */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Prévisions 3 mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-white rounded-lg">
                <p className="text-2xl font-bold text-emerald-600 mb-2">
                  {insights.previsions_3_mois?.depenses_estimees?.toLocaleString()} F
                </p>
                <p className="text-sm text-slate-600">{insights.previsions_3_mois?.commentaire}</p>
              </div>
            </CardContent>
          </Card>

          {/* Opportunités */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-50 to-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-violet-600" />
                Opportunités d'économie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.opportunites_economie?.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 p-3 bg-white rounded-lg">
                    <span className="text-violet-600">💡</span>
                    <span className="text-slate-700">{o}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}