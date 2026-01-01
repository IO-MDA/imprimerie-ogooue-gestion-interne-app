import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, Check, FileText, Send, AlertCircle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function AiAssistant({ conversation, messages, onUseSuggestion }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [autoDetected, setAutoDetected] = useState(false);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ total: 0, used: 0, actions: 0 });

  useEffect(() => {
    loadUser();
    if (conversation) {
      loadStats();
    }
  }, [conversation]);

  useEffect(() => {
    // Auto-détection et suggestions automatiques quand conversation change
    if (conversation && messages.length > 0 && !autoDetected) {
      autoGenerateSuggestions();
    }
  }, [conversation, messages]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (e) {
      console.error('Error loading user:', e);
    }
  };

  const loadStats = async () => {
    try {
      const interactions = await base44.entities.InteractionIA.filter({ 
        conversation_id: conversation.id 
      });
      setStats({
        total: interactions.length,
        used: interactions.filter(i => i.utilise).length,
        actions: interactions.filter(i => i.type_interaction === 'action_rapide').length
      });
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  };

  const logInteraction = async (type, data = {}) => {
    if (!conversation || !user) return;
    
    try {
      await base44.entities.InteractionIA.create({
        conversation_id: conversation.id,
        type_interaction: type,
        intention_detectee: conversation.intention_detectee,
        operateur: user.email,
        operateur_nom: user.full_name || user.email,
        ...data
      });
      loadStats();
    } catch (e) {
      console.error('Error logging interaction:', e);
    }
  };

  const autoGenerateSuggestions = async () => {
    if (!conversation || !messages || messages.length === 0) return;
    
    setAutoDetected(true);
    setLoading(true);
    try {
      const contextPrompt = `Tu es un assistant IA pour l'Imprimerie Ogooué au Gabon.

Client: ${conversation.client_nom}
Plateforme: ${conversation.plateforme}
Intention détectée: ${conversation.intention_detectee || 'non définie'}

Derniers messages:
${messages.slice(-5).map(m => `${m.est_operateur ? 'Nous' : 'Client'}: ${m.contenu}`).join('\n')}

Génère 3 réponses professionnelles et adaptées pour ce contexte d'imprimerie (flyers, t-shirts, banderoles, mugs, etc.). Chaque réponse doit être courte, professionnelle et inclure:
- Une salutation appropriée
- Une réponse au besoin du client
- Une proposition de valeur
- Un appel à l'action

Format: Retourne uniquement un objet JSON avec un tableau "suggestions" contenant 3 objets {type, text}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: contextPrompt,
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

      const generatedSuggestions = result.suggestions || [];
      setSuggestions(generatedSuggestions);
      
      // Log chaque suggestion générée
      for (const suggestion of generatedSuggestions) {
        await logInteraction('suggestion_generee', {
          contenu_genere: suggestion.text,
          utilise: false
        });
      }
    } catch (e) {
      console.error('AI generation error:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateSuggestions = async () => {
    setAutoDetected(true);
    await autoGenerateSuggestions();
  };

  const copySuggestion = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('Copié');
  };

  const handleUseSuggestion = async (suggestion) => {
    onUseSuggestion(suggestion.text);
    await logInteraction('suggestion_utilisee', {
      contenu_genere: suggestion.text,
      utilise: true
    });
  };

  const handleQuickAction = async (action, message) => {
    onUseSuggestion(message);
    await logInteraction('action_rapide', {
      action: action,
      contenu_genere: message,
      utilise: true
    });
    toast.success(`Action "${action}" exécutée`);
  };

  const getQuickActions = () => {
    const intention = conversation?.intention_detectee;
    
    const actions = {
      devis: [
        {
          label: 'Demander détails',
          icon: FileText,
          message: `Bonjour ${conversation.client_nom},\n\nPour établir votre devis, j'aurais besoin de quelques informations :\n- Type de support souhaité\n- Quantité\n- Format/dimensions\n- Délai souhaité\n\nMerci !`
        },
        {
          label: 'Envoyer tarifs',
          icon: Send,
          message: `Bonjour ${conversation.client_nom},\n\nVoici nos tarifs indicatifs. Je reste à votre disposition pour un devis personnalisé selon vos besoins.\n\nN'hésitez pas !`
        }
      ],
      commande: [
        {
          label: 'Confirmer réception',
          icon: Check,
          message: `Parfait ${conversation.client_nom} !\n\nVotre commande est bien notée. Nous démarrons la production et vous tenons informé(e) de l'avancement.\n\nDélai estimé : 3-5 jours ouvrés.`
        },
        {
          label: 'Demander visuel',
          icon: FileText,
          message: `Bonjour ${conversation.client_nom},\n\nPour avancer sur votre commande, pourriez-vous nous envoyer :\n- Votre logo/visuel\n- Vos préférences de couleurs\n- Texte à intégrer\n\nFormat accepté : PNG, JPG, PDF, AI`
        }
      ],
      reclamation: [
        {
          label: 'Excuses et solution',
          icon: AlertCircle,
          message: `Bonjour ${conversation.client_nom},\n\nNous sommes vraiment désolés pour ce désagrément. Nous prenons votre réclamation très au sérieux.\n\nPouvez-vous nous donner plus de détails pour que nous puissions résoudre cela rapidement ?`
        }
      ],
      information: [
        {
          label: 'Détails services',
          icon: TrendingUp,
          message: `Bonjour ${conversation.client_nom},\n\nNous proposons :\n- Impression (flyers, cartes, affiches)\n- Personnalisation textile (t-shirts, casquettes)\n- Signalétique (banderoles, panneaux)\n- Objets publicitaires (mugs, porte-clés)\n\nQue recherchez-vous exactement ?`
        }
      ]
    };

    return actions[intention] || [];
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Assistant IA Imprimerie
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!conversation ? (
          <div className="text-center py-8 text-slate-500">
            <p>Sélectionnez une conversation</p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 rounded-lg text-center">
                <p className="text-xs text-slate-500">Suggestions</p>
                <p className="text-lg font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg text-center">
                <p className="text-xs text-green-600">Utilisées</p>
                <p className="text-lg font-bold text-green-700">{stats.used}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-center">
                <p className="text-xs text-blue-600">Actions</p>
                <p className="text-lg font-bold text-blue-700">{stats.actions}</p>
              </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">Intention détectée:</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-600">
                  {conversation.intention_detectee || 'Non défini'}
                </Badge>
                {conversation.tags?.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            {getQuickActions().length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Actions rapides:</p>
                <div className="grid grid-cols-2 gap-2">
                  {getQuickActions().map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action.label, action.message)}
                        className="h-auto py-2 px-3 text-xs flex flex-col items-center gap-1"
                      >
                        <Icon className="w-4 h-4" />
                        {action.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={generateSuggestions}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {autoDetected ? 'Régénérer' : 'Générer des suggestions'}
                </>
              )}
            </Button>

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
                      onClick={() => handleUseSuggestion(suggestion)}
                    >
                      Utiliser cette réponse
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}