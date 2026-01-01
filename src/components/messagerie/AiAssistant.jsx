import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, Check, Zap, FileText, Package, AlertCircle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const INTENTION_CONFIG = {
  devis: {
    label: 'Demande de devis',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    prompt: `Le client demande un devis. Génère une réponse professionnelle qui:
- Accueille chaleureusement le client
- Demande les détails nécessaires (type de produit, quantité, format, délai)
- Mentionne nos spécialités (flyers, t-shirts, banderoles, mugs, etc.)
- Propose un rendez-vous ou un échange pour finaliser`,
    actions: ['Créer devis', 'Demander détails', 'Envoyer catalogue']
  },
  commande: {
    label: 'Commande',
    icon: Package,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    prompt: `Le client souhaite passer commande. Génère une réponse qui:
- Confirme la réception de la commande
- Récapitule les éléments (si mentionnés)
- Indique le délai de production (3-5 jours ouvrés)
- Demande la validation et les éléments manquants si besoin`,
    actions: ['Confirmer commande', 'Créer facture', 'Demander visuel']
  },
  reclamation: {
    label: 'Réclamation',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    prompt: `Le client a une réclamation. Génère une réponse empathique qui:
- S'excuse pour le désagrément
- Demande des détails sur le problème
- Propose une solution (remboursement, remplacement, geste commercial)
- Assure un suivi prioritaire`,
    actions: ['S\'excuser', 'Proposer solution', 'Escalader']
  },
  suivi: {
    label: 'Suivi de commande',
    icon: MessageSquare,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    prompt: `Le client demande un suivi. Génère une réponse qui:
- Rassure le client
- Indique où en est la commande
- Donne une date de livraison estimée
- Propose d'envoyer des photos de l'avancement si possible`,
    actions: ['Vérifier statut', 'Envoyer photo', 'Confirmer livraison']
  },
  information: {
    label: 'Demande d\'info',
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    prompt: `Le client demande des informations. Génère une réponse qui:
- Répond clairement à la question
- Donne des exemples concrets de nos produits/services
- Propose d'envoyer un catalogue ou des échantillons
- Encourage à passer commande`,
    actions: ['Envoyer catalogue', 'Expliquer processus', 'Donner tarifs']
  },
  autre: {
    label: 'Autre',
    icon: MessageSquare,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    prompt: `Le client a une demande générale. Génère une réponse professionnelle et adaptée.`,
    actions: ['Envoyer catalogue', 'Demander précisions']
  }
};

