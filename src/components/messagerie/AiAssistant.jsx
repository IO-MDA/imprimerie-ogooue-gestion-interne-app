import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function AiAssistant({ conversation, messages, onUseSuggestion }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      // Simuler l'analyse IA
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

      setSuggestions(result.suggestions || []);
      toast.success('Suggestions générées');
    } catch (e) {
      toast.error('Erreur lors de la génération');
      console.error(e);
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
            {/* Info */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-medium text-blue-900 mb-1">Contexte détecté:</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-600">
                  {conversation.intention_detectee || 'Non défini'}
                </Badge>
                {conversation.tags?.map(tag => (
                  <Badge key={tag} variant="outline">{tag}</Badge>
                ))}
              </div>
            </div>

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
                  Générer des suggestions
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
                      onClick={() => onUseSuggestion(suggestion.text)}
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