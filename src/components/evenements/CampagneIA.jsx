import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import moment from 'moment';

export default function CampagneIA({ event }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [copied, setCopied] = useState(null);

  const generateCampagne = async () => {
    setIsGenerating(true);
    try {
      const daysUntil = moment(event.date).diff(moment(), 'days');
      
      const prompt = `Tu es un expert en marketing et communication pour une imprimerie au Gabon.

Événement: ${event.nom}
Date: ${moment(event.date).format('DD MMMM YYYY')} (dans ${daysUntil} jours)
Description: ${event.description}
Type: ${event.type}
Opportunités publicitaires: ${event.opportunite_pub}

Génère un plan de campagne publicitaire détaillé pour cet événement, incluant:

1. Stratégie de communication (3-4 points clés)
2. 3 posts pour les réseaux sociaux (Facebook, Instagram) - courts, engageants, avec emojis
3. Un message WhatsApp à envoyer aux clients (court et direct)
4. Planning de publication (quand poster, à quelle fréquence)
5. Produits/services à mettre en avant
6. 2-3 visuels suggérés à créer

Sois créatif, pertinent pour le contexte gabonais, et adapte le ton selon le type d'événement.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            strategie: {
              type: "array",
              items: { type: "string" }
            },
            posts_reseaux: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  plateforme: { type: "string" },
                  contenu: { type: "string" }
                }
              }
            },
            message_whatsapp: { type: "string" },
            planning: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  quand: { type: "string" }
                }
              }
            },
            produits_a_promouvoir: {
              type: "array",
              items: { type: "string" }
            },
            visuels_suggeres: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setSuggestions(result);
      toast.success('Campagne générée avec succès');
    } catch (e) {
      toast.error('Erreur lors de la génération');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copié dans le presse-papier');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-600" />
          Campagne IA pour {event.nom}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {!suggestions ? (
          <div className="text-center py-8">
            <Sparkles className="w-12 h-12 text-violet-400 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              Laissez l'IA créer une campagne marketing complète pour cet événement
            </p>
            <Button 
              onClick={generateCampagne}
              disabled={isGenerating}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer la campagne
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                🎯 Stratégie de communication
              </h4>
              <ul className="space-y-2">
                {suggestions.strategie?.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-violet-600">•</span>
                    <span className="text-slate-700">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                📱 Posts pour les réseaux sociaux
              </h4>
              <div className="space-y-3">
                {suggestions.posts_reseaux?.map((post, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-blue-600">{post.plateforme}</Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(post.contenu, `post-${idx}`)}
                      >
                        {copied === `post-${idx}` ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.contenu}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                💬 Message WhatsApp
              </h4>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <Badge className="bg-emerald-600">WhatsApp</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(suggestions.message_whatsapp, 'whatsapp')}
                  >
                    {copied === 'whatsapp' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{suggestions.message_whatsapp}</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                📅 Planning de publication
              </h4>
              <div className="space-y-2">
                {suggestions.planning?.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Badge variant="outline">{item.quand}</Badge>
                    <span className="text-sm text-slate-700">{item.action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  🎁 Produits à promouvoir
                </h4>
                <ul className="space-y-1">
                  {suggestions.produits_a_promouvoir?.map((produit, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="text-blue-600">✓</span>
                      {produit}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  🎨 Visuels suggérés
                </h4>
                <ul className="space-y-1">
                  {suggestions.visuels_suggeres?.map((visuel, idx) => (
                    <li key={idx} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className="text-violet-600">✓</span>
                      {visuel}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button
                onClick={() => setSuggestions(null)}
                variant="outline"
              >
                Générer une nouvelle campagne
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}