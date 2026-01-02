import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { Sparkles, Brain, Copy, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AssistantIAClauses({ typeDocument, contenuActuel, onSuggestionAccepted }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [clausePersonnalisee, setClausePersonnalisee] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const analyserDocument = async () => {
    setIsAnalyzing(true);
    try {
      const prompt = `Tu es un expert juridique gabonais spécialisé en droit du travail et droit commercial.

Analyse ce document de type "${typeDocument}" et fournis des recommandations :

Contenu actuel :
${contenuActuel}

Fournis une analyse complète avec :
1. Clauses manquantes importantes selon la législation gabonaise
2. Clauses à améliorer ou clarifier
3. Recommandations juridiques spécifiques
4. Niveau de conformité avec le Code du Travail Gabonais

Retourne un JSON structuré.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            clauses_manquantes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titre: { type: "string" },
                  texte_suggere: { type: "string" },
                  importance: { type: "string", enum: ["critique", "importante", "recommandee"] },
                  article_reference: { type: "string" }
                }
              }
            },
            clauses_a_ameliorer: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  clause_actuelle: { type: "string" },
                  amelioration_suggeree: { type: "string" },
                  raison: { type: "string" }
                }
              }
            },
            recommandations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  categorie: { type: "string" },
                  recommandation: { type: "string" }
                }
              }
            },
            niveau_conformite: {
              type: "object",
              properties: {
                score: { type: "number" },
                commentaire: { type: "string" }
              }
            }
          }
        }
      });

      setSuggestions(response);
      toast.success('Analyse terminée');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const genererClausePersonnalisee = async () => {
    if (!clausePersonnalisee) return;
    
    setIsGenerating(true);
    try {
      const prompt = `Tu es un expert juridique gabonais.

Génère une clause juridique professionnelle pour : "${clausePersonnalisee}"

Type de document : ${typeDocument}

La clause doit :
- Être conforme à la législation gabonaise
- Utiliser un vocabulaire juridique approprié
- Être claire et sans ambiguïté
- Inclure les références légales si pertinent

Retourne uniquement le texte de la clause, sans introduction.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt
      });

      onSuggestionAccepted(response);
      setClausePersonnalisee('');
      toast.success('Clause générée et ajoutée');
    } catch (e) {
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  const getImportanceColor = (importance) => {
    const colors = {
      'critique': 'bg-rose-100 text-rose-700 border-rose-200',
      'importante': 'bg-amber-100 text-amber-700 border-amber-200',
      'recommandee': 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[importance] || colors['recommandee'];
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Assistant IA Juridique
              <Sparkles className="w-4 h-4 text-purple-600" />
            </CardTitle>
            <Button
              onClick={analyserDocument}
              disabled={isAnalyzing || !contenuActuel}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              {isAnalyzing ? 'Analyse en cours...' : 'Analyser le document'}
            </Button>
          </div>
        </CardHeader>

        {suggestions && (
          <CardContent className="space-y-6">
            {/* Niveau de conformité */}
            <div className="p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900">Niveau de conformité</h4>
                <Badge className={
                  suggestions.niveau_conformite?.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  suggestions.niveau_conformite?.score >= 60 ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }>
                  {suggestions.niveau_conformite?.score}%
                </Badge>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    suggestions.niveau_conformite?.score >= 80 ? 'bg-emerald-500' :
                    suggestions.niveau_conformite?.score >= 60 ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}
                  style={{ width: `${suggestions.niveau_conformite?.score}%` }}
                />
              </div>
              <p className="text-sm text-slate-600 mt-2">{suggestions.niveau_conformite?.commentaire}</p>
            </div>

            {/* Clauses manquantes */}
            {suggestions.clauses_manquantes?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  Clauses manquantes ({suggestions.clauses_manquantes.length})
                </h4>
                <div className="space-y-3">
                  {suggestions.clauses_manquantes.map((clause, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">{clause.titre}</p>
                          {clause.article_reference && (
                            <p className="text-xs text-slate-500 mt-1">
                              Référence : {clause.article_reference}
                            </p>
                          )}
                        </div>
                        <Badge className={getImportanceColor(clause.importance)}>
                          {clause.importance}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-3 p-3 bg-slate-50 rounded">
                        {clause.texte_suggere}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => {
                          onSuggestionAccepted(`\n\n${clause.titre} :\n${clause.texte_suggere}`);
                          toast.success('Clause ajoutée');
                        }}
                        className="w-full"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Ajouter cette clause
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clauses à améliorer */}
            {suggestions.clauses_a_ameliorer?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">
                  Suggestions d'amélioration ({suggestions.clauses_a_ameliorer.length})
                </h4>
                <div className="space-y-3">
                  {suggestions.clauses_a_ameliorer.map((amelioration, idx) => (
                    <div key={idx} className="p-4 border rounded-lg bg-white">
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Clause actuelle :</strong> {amelioration.clause_actuelle}
                      </p>
                      <p className="text-sm text-emerald-700 mb-2 p-3 bg-emerald-50 rounded">
                        <strong>Amélioration suggérée :</strong> {amelioration.amelioration_suggeree}
                      </p>
                      <p className="text-xs text-slate-500 mb-3">
                        <strong>Raison :</strong> {amelioration.raison}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(amelioration.amelioration_suggeree);
                          toast.success('Copié dans le presse-papier');
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copier
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommandations */}
            {suggestions.recommandations?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-3">
                  Recommandations générales
                </h4>
                <div className="space-y-2">
                  {suggestions.recommandations.map((reco, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-white">
                      <Badge className="mb-2 bg-blue-100 text-blue-700">{reco.categorie}</Badge>
                      <p className="text-sm text-slate-700">{reco.recommandation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Générateur de clause personnalisée */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Générer une clause personnalisée</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Ex: Clause de mobilité géographique, Clause de télétravail, Clause de période d'essai..."
            value={clausePersonnalisee}
            onChange={(e) => setClausePersonnalisee(e.target.value)}
            rows={3}
          />
          <Button
            onClick={genererClausePersonnalisee}
            disabled={isGenerating || !clausePersonnalisee}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {isGenerating ? 'Génération...' : 'Générer la clause'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}