export default function AiAssistant({ conversation, messages, onUseSuggestion }) {
  const [suggestions, setSuggestions] = useState([]);
  const [quickActions, setQuickActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [detectedIntention, setDetectedIntention] = useState(null);

  // Auto-detect intention when conversation changes
  useEffect(() => {
    if (conversation && messages && messages.length > 0) {
      autoDetectIntention();
    } else {
      setDetectedIntention(null);
      setSuggestions([]);
      setQuickActions([]);
    }
  }, [conversation?.id]);

  const autoDetectIntention = async () => {
    if (!conversation || !messages || messages.length === 0) return;

    setAutoDetecting(true);
    try {
      const contextMessages = messages.slice(-5).map(m => 
        `${m.est_operateur ? 'Nous' : 'Client'}: ${m.contenu}`
      ).join('\n');

      const detectionPrompt = `Analyse cette conversation et identifie l'intention principale du client.

Conversation:
${contextMessages}

Choisis parmi: devis, commande, reclamation, suivi, information, autre

Retourne uniquement l'intention détectée.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: detectionPrompt
      });

      const intention = result.toLowerCase().trim();
      setDetectedIntention(intention);

      // Update conversation with detected intention
      if (conversation.intention_detectee !== intention && intention !== 'autre') {
        await base44.entities.ConversationClient.update(conversation.id, {
          intention_detectee: intention
        });
      }

      // Auto-generate suggestions based on intention
      if (INTENTION_CONFIG[intention]) {
        await generateSuggestionsForIntention(intention);
      }
    } catch (e) {
      console.error('Auto-detection error:', e);
    } finally {
      setAutoDetecting(false);
    }
  };

  const generateSuggestionsForIntention = async (intention) => {
    const config = INTENTION_CONFIG[intention];
    if (!config) return;

    setLoading(true);
    try {
      const contextMessages = messages.slice(-5).map(m => 
        `${m.est_operateur ? 'Nous' : 'Client'}: ${m.contenu}`
      ).join('\n');

      const fullPrompt = `Tu es un assistant IA pour l'Imprimerie Ogooué au Gabon.

Client: ${conversation.client_nom}
Intention détectée: ${config.label}

Derniers messages:
${contextMessages}

${config.prompt}

Génère 3 réponses différentes (courte, moyenne, détaillée). Format JSON uniquement.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  text: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
      setQuickActions(config.actions || []);

      // Log interaction
      await base44.entities.InteractionIA.create({
        conversation_id: conversation.id,
        client_nom: conversation.client_nom,
        intention_detectee: intention,
        suggestion_generee: JSON.stringify(result.suggestions),
        action_suggeree: config.actions?.join(', '),
        utilisee: false,
        contexte: contextMessages
      });

      toast.success('Suggestions générées automatiquement');
    } catch (e) {
      toast.error('Erreur lors de la génération');
      console.error('AI generation error:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateCustomSuggestions = async () => {
    if (!conversation || !messages || messages.length === 0) {
      toast.error('Pas assez de contexte');
      return;
    }

    setLoading(true);
    try {
      const contextMessages = messages.slice(-5).map(m => 
        `${m.est_operateur ? 'Nous' : 'Client'}: ${m.contenu}`
      ).join('\n');

      const prompt = `Tu es un assistant IA pour l'Imprimerie Ogooué au Gabon.

Client: ${conversation.client_nom}

Derniers messages:
${contextMessages}

Génère 3 réponses professionnelles adaptées au contexte. Format JSON uniquement.`;

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
                  type: { type: "string" },
                  text: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);

      // Log interaction
      await base44.entities.InteractionIA.create({
        conversation_id: conversation.id,
        client_nom: conversation.client_nom,
        suggestion_generee: JSON.stringify(result.suggestions),
        utilisee: false,
        contexte: contextMessages
      });

      toast.success('Nouvelles suggestions générées');
    } catch (e) {
      toast.error('Erreur lors de la génération');
      console.error('AI generation error:', e);
    } finally {
      setLoading(false);
    }
  };

  const copySuggestion = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Copié');
  };

  const useSuggestion = async (text, index) => {
    onUseSuggestion(text);
    
    // Update interaction as used
    try {
      const interactions = await base44.entities.InteractionIA.filter({
        conversation_id: conversation.id
      }, '-created_date', 1);
      
      if (interactions.length > 0) {
        await base44.entities.InteractionIA.update(interactions[0].id, {
          utilisee: true
        });
      }
    } catch (e) {
      console.error('Error updating interaction:', e);
    }
  };

  const handleQuickAction = async (action) => {
    if (action === 'Envoyer catalogue' || action.includes('catalogue')) {
      // Propose d'envoyer le catalogue
      const message = `Bonjour ${conversation.client_nom},\n\nVoici notre catalogue de produits. N'hésitez pas si vous avez des questions !\n\n[Le catalogue sera joint automatiquement]`;
      onUseSuggestion(message);
      await logInteraction('action_rapide', {
        action: 'Envoi catalogue',
        contenu_genere: message,
        utilise: true
      });
      toast.success('Catalogue prêt à être envoyé');
    } else {
      toast.info(`Action "${action}" effectuée`);
      await logInteraction('action_rapide', {
        action: action,
        utilise: true
      });
    }
  };

  if (!conversation) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Assistant IA Imprimerie
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Sélectionnez une conversation</p>
        </CardContent>
      </Card>
    );
  }

  const intentionConfig = detectedIntention && INTENTION_CONFIG[detectedIntention];
  const IntentionIcon = intentionConfig?.icon || Sparkles;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Assistant IA Imprimerie
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Auto-detected Intention */}
        {autoDetecting ? (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <p className="text-xs text-blue-900">Analyse de l'intention...</p>
          </div>
        ) : intentionConfig ? (
          <div className={`p-3 border rounded-lg ${intentionConfig.bgColor}`}>
            <div className="flex items-center gap-2 mb-2">
              <IntentionIcon className={`w-4 h-4 ${intentionConfig.color}`} />
              <p className="text-xs font-semibold text-slate-900">Intention détectée:</p>
            </div>
            <Badge className={`${intentionConfig.color} bg-white`}>
              {intentionConfig.label}
            </Badge>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-600">Intention: Non détectée</p>
          </div>
        )}

        {/* Quick Actions */}
        {quickActions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Actions rapides suggérées:</p>
            <div className="grid grid-cols-1 gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action)}
                  className="justify-start"
                >
                  <Zap className="w-3 h-3 mr-2 text-amber-500" />
                  {action}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Generate Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={generateCustomSuggestions}
            disabled={loading || autoDetecting}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-2" />
                Régénérer
              </>
            )}
          </Button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Réponses suggérées:</p>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 bg-slate-50 border rounded-lg hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {suggestion.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copySuggestion(suggestion.text, index)}
                  >
                    {copiedIndex === index ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {suggestion.text}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => useSuggestion(suggestion.text, index)}
                >
                  Utiliser cette réponse
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {loading && suggestions.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}