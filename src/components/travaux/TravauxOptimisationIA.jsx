import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, TrendingDown, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TravauxOptimisationIA({ travaux, projet }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const totalDepenses = travaux.reduce((sum, t) => sum + (t.montant || 0), 0);
      const totalPaye = travaux.reduce((sum, t) => sum + (t.montant_paye || 0), 0);
      const travauxEnCours = travaux.filter(t => t.avancement < 100);
      
      const travauxData = travaux.map(t => ({
        type: t.type_travail,
        description: t.description,
        montant: t.montant,
        paye: t.montant_paye,
        avancement: t.avancement,
        priorite: t.priorite,
        fournisseur: t.fournisseur
      }));

      const prompt = `Tu es un expert en gestion de projets de construction au Gabon.

Projet: ${projet === 'papeterie' ? 'Papeterie OGOOUE' : 'Restaurant Fast-Food OGOOUE'}

Budget total dépensé: ${totalDepenses.toLocaleString()} FCFA
Montant payé: ${totalPaye.toLocaleString()} FCFA
Reste à payer: ${(totalDepenses - totalPaye).toLocaleString()} FCFA

Travaux en cours: ${travauxEnCours.length}
Total travaux: ${travaux.length}

Détail des travaux:
${JSON.stringify(travauxData, null, 2)}

Analyse ce projet de construction et fournis:

1. État général du projet (score sur 10 + commentaire)
2. Points d'attention urgents (liste de 3-5 points avec priorité)
3. Optimisations budgétaires suggérées (3-4 recommandations concrètes)
4. Planning recommandé pour les travaux restants
5. Risques identifiés et solutions
6. Estimation du coût total final du projet

Sois précis, pragmatique et adapté au contexte gabonais.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            etat_general: {
              type: "object",
              properties: {
                score: { type: "number" },
                commentaire: { type: "string" }
              }
            },
            points_attention: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titre: { type: "string" },
                  description: { type: "string" },
                  priorite: { type: "string" }
                }
              }
            },
            optimisations_budgetaires: {
              type: "array",
              items: { type: "string" }
            },
            planning_recommande: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  etape: { type: "string" },
                  delai: { type: "string" },
                  budget_estime: { type: "number" }
                }
              }
            },
            risques: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risque: { type: "string" },
                  solution: { type: "string" }
                }
              }
            },
            cout_total_estime: {
              type: "number"
            }
          }
        }
      });

      setAnalysis(result);
      toast.success('Analyse terminée');
    } catch (e) {
      toast.error('Erreur lors de l\'analyse');
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-emerald-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getPriorityIcon = (priorite) => {
    if (priorite === 'urgente' || priorite === 'haute') return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    if (priorite === 'normale') return <TrendingUp className="w-4 h-4 text-blue-600" />;
    return <CheckCircle className="w-4 h-4 text-emerald-600" />;
  };

  return (
    <div className="space-y-6">
      {!analysis ? (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-violet-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Analyse IA du projet {projet === 'papeterie' ? 'Papeterie' : 'Restaurant'}
          </h3>
          <p className="text-slate-600 mb-6">
            L'IA va analyser vos travaux et vous proposer des optimisations
          </p>
          <Button
            onClick={analyzeWithAI}
            disabled={isAnalyzing || travaux.length === 0}
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
          {/* Score général */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-violet-50 to-purple-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">État général du projet</h3>
                  <p className="text-slate-600">{analysis.etat_general.commentaire}</p>
                </div>
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getScoreColor(analysis.etat_general.score)}`}>
                    {analysis.etat_general.score}/10
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Points d'attention */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Points d'attention urgents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.points_attention.map((point, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    {getPriorityIcon(point.priorite)}
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">{point.titre}</h4>
                      <p className="text-sm text-slate-600">{point.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Optimisations budgétaires */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-emerald-600" />
                Optimisations budgétaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.optimisations_budgetaires.map((optim, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span className="text-slate-700">{optim}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Planning recommandé */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Planning recommandé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.planning_recommande.map((etape, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900">{etape.etape}</h4>
                        <p className="text-sm text-blue-700 mt-1">Délai: {etape.delai}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-blue-600">Budget estimé</p>
                        <p className="font-bold text-blue-900">{etape.budget_estime.toLocaleString()} F</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risques */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Risques identifiés
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analysis.risques.map((item, idx) => (
                <div key={idx} className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
                  <h4 className="font-semibold text-rose-900 mb-2">⚠️ {item.risque}</h4>
                  <p className="text-sm text-rose-700">💡 Solution: {item.solution}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Estimation finale */}
          <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-amber-900 mb-1">
                    Coût total estimé du projet
                  </h3>
                  <p className="text-sm text-amber-700">
                    Basé sur les travaux actuels et prévisions IA
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-amber-900">
                    {analysis.cout_total_estime.toLocaleString()} F
                  </p>
                </div>
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