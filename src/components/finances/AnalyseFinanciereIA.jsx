import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, DollarSign, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import moment from 'moment';

export default function AnalyseFinanciereIA({ rapports, charges, dettes, travaux }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      // Préparer les données pour l'analyse
      const last6Months = [];
      for (let i = 0; i < 6; i++) {
        const month = moment().subtract(i, 'months').format('YYYY-MM');
        const monthData = rapports.filter(r => moment(r.date).format('YYYY-MM') === month);
        const recettes = monthData.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
        const depenses = monthData.reduce((sum, r) => sum + (r.total_depenses || 0), 0);
        last6Months.push({ month, recettes, depenses, benefice: recettes - depenses });
      }

      const chargesActives = charges.filter(c => c.active);
      const totalChargesMensuelles = chargesActives.reduce((sum, c) => sum + c.montant_mensuel, 0);
      const dettesActives = dettes.filter(d => d.statut === 'en_cours');
      const totalDettes = dettesActives.reduce((sum, d) => sum + d.montant_restant, 0);
      const mensualitesDettes = dettesActives.reduce((sum, d) => sum + (d.mensualite || 0), 0);

      // Données des travaux
      const travauxEnCours = travaux.filter(t => t.avancement < 100);
      const budgetTravauxTotal = travaux.reduce((sum, t) => sum + (t.montant || 0), 0);
      const budgetTravauxPaye = travaux.reduce((sum, t) => sum + (t.montant_paye || 0), 0);
      const budgetTravauxRestant = budgetTravauxTotal - budgetTravauxPaye;

      const prompt = `Tu es un expert en analyse financière pour PME au Gabon. Analyse les données de l'Imprimerie OGOOUE:

DONNÉES HISTORIQUES (6 derniers mois):
${JSON.stringify(last6Months, null, 2)}

CHARGES FIXES MENSUELLES: ${totalChargesMensuelles.toLocaleString()} FCFA
Détail: ${chargesActives.map(c => `${c.libelle}: ${c.montant_mensuel.toLocaleString()} F`).join(', ')}

DETTES EN COURS:
- Total à rembourser: ${totalDettes.toLocaleString()} FCFA
- Mensualités: ${mensualitesDettes.toLocaleString()} FCFA

TRAVAUX EN COURS (Papeterie/Restaurant):
- Budget total: ${budgetTravauxTotal.toLocaleString()} FCFA
- Déjà payé: ${budgetTravauxPaye.toLocaleString()} FCFA
- Reste à payer: ${budgetTravauxRestant.toLocaleString()} FCFA
- Projets en cours: ${travauxEnCours.length}

FOURNIS:
1. Prévisions financières (3 mois suivants) avec recettes, dépenses, bénéfice estimé
2. Analyse de trésorerie et capacité à finir les travaux
3. Alertes sur risques financiers et dépassements budgétaires potentiels
4. Recommandations d'optimisation des coûts (3-5 suggestions concrètes)
5. Estimation du coût total final des travaux avec marge d'erreur
6. Plan d'action prioritaire (5 actions urgentes)

Sois précis, chiffré et adapté au contexte gabonais.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            previsions_3_mois: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mois: { type: "string" },
                  recettes_prevues: { type: "number" },
                  depenses_prevues: { type: "number" },
                  benefice_prevu: { type: "number" },
                  commentaire: { type: "string" }
                }
              }
            },
            analyse_tresorerie: {
              type: "object",
              properties: {
                sante_financiere: { type: "string" },
                capacite_finir_travaux: { type: "boolean" },
                mois_tresorerie_critique: { type: "number" },
                commentaire: { type: "string" }
              }
            },
            alertes_risques: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  niveau: { type: "string" },
                  titre: { type: "string" },
                  description: { type: "string" },
                  impact_financier: { type: "number" }
                }
              }
            },
            recommandations_optimisation: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titre: { type: "string" },
                  description: { type: "string" },
                  economie_potentielle: { type: "number" }
                }
              }
            },
            cout_final_travaux: {
              type: "object",
              properties: {
                estimation_basse: { type: "number" },
                estimation_moyenne: { type: "number" },
                estimation_haute: { type: "number" },
                confiance: { type: "number" },
                commentaire: { type: "string" }
              }
            },
            plan_action: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  priorite: { type: "string" },
                  delai: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalysis(result);
      toast.success('Analyse financière IA terminée');
    } catch (e) {
      toast.error('Erreur lors de l\'analyse');
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getNiveauColor = (niveau) => {
    if (niveau === 'critique' || niveau === 'urgent') return 'bg-rose-100 text-rose-700 border-rose-300';
    if (niveau === 'important' || niveau === 'moyen') return 'bg-amber-100 text-amber-700 border-amber-300';
    return 'bg-blue-100 text-blue-700 border-blue-300';
  };

  return (
    <div className="space-y-6">
      {!analysis ? (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-violet-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Analyse Financière & Prévisions IA
          </h3>
          <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
            L'IA va analyser vos données financières, prévisions de revenus, dépenses, travaux en cours et vous fournir des recommandations stratégiques avec alertes sur les risques budgétaires.
          </p>
          <Button
            onClick={analyzeWithAI}
            disabled={isAnalyzing}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Lancer l'analyse IA
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Prévisions 3 mois */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Prévisions financières (3 prochains mois)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.previsions_3_mois.map((prev, idx) => (
                  <div key={idx} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-blue-900">{prev.mois}</h4>
                      <Badge className={prev.benefice_prevu > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                        {prev.benefice_prevu > 0 ? '+' : ''}{prev.benefice_prevu.toLocaleString()} F
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-sm mb-2">
                      <div>
                        <p className="text-blue-600">Recettes</p>
                        <p className="font-bold text-blue-900">{prev.recettes_prevues.toLocaleString()} F</p>
                      </div>
                      <div>
                        <p className="text-rose-600">Dépenses</p>
                        <p className="font-bold text-rose-900">{prev.depenses_prevues.toLocaleString()} F</p>
                      </div>
                      <div>
                        <p className="text-emerald-600">Bénéfice</p>
                        <p className="font-bold text-emerald-900">{prev.benefice_prevu.toLocaleString()} F</p>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700">{prev.commentaire}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analyse trésorerie */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardHeader>
              <CardTitle>Santé Financière & Trésorerie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Badge className={
                    analysis.analyse_tresorerie.sante_financiere === 'excellente' ? 'bg-emerald-500 text-white' :
                    analysis.analyse_tresorerie.sante_financiere === 'bonne' ? 'bg-emerald-400 text-white' :
                    analysis.analyse_tresorerie.sante_financiere === 'moyenne' ? 'bg-amber-400 text-white' :
                    'bg-rose-500 text-white'
                  }>
                    Santé: {analysis.analyse_tresorerie.sante_financiere}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Capacité à finir les travaux:</span>
                  <Badge className={analysis.analyse_tresorerie.capacite_finir_travaux ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                    {analysis.analyse_tresorerie.capacite_finir_travaux ? 'Oui ✓' : 'Non ✗'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Mois de trésorerie critique: <span className="font-bold">{analysis.analyse_tresorerie.mois_tresorerie_critique}</span></p>
                </div>
                <p className="text-sm text-slate-700 italic">{analysis.analyse_tresorerie.commentaire}</p>
              </div>
            </CardContent>
          </Card>

          {/* Alertes et risques */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Alertes & Risques Budgétaires
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.alertes_risques.map((alerte, idx) => (
                <div key={idx} className={`p-4 rounded-lg border-2 ${getNiveauColor(alerte.niveau)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold">{alerte.titre}</h4>
                    <Badge className={alerte.niveau === 'critique' ? 'bg-rose-600' : alerte.niveau === 'important' ? 'bg-amber-600' : 'bg-blue-600'}>
                      {alerte.niveau}
                    </Badge>
                  </div>
                  <p className="text-sm mb-2">{alerte.description}</p>
                  {alerte.impact_financier > 0 && (
                    <p className="text-xs font-bold">Impact: {alerte.impact_financier.toLocaleString()} FCFA</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recommandations */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" />
                Recommandations d'Optimisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.recommandations_optimisation.map((reco, idx) => (
                <div key={idx} className="p-4 bg-emerald-50 rounded-lg">
                  <h4 className="font-semibold text-emerald-900 mb-1">{reco.titre}</h4>
                  <p className="text-sm text-emerald-700 mb-2">{reco.description}</p>
                  {reco.economie_potentielle > 0 && (
                    <Badge className="bg-emerald-600">
                      Économie: {reco.economie_potentielle.toLocaleString()} F
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Coût final travaux */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
            <CardHeader>
              <CardTitle>Estimation Coût Total Final des Travaux</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-slate-500">Scénario bas</p>
                    <p className="text-lg font-bold text-emerald-700">{analysis.cout_final_travaux.estimation_basse.toLocaleString()} F</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border-2 border-amber-400">
                    <p className="text-xs text-amber-600">Scénario moyen</p>
                    <p className="text-2xl font-bold text-amber-900">{analysis.cout_final_travaux.estimation_moyenne.toLocaleString()} F</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-xs text-slate-500">Scénario haut</p>
                    <p className="text-lg font-bold text-rose-700">{analysis.cout_final_travaux.estimation_haute.toLocaleString()} F</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <span className="text-sm">Niveau de confiance:</span>
                  <Badge className="bg-blue-600">{analysis.cout_final_travaux.confiance}%</Badge>
                </div>
                <p className="text-sm text-amber-800 italic">{analysis.cout_final_travaux.commentaire}</p>
              </div>
            </CardContent>
          </Card>

          {/* Plan d'action */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Plan d'Action Prioritaire</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.plan_action.map((action, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{action.action}</p>
                        <Badge className={
                          action.priorite === 'urgente' ? 'bg-rose-600' :
                          action.priorite === 'haute' ? 'bg-orange-500' :
                          'bg-blue-500'
                        }>
                          {action.priorite}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">Délai: {action.delai}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button onClick={() => setAnalysis(null)} variant="outline">
              Nouvelle analyse
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}