import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  MessageCircle, 
  Facebook, 
  Instagram, 
  Filter,
  Settings,
  Plus,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';
import ConversationList from '@/components/messagerie/ConversationList';
import ConversationView from '@/components/messagerie/ConversationView';
import AiAssistant from '@/components/messagerie/AiAssistant';

const PLATFORM_FILTERS = [
  { id: 'all', label: 'Tous', icon: Filter },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'text-blue-600' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600' },
  { id: 'interne', label: 'Interne', icon: Mail, color: 'text-slate-600' }
];

export default function Messagerie() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    loadData();
    // Simuler le temps réel avec un refresh toutes les 10s
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [conversationsData, templatesData, userData] = await Promise.all([
        base44.entities.ConversationClient.list('-dernier_message_date').catch(() => []),
        base44.entities.TemplateReponse.filter({ actif: true }).catch(() => []),
        base44.auth.me()
      ]);
      setConversations(conversationsData);
      setTemplates(templatesData);
      setUser(userData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const messagesData = await base44.entities.MessageCanal.filter(
        { conversation_id: conversationId },
        'created_date'
      );
      setMessages(messagesData);
    } catch (e) {
      console.error('Error loading messages:', e);
      setMessages([]);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    
    // Marquer comme lu
    if (conversation.non_lu) {
      await base44.entities.ConversationClient.update(conversation.id, { non_lu: false });
      loadData();
    }
  };

  const handleSendMessage = async (text) => {
    if (!selectedConversation || !text.trim()) return;

    const messageData = {
      conversation_id: selectedConversation.id,
      plateforme: selectedConversation.plateforme,
      expediteur: user.email,
      expediteur_nom: user.full_name || user.email,
      destinataire: selectedConversation.client_nom,
      contenu: text,
      est_operateur: true,
      lu: true
    };

    await base44.entities.MessageCanal.create(messageData);

    // Update conversation
    await base44.entities.ConversationClient.update(selectedConversation.id, {
      dernier_message: text,
      dernier_message_date: new Date().toISOString(),
      statut: 'en_cours'
    });

    loadMessages(selectedConversation.id);
    loadData();
    toast.success('Message envoyé');
  };

  const handleRequestAi = async () => {
    if (!selectedConversation) return null;

    const contextMessages = messages.slice(-5).map(m => 
      `${m.est_operateur ? 'Nous' : 'Client'}: ${m.contenu}`
    ).join('\n');

    const prompt = `Tu es un assistant pour l'Imprimerie Ogooué.

Contexte conversation:
${contextMessages}

Génère UNE réponse professionnelle et adaptée pour ce client. Court, précis, avec appel à l'action.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      return result;
    } catch (e) {
      toast.error('Erreur IA');
      return null;
    }
  };

  const handleUseTemplate = (template) => {
    // Remplacer les variables
    let content = template.contenu;
    if (selectedConversation) {
      content = content.replace('{client_nom}', selectedConversation.client_nom);
    }
    return content;
  };

  const initializeData = async () => {
    // Créer des templates par défaut
    const defaultTemplates = [
      {
        titre: 'Bienvenue',
        categorie: 'bienvenue',
        contenu: 'Bonjour {client_nom},\n\nMerci de nous avoir contactés ! Nous sommes l\'Imprimerie Ogooué, spécialiste de l\'impression à Libreville.\n\nComment pouvons-nous vous aider ?',
        actif: true
      },
      {
        titre: 'Demande de devis',
        categorie: 'devis',
        contenu: 'Bonjour {client_nom},\n\nPour établir votre devis, j\'aurais besoin de quelques informations :\n- Type de support (flyers, t-shirts, banderoles, etc.)\n- Quantité souhaitée\n- Format/taille\n- Délai souhaité\n\nÀ très vite !',
        actif: true
      },
      {
        titre: 'Confirmation commande',
        categorie: 'commande',
        contenu: 'Parfait {client_nom} !\n\nVotre commande est bien notée. Nous démarrons la production et vous tenons informé(e) de l\'avancement.\n\nDélai estimé : 3-5 jours ouvrés.\n\nMerci de votre confiance !',
        actif: true
      },
      {
        titre: 'Demande visuel',
        categorie: 'information',
        contenu: 'Bonjour {client_nom},\n\nPour avancer sur votre projet, pourriez-vous nous envoyer :\n- Votre logo ou visuel\n- Vos préférences de couleurs\n- Texte à intégrer\n\nFormat accepté : PNG, JPG, PDF, AI',
        actif: true
      }
    ];

    for (const template of defaultTemplates) {
      const exists = templates.find(t => t.titre === template.titre);
      if (!exists) {
        await base44.entities.TemplateReponse.create(template);
      }
    }

    // Créer une conversation de démonstration
    const demoConvExists = conversations.find(c => c.client_nom === 'Client Démo');
    if (!demoConvExists) {
      const demoConv = await base44.entities.ConversationClient.create({
        client_nom: 'Client Démo',
        plateforme: 'whatsapp',
        statut: 'nouveau',
        dernier_message: 'Bonjour, je souhaite des informations sur vos t-shirts personnalisés',
        dernier_message_date: new Date().toISOString(),
        non_lu: true,
        intention_detectee: 'devis'
      });

      await base44.entities.MessageCanal.create({
        conversation_id: demoConv.id,
        plateforme: 'whatsapp',
        expediteur: 'demo_client',
        expediteur_nom: 'Client Démo',
        contenu: 'Bonjour, je souhaite des informations sur vos t-shirts personnalisés',
        est_operateur: false
      });
    }

    toast.success('Données initialisées');
    loadData();
  };

  // Filtering
  const filteredConversations = conversations.filter(conv => {
    if (platformFilter !== 'all' && conv.plateforme !== platformFilter) return false;
    if (statusFilter !== 'all' && conv.statut !== statusFilter) return false;
    if (showUnreadOnly && !conv.non_lu) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return conv.client_nom?.toLowerCase().includes(search) ||
             conv.dernier_message?.toLowerCase().includes(search);
    }
    return true;
  });

  const unreadCount = conversations.filter(c => c.non_lu).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageCircle className="w-7 h-7 text-blue-600" />
            Messagerie Omnicanale
          </h1>
          <p className="text-slate-500">Centralisez toutes vos conversations clients</p>
        </div>
        <div className="flex gap-2">
          {conversations.length === 0 && (
            <Button variant="outline" onClick={initializeData}>
              <Plus className="w-4 h-4 mr-2" />
              Initialiser
            </Button>
          )}
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Paramètres
          </Button>
        </div>
      </div>

      {/* Platform Filters */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {PLATFORM_FILTERS.map(platform => {
              const Icon = platform.icon;
              const isActive = platformFilter === platform.id;
              const count = platform.id === 'all' 
                ? conversations.length 
                : conversations.filter(c => c.plateforme === platform.id).length;

              return (
                <Button
                  key={platform.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlatformFilter(platform.id)}
                  className={isActive ? 'bg-blue-600' : ''}
                >
                  <Icon className={`w-4 h-4 mr-2 ${platform.color || ''}`} />
                  {platform.label}
                  {count > 0 && (
                    <Badge className="ml-2 bg-slate-200 text-slate-700">{count}</Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-4 space-y-4">
          {/* Search & Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="nouveau">Nouveau</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="en_attente">En attente</SelectItem>
                  <SelectItem value="clos">Clos</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showUnreadOnly ? 'default' : 'outline'}
                onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                className={showUnreadOnly ? 'bg-blue-600' : ''}
              >
                Non lus {unreadCount > 0 && `(${unreadCount})`}
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
            <ConversationList
              conversations={filteredConversations}
              selectedConversation={selectedConversation}
              onSelect={handleSelectConversation}
            />
          </div>
        </div>

        {/* Conversation View */}
        <div className="lg:col-span-5">
          <div className="h-[calc(100vh-300px)]">
            <ConversationView
              conversation={selectedConversation}
              messages={messages}
              onSendMessage={handleSendMessage}
              onRequestAi={handleRequestAi}
              templates={templates}
              onUseTemplate={handleUseTemplate}
            />
          </div>
        </div>

        {/* AI Assistant */}
        <div className="lg:col-span-3">
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <AiAssistant
              conversation={selectedConversation}
              messages={messages}
              onUseSuggestion={(text) => {
                if (selectedConversation) {
                  handleSendMessage(text);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}