import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, AlertTriangle, Package, DollarSign } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { formatMontant } from '@/components/utils/formatMontant.jsx';

export default function AnalyseVentesIA({ produits }) {
  const [analyse, setAnalyse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const genererAnalyse = async () => {
    setIsLoading(true);
    try {
      // Récupérer les données de ventes
      const [factures, devis] = await Promise.all([
        base44.entities.Facture.list('-created_date', 200),
        base44.entities.Devis.list('-created_date', 100)
      ]);

      // Analyser les produits vendus
      const produitsVendus = {};
      const revenusParProduit = {};
      
      factures.forEach(f => {
        (f.lignes || []).forEach(ligne => {
          const nom = ligne.designation;
          produitsVendus[nom] = (produitsVendus[nom] || 0) + (ligne.quantite || 1);
          revenusParProduit[nom] = (revenusParProduit[nom] || 0) + (ligne.montant || 0);
        });
      });

      // Top 10 produits
      const topProduits = Object.entries(produitsVendus)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      // Produits du catalogue non vendus
      const catalogueNoms = produits.map(p => p.nom.toLowerCase());
      const venduNoms = Object.keys(produitsVendus).map(n => n.toLowerCase());
      const produitsNonVendus = produits.filter(p => 
        !venduNoms.some(v => v.includes(p.nom.toLowerCase()))
      );

      // Analyse par catégorie
      const categoriesVentes = {};
      factures.forEach(f => {
        (f.lignes || []).forEach(ligne => {
          const produit = produits.find(p => 
            p.nom.toLowerCase() === ligne.designation.toLowerCase()
          );
          if (produit) {
            categoriesVentes[produit.categorie] = (categoriesVentes[produit.categorie] || 0) + (ligne.montant || 0);
          }
        });
      });

      const prompt = `Tu es un analyste commercial pour l'Imprimerie Ogooué.

**Données de vente (200 dernières factures):**
- Top 10 produits vendus: ${topProduits.map(([nom, qte]) => `${nom} (${qte}x)`).join(', ')}
- Revenus par produit: ${Object.entries(revenusParProduit).slice(0, 10).map(([nom, rev]) => `${nom} (${rev} FCFA)`).join(', ')}
- Ventes par catégorie: ${Object.entries(categoriesVentes).map(([cat, rev]) => `${cat} (${rev} FCFA)`).join(', ')}

**Catalogue actuel (${produits.length} produits):**
${produits.slice(0, 30).map(p => `- ${p.nom} (${p.categorie}) - ${p.prix_unitaire} FCFA`).join('\n')}

**Produits non/peu vendus:** ${produitsNonVendus.slice(0, 10).map(p => p.nom).join(', ')}

**Mission:**
Fournis une analyse stratégique pour optimiser le catalogue et maximiser les revenus.

Réponds au format JSON avec:
1. **produits_a_promouvoir**: 3-5 produits du catalogue à mettre en avant (bon potentiel mais peu vendus)
2. **produits_a_ajouter**: 3-5 nouveaux produits à créer (opportunités de marché non couvertes)
3. **produits_a_retirer**: produits sous-performants à retirer ou désactiver
4. **recommandations**: 2-3 actions stratégiques prioritaires

Format JSON strict:
{
  "produits_a_promouvoir": [
    {"nom": "nom exact du catalogue", "raison": "pourquoi le promouvoir", "potentiel_revenu": 50000}
  ],
  "produits_a_ajouter": [
    {"nom": "nouveau produit", "categorie": "catégorie", "raison": "opportunité de marché", "prix_suggere": 5000}
  ],
  "produits_a_retirer": [
    {"nom": "produit", "raison": "pourquoi le retirer"}
  ],
  "recommandations": [
    {"titre": "titre court", "description": "action à prendre", "priorite": "haute/moyenne/basse"}
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            produits_a_promouvoir: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nom: { type: "string" },
                  raison: { type: "string" },
                  potentiel_revenu: { type: "number" }
                }
              }
            },
            produits_a_ajouter: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nom: { type: "string" },
                  categorie: { type: "string" },
                  raison: { type: "string" },
                  prix_suggere: { type: "number" }
                }
              }
            },
            produits_a_retirer: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nom: { type: "string" },
                  raison: { type: "string" }
                }
              }
            },
            recommandations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titre: { type: "string" },
                  description: { type: "string" },
                  priorite: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalyse(result);
      toast.success('Analyse terminée');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'analyse');
    } finally {
      setIsLoading(false);
    }
  };

  if (!analyse && !isLoading) {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardContent className="p-6 text-center">
          <TrendingUp className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-900 mb-2">Analyse IA des ventes</h3>
          <p className="text-sm text-slate-600 mb-4">
            Optimisez votre catalogue avec des recommandations basées sur vos données de vente
          </p>
          <Button 
            onClick={genererAnalyse}
            className="bg-gradient-to-r from-emerald-600 to-teal-600"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Lancer l'analyse
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 text-emerald-600 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-slate-600">Analyse des données de vente...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recommandations prioritaires */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Actions prioritaires
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analyse.recommandations.map((rec, idx) => (
            <Card key={idx} className={`border ${
              rec.priorite === 'haute' ? 'bg-rose-50 border-rose-200' :
              rec.priorite === 'moyenne' ? 'bg-amber-50 border-amber-200' :
              'bg-blue-50 border-blue-200'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <Badge className={
                    rec.priorite === 'haute' ? 'bg-rose-600' :
                    rec.priorite === 'moyenne' ? 'bg-amber-600' :
                    'bg-blue-600'
                  }>
                    {rec.priorite}
                  </Badge>
                  <div>
                    <p className="font-semibold text-slate-900">{rec.titre}</p>
                    <p className="text-sm text-slate-600">{rec.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Produits à promouvoir */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Produits à promouvoir
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analyse.produits_a_promouvoir.map((prod, idx) => (
            <Card key={idx} className="border bg-emerald-50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{prod.nom}</p>
                    <p className="text-sm text-slate-600">{prod.raison}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Potentiel</p>
                    <p className="font-bold text-emerald-600">{formatMontant(prod.potentiel_revenu)} F</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Nouveaux produits à ajouter */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Nouveaux produits suggérés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analyse.produits_a_ajouter.map((prod, idx) => (
            <Card key={idx} className="border bg-blue-50">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900">{prod.nom}</p>
                      <Badge className="bg-blue-100 text-blue-700">{prod.categorie}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{prod.raison}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Prix suggéré</p>
                    <p className="font-bold text-blue-600">{formatMontant(prod.prix_suggere)} F</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Produits à retirer */}
      {analyse.produits_a_retirer.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Produits sous-performants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analyse.produits_a_retirer.map((prod, idx) => (
              <Card key={idx} className="border bg-rose-50">
                <CardContent className="p-3">
                  <p className="font-semibold text-slate-900">{prod.nom}</p>
                  <p className="text-sm text-slate-600">{prod.raison}</p>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      <Button 
        variant="outline" 
        onClick={genererAnalyse} 
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Actualiser l'analyse
      </Button>
    </div>
  );
}