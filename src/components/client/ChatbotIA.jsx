import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  User, 
  Phone, 
  Mail,
  Loader2,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import moment from 'moment';

export default function ChatbotIA({ client, commandes = [], demandes = [], factures = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Bonjour ${client?.nom || ''} ! 👋\n\nJe suis l'assistant virtuel d'Imprimerie Ogooué. Je peux vous aider avec:\n\n✓ Informations sur nos produits\n✓ Statut de vos commandes\n✓ Suivi de vos demandes\n✓ Questions sur nos services\n\nComment puis-je vous aider aujourd'hui ?`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const buildContext = () => {
    const context = {
      client: {
        nom: client?.nom,
        email: client?.email,
        telephone: client?.telephone
      },
      commandes: commandes.map(c => ({
        reference: c.reference_commande,
        statut: c.statut,
        type: c.type_prestation,
        date: c.date_commande,
        montant: c.montant_total
      })),
      demandes: demandes.map(d => ({
        titre: d.titre,
        statut: d.statut,
        type: d.type_demande,
        date: d.created_date
      })),
      factures: factures.map(f => ({
        numero: f.numero,
        statut: f.statut,
        montant: f.total,
        echeance: f.date_echeance
      }))
    };

    return context;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const context = buildContext();
      
      const prompt = `Tu es l'assistant virtuel de l'Imprimerie Ogooué à Moanda, Gabon.

INFORMATIONS CLIENT:
${JSON.stringify(context, null, 2)}

SERVICES ET PRODUITS:
- Impression & Saisie (flyers, cartes de visite, documents)
- Photos ID et portraits
- Textile personnalisé (t-shirts, polos, casquettes)
- Calendriers & Tampons
- Reliure & Plastification
- Signalétique (banderoles, kakemonos, panneaux)
- EPI & Sécurité (combinaisons, gilets)
- Marketing (badges, stylos, carnets)

CONTACT:
Tel: +241 060 44 46 34 / 074 42 41 42
Email: imprimerieogooue@gmail.com
Adresse: Carrefour Fina en Face de Finam, Moanda, Gabon
WhatsApp: https://wa.me/message/7WVKSVB3RHOUA1

INSTRUCTIONS:
- Réponds de manière professionnelle, courtoise et concise
- Si le client demande le statut d'une commande/demande, utilise les données fournies
- Pour les questions techniques complexes, suggère de contacter l'équipe
- Toujours proposer le contact WhatsApp pour une réponse rapide
- Si tu ne sais pas, admets-le et propose de contacter l'équipe
- Réponds en français

QUESTION DU CLIENT:
${userMessage}

Réponds de manière claire et utile:`;

      const response = await base44.integrations.Core.InvokeLLM({ 
        prompt,
        add_context_from_internet: false
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Désolé, je rencontre un problème technique. Veuillez contacter notre équipe directement:\n\n📞 +241 060 44 46 34\n📧 imprimerieogooue@gmail.com'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEscalate = (type) => {
    if (type === 'whatsapp') {
      window.open('https://wa.me/message/7WVKSVB3RHOUA1', '_blank');
      toast.success('Ouverture de WhatsApp...');
    } else if (type === 'phone') {
      window.location.href = 'tel:+241060444634';
    } else if (type === 'email') {
      window.location.href = 'mailto:imprimerieogooue@gmail.com';
    }
  };

  const quickQuestions = [
    'Quels sont vos délais de livraison ?',
    'Comment passer une commande ?',
    'Quels sont vos tarifs ?',
    'Où êtes-vous situés ?'
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-40 w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-300 animate-bounce"
        aria-label="Ouvrir le chat"
      >
        <Bot className="w-7 h-7 md:w-8 md:h-8 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
      </button>
    );
  }

  return (
    <div className={`fixed ${isMinimized ? 'bottom-4 right-4' : 'bottom-4 right-4 md:bottom-6 md:right-6'} z-50 transition-all duration-300`}>
      <Card className={`border-0 shadow-2xl ${isMinimized ? 'w-80' : 'w-[90vw] md:w-96 h-[80vh] md:h-[600px]'}`}>
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Bot className="w-8 h-8" />
                <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <CardTitle className="text-base font-bold">Assistant IA</CardTitle>
                <p className="text-xs text-indigo-100">En ligne • Répond en 2s</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            {/* Messages */}
            <CardContent className="p-4 h-[calc(80vh-200px)] md:h-[400px] overflow-y-auto space-y-4 bg-slate-50">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </CardContent>

            {/* Quick Questions */}
            {messages.length === 1 && (
              <div className="px-4 py-2 bg-white border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Questions rapides:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setInputMessage(q);
                        setTimeout(() => handleSendMessage(), 100);
                      }}
                      className="text-xs"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200 rounded-b-lg">
              <div className="flex gap-2 mb-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Écrivez votre message..."
                  disabled={isTyping}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Escalation buttons */}
              <div className="flex items-center gap-2 pt-2 border-t">
                <p className="text-xs text-slate-500">Besoin d'aide ?</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEscalate('whatsapp')}
                  className="text-xs text-green-600 hover:text-green-700"
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEscalate('phone')}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  <Phone className="w-3 h-3 mr-1" />
                  Appeler
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}