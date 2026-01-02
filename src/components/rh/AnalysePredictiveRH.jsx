import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { AlertTriangle, TrendingUp, Users, Sparkles, Brain } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function AnalysePredictiveRH() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyse, setAnalyse] = useState(null);

  const lancerAnalyse = async () => {
    setIsAnalyzing(true);
    try {
      const [users, pointages, avances, demandes] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Pointage.list('-date', 500),
        base44.entities.Avance.list('-date_avance', 200),
        base44.entities.DemandeRH.list('-created_date', 100)
      ]);

      // Construire les données pour l'analyse
      const employes = users.map(user => {
        const pointagesUser = pointages.filter(p => p.employe_id === user.id);
        const avancesUser = avances.filter(a => a.employe_id === user.id);
        const demandesUser = demandes.filter(d => d.demandeur_id === user.id);

        // Calculer les KPIs
        const heuresMois = pointagesUser
          .filter(p => moment(p.date).isAfter(moment().subtract(1, 'months')))
          .reduce((sum, p) => sum + (p.duree_minutes || 0), 0) / 60;

        const tauxAbsence = pointagesUser.length > 0 
          ? (1 - (pointagesUser.filter(p => p.statut === 'termine').length / pointagesUser.length)) * 100
          : 0;

        const avancesRecentes = avancesUser.filter(a => 
          moment(a.date_avance).isAfter(moment().subtract(3, 'months'))
        );

        return {
          nom: user.full_name,
          email: user.email,
          heures_moyennes: Math.round(heuresMois),
          taux_absence: Math.round(tauxAbsence),
          nombre_avances: avancesRecentes.length,
          nombre_demandes: demandesUser.length
        };
      });

      // Prompt pour l'IA
      const prompt = `Tu es un analyste RH expert. Analyse les données suivantes et fournis des insights prédictifs.

Données des employés (${employes.length} employés) :
${employes.slice(0, 20).map(e => 
  `- ${e.nom}: ${e.heures_moyennes}h/mois, ${e.taux_absence}% absence, ${e.nombre_avances} avances récentes, ${e.nombre_demandes} demandes`
).join('\n')}

Fournis une analyse détaillée avec :
1. Employés à risque de démotivation/départ (basé sur absences élevées, nombreuses avances, peu d'heures)
2. Prédictions de besoins futurs en personnel
3. Recommandations pour l'optimisation des effectifs
4. Actions prioritaires à prendre

Retourne un JSON structuré avec :
- employes_a_risque : liste avec nom, raison, niveau_risque (haute/moyenne/basse), actions_recommandees
- predictions_besoins : {
    besoin_recrutement: nombre estimé,
    departements_critiques: liste,
    justification: texte
  }
- recommandations_optimisation : liste d'objets avec titre et description
- actions_prioritaires : liste d'objets avec priorite (1-5), action, impact`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            employes_a_risque: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nom: { type: "string" },
                  raison: { type: "string" },
                  niveau_risque: { type: "string", enum: ["haute", "moyenne", "basse"] },
                  actions_recommandees: { type: "array", items: { type: "string" } }
                }
              }
            },
            predictions_besoins: {
              type: "object",
              properties: {
                besoin_recrutement: { type: "number" },
                departements_critiques: { type: "array", items: { type: "string" } },
                justification: { type: "string" }
              }
            },
            recommandations_optimisation: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titre: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            actions_prioritaires: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priorite: { type: "number" },
                  action: { type: "string" },
                  impact: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalyse(response);
      toast.success('Analyse prédictive terminée');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getNiveauRisqueColor = (niveau) => {
    const colors = {
      'haute': 'bg-rose-100 text-rose-700 border-rose-200',
      'moyenne': 'bg-amber-100 text-amber-700 border-amber-200',
      'basse': 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[niveau] || colors['basse'];
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Analyse Prédictive RH
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </CardTitle>
                <p className="text-sm text-slate-600">Powered by AI</p>
              </div>
            </div>
            <Button
              onClick={lancerAnalyse}
              disabled={isAnalyzing}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isAnalyzing ? 'Analyse en cours...' : 'Lancer l\'analyse'}
            </Button>
          </div>
        </CardHeader>

        {analyse && (
          <CardContent className="space-y-6">
            {/* Employés à risque */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Employés à surveiller ({analyse.employes_a_risque?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyse.employes_a_risque?.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Aucun employé à risque identifié</p>
                ) : (
                  analyse.employes_a_risque?.map((employe, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{employe.nom}</p>
                          <p className="text-sm text-slate-600">{employe.raison}</p>
                        </div>
                        <Badge className={getNiveauRisqueColor(employe.niveau_risque)}>
                          Risque {employe.niveau_risque}
                        </Badge>
                      </div>
                      {employe.actions_recommandees?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-xs font-medium text-slate-600">Actions recommandées :</p>
                          {employe.actions_recommandees.map((action, i) => (
                            <p key={i} className="text-xs text-slate-600 flex items-start gap-2">
                              <span className="text-purple-600">•</span>
                              {action}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Prédictions besoins */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Prédictions de besoins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Besoin de recrutement estimé</p>
                    <p className="text-3xl font-bold text-emerald-900">
                      {analyse.predictions_besoins?.besoin_recrutement || 0} 
                      <span className="text-base ml-2">personne(s)</span>
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">Départements critiques</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {analyse.predictions_besoins?.departements_critiques?.map((dept, idx) => (
                        <Badge key={idx} className="bg-blue-100 text-blue-700">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                {analyse.predictions_besoins?.justification && (
                  <p className="text-sm text-slate-600 mt-4 p-4 bg-slate-50 rounded-lg">
                    <strong>Justification :</strong> {analyse.predictions_besoins.justification}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recommandations optimisation */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Recommandations d'optimisation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analyse.recommandations_optimisation?.map((reco, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-white">
                    <p className="font-semibold text-slate-900 mb-1">{reco.titre}</p>
                    <p className="text-sm text-slate-600">{reco.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actions prioritaires */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Actions prioritaires</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analyse.actions_prioritaires
                  ?.sort((a, b) => a.priorite - b.priorite)
                  .map((action, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg bg-white">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        action.priorite <= 2 ? 'bg-rose-100 text-rose-700' :
                        action.priorite <= 3 ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {action.priorite}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{action.action}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          <strong>Impact :</strong> {action.impact}
                        </p>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          </CardContent>
        )}

        {!analyse && !isAnalyzing && (
          <CardContent>
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <p className="text-slate-500">Lancez l'analyse pour obtenir des insights prédictifs</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}