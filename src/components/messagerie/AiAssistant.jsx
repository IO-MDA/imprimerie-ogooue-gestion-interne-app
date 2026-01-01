import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AiAssistant({ conversation, messages, onUseSuggestion }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [copied, setCopied] = useState(false);

  const generateSuggestion = async () => {
    setLoading(true);
    try {
      const context = messages.slice(-5).map(m => 
        `${m.est_operateur ? 'Agent' : 'Client'}: ${m.contenu}`
      ).join('\n');

      const prompt = `Tu es un assistant IA pour Imprimerie Ogooué à Libreville, Gabon.

Contexte de la conversation:
${context}

Client: ${conversation.client_nom}
Plateforme: ${conversation.plateforme}
${conversation.intention_detectee ? `Intention détectée: ${conversation.intention_detectee}` : ''}

Mission:
1. Analyse le contexte et identifie l'intention du client (devis, commande, réclamation, suivi, information)
2. Propose une réponse professionnelle, courtoise et adaptée aux services d'imprimerie
3. Suggère des questions de clarification si nécessaire (quantité, format, délais, etc.)
4. Reste bref et efficace

Notre expertise: impression textile (t-shirts, polos, casquettes), signalisation (banderoles, panneaux), papeterie (cartes de visite, flyers), objets publicitaires (mugs, calendriers), et services d'impression générale.

Fournis une réponse prête à envoyer.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      
      setSuggestion(result);
      toast.success('Suggestion générée');
    } catch (e) {
      toast.error('Erreur lors de la génération');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copié dans le presse-papiers');
  };

  const handleUse = () => {
    onUseSuggestion(suggestion);
    toast.success('Suggestion ajoutée au message');
  };

  return (
    <Card className="border-0 shadow-lg shadow-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Assistant IA Imprimerie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!suggestion ? (
          <Button
            onClick={generateSuggestion}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Générer une suggestion
              </>
            )}
          </Button>
        ) : (
          <>
            <div className="bg-white p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{suggestion}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copier
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleUse}
                className="flex-1 bg-purple-600"
              >
                Utiliser
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuggestion(null)}
              >
                Nouvelle
              </Button>
            </div>
          </>
        )}

        {conversation.intention_detectee && (
          <div className="pt-3 border-t border-purple-200">
            <p className="text-xs text-purple-700 font-medium mb-1">Intention détectée:</p>
            <Badge className="bg-purple-100 text-purple-800 capitalize">
              {conversation.intention_detectee}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}