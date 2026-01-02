import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { formatMontant } from '@/components/utils/formatMontant.jsx';

export default function SuggestionsIA({ produitActuel, tousLesProduits, clientId }) {
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const genererSuggestions = async () => {
    setIsLoading(true);
    try {
      // Récupérer l'historique du client si disponible
      let historiqueCommandes = [];
      if (clientId) {
        const factures = await base44.entities.Facture.filter({ client_id: clientId });
        historiqueCommandes = factures.flatMap(f => 
          (f.lignes || []).map(l => l.designation)
        );
      }

      const prompt = `Tu es un assistant commercial intelligent pour l'Imprimerie Ogooué.

**Produit consulté:**
- Nom: ${produitActuel.nom}
- Catégorie: ${produitActuel.categorie}
- Description: ${produitActuel.description_courte || ''}

${historiqueCommandes.length > 0 ? `**Historique d'achats du client:**
${historiqueCommandes.slice(0, 10).join(', ')}` : ''}

**Catalogue disponible:**
${tousLesProduits.filter(p => p.actif && p.id !== produitActuel.id).slice(0, 30).map(p => 
  `- ${p.nom} (${p.categorie}) - ${p.prix_unitaire} FCFA`
).join('\n')}

**Mission:**
Suggère 3 à 5 produits complémentaires ou alternatifs pertinents pour ce client.

Pour chaque suggestion, fournis:
- Le nom EXACT du produit (tel qu'il apparaît dans le catalogue)
- La raison de la recommandation (1 ligne courte)
- Si c'est complémentaire ou alternatif

Réponds UNIQUEMENT au format JSON:
{
  "suggestions": [
    {
      "nom_produit": "nom exact",
      "raison": "explication courte",
      "type": "complementaire" ou "alternatif"
    }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nom_produit: { type: "string" },
                  raison: { type: "string" },
                  type: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Enrichir avec les données produits
      const suggestionsEnrichies = result.suggestions.map(s => {
        const produit = tousLesProduits.find(p => 
          p.nom.toLowerCase() === s.nom_produit.toLowerCase()
        );
        return { ...s, produit };
      }).filter(s => s.produit);

      setSuggestions(suggestionsEnrichies);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération des suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  if (!suggestions && !isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="p-6 text-center">
          <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-2">Suggestions IA</h3>
          <p className="text-sm text-slate-600 mb-4">
            Découvrez des produits complémentaires ou alternatifs recommandés par notre IA
          </p>
          <Button 
            onClick={genererSuggestions}
            className="bg-gradient-to-r from-purple-600 to-indigo-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Générer les suggestions
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 text-purple-600 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-slate-600">Analyse en cours...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Recommandations IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion, idx) => (
          <Card key={idx} className="border bg-slate-50 hover:bg-white transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-slate-900">
                      {suggestion.produit.nom}
                    </h4>
                    <Badge className={
                      suggestion.type === 'complementaire' 
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-blue-100 text-blue-700'
                    }>
                      {suggestion.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    {suggestion.raison}
                  </p>
                  <p className="text-sm font-semibold text-purple-600">
                    {formatMontant(suggestion.produit.prix_unitaire)} F
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        ))}
        <Button 
          variant="outline" 
          onClick={genererSuggestions} 
          className="w-full"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Actualiser les suggestions
        </Button>
      </CardContent>
    </Card>
  );
}