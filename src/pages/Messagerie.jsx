import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  MessageSquare,
  Send,
  ArrowLeft,
  Loader2,
  X,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import PlatformFilters from '@/components/messagerie/PlatformFilters';
import ConversationList from '@/components/messagerie/ConversationList';
import MessageThread from '@/components/messagerie/MessageThread';
import AiAssistant from '@/components/messagerie/AiAssistant';
import QuickActions from '@/components/messagerie/QuickActions';

export default function Messagerie() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [clients, setClients] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [newConvData, setNewConvData] = useState({
    client_id: '',
    client_nom: '',
    plateforme: 'interne'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadData = async () => {
    setIsLoading(true);
    const [conversationsData, templatesData, clientsData, userData] = await Promise.all([
      base44.entities.ConversationClient.list('-dernier_message_date'),
      base44.entities.TemplateReponse.filter({ actif: true }),
      base44.entities.Client.list(),
      base44.auth.me()
    ]);
    setConversations(conversationsData);
    setTemplates(templatesData);
    setClients(clientsData);
    setUser(userData);
    setIsLoading(false);
  };

  const loadMessages = async (conversationId) => {
    const messagesData = await base44.entities.MessageCanal.filter(
      { conversation_id: conversationId },
      'created_date'
    );
    setMessages(messagesData);

    // Marquer comme lu
    const conv = conversations.find(c => c.id === conversationId);
    if (conv && conv.non_lu) {
      await base44.entities.ConversationClient.update(conversationId, { non_lu: false });
      loadData();
    }
  };

  const detectIntention = async (message) => {
    try {
      const prompt = `Analyse ce message client d'une imprimerie et identifie l'intention principale:
      
"${message}"

Réponds uniquement par un seul mot parmi: devis, commande, reclamation, suivi, information, autre`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      return result.toLowerCase().trim();
    } catch (e) {
      return 'autre';
    }
  };

  const handleSendMessage = async (isAiGenerated = false) => {
    if (!replyText.trim() || !selectedConversation) return;

    setSending(true);
    try {
      // Créer le message
      await base44.entities.MessageCanal.create({
        conversation_id: selectedConversation.id,
        plateforme: selectedConversation.plateforme,
        expediteur: user.email,
        expediteur_nom: user.full_name || user.email,
        contenu: replyText,
        est_operateur: true,
        genere_par_ia: isAiGenerated
      });

      // Mettre à jour la conversation
      await base44.entities.ConversationClient.update(selectedConversation.id, {
        dernier_message: replyText,
        dernier_message_date: new Date().toISOString(),
        statut: 'en_cours'
      });

      toast.success('Message envoyé');
      setReplyText('');
      loadMessages(selectedConversation.id);
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = async () => {
    if (!newConvData.client_nom || !newConvData.plateforme) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    try {
      const conv = await base44.entities.ConversationClient.create({
        ...newConvData,
        statut: 'nouveau',
        agent_assigne: user.email,
        agent_nom: user.full_name || user.email,
        non_lu: false
      });

      toast.success('Conversation créée');
      setShowNewConversation(false);
      setNewConvData({ client_id: '', client_nom: '', plateforme: 'interne' });
      loadData();
      setSelectedConversation(conv);
    } catch (e) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleQuickAction = async (actionId) => {
    if (actionId === 'devis_ia') {
      await generateDevisWithAI();
    } else if (actionId === 'facture_ia') {
      await generateFactureWithAI();
    } else {
      const actions = {
        devis: 'Bonjour, pour établir un devis précis, j\'aurais besoin de quelques informations:\n- Type de support souhaité\n- Quantité\n- Format/dimensions\n- Délai souhaité\n\nJe vous prépare un devis dans les meilleurs délais.',
        visuel: 'Bonjour, pourriez-vous m\'envoyer le visuel que vous souhaitez imprimer ? (logo, design, photo)\nFormats acceptés: PNG, JPG, PDF, AI',
        confirmer: 'Bonjour, votre commande est confirmée !\nNous démarrons la production dans les plus brefs délais.\nVous serez notifié dès que votre commande sera prête.',
        delai: 'Bonjour, le délai de réalisation pour votre commande est estimé à:\n- Production: X jours ouvrés\n- Livraison: +X jours\n\nNous vous tiendrons informé de l\'avancement.'
      };
      setReplyText(actions[actionId] || '');
    }
  };

  const generateDevisWithAI = async () => {
    if (!selectedConversation) return;
    
    setSending(true);
    try {
      const context = messages.slice(-10).map(m => 
        `${m.est_operateur ? 'Agent' : 'Client'}: ${m.contenu}`
      ).join('\n');

      const prompt = `Tu es un assistant commercial pour Imprimerie Ogooué à Moanda, Gabon.

Contexte de la conversation:
${context}

Mission: Génère un devis détaillé en JSON basé sur la conversation. Analyse les besoins du client et propose:
- Les produits/services appropriés (t-shirts, flyers, banderoles, mugs, etc.)
- Quantités estimées
- Prix unitaires réalistes pour le marché gabonais
- Prix totaux

Format JSON requis:
{
  "client_nom": "${selectedConversation.client_nom}",
  "lignes": [
    {"description": "Nom du produit/service", "quantite": 10, "prix_unitaire": 5000, "total": 50000}
  ],
  "notes": "Description du devis"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            client_nom: { type: "string" },
            lignes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantite: { type: "number" },
                  prix_unitaire: { type: "number" },
                  total: { type: "number" }
                }
              }
            },
            notes: { type: "string" }
          }
        }
      });

      // Créer le devis
      const devisData = {
        ...result,
        client_id: selectedConversation.client_id,
        date_emission: new Date().toISOString().split('T')[0],
        date_validite: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        statut: 'brouillon',
        sous_total: result.lignes.reduce((sum, l) => sum + l.total, 0),
        total: result.lignes.reduce((sum, l) => sum + l.total, 0),
        numero: `DEV${Date.now()}`
      };

      const devis = await base44.entities.Devis.create(devisData);

      // Générer le PDF
      const { generateQuotePDF } = await import('@/utils/pdfGenerator');
      const pdf = await generateQuotePDF(devisData);
      const pdfBlob = pdf.output('blob');

      // Upload le PDF
      const file = new File([pdfBlob], `devis_${devis.numero}.pdf`, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Envoyer par email
      await base44.integrations.Core.SendEmail({
        from_name: 'Imprimerie Ogooué',
        to: selectedConversation.client_email || 'client@email.com',
        subject: `Devis ${devis.numero} - Imprimerie Ogooué`,
        body: `Bonjour ${selectedConversation.client_nom},\n\nVeuillez trouver ci-joint votre devis.\n\nLien: ${file_url}\n\nCordialement,\nImprimerie Ogooué`
      });

      toast.success('Devis généré et envoyé par email');
      setReplyText(`Bonjour, je viens de vous envoyer le devis n°${devis.numero} par email. N'hésitez pas si vous avez des questions !`);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération du devis');
    } finally {
      setSending(false);
    }
  };

  const generateFactureWithAI = async () => {
    if (!selectedConversation) return;
    
    setSending(true);
    try {
      const context = messages.slice(-10).map(m => 
        `${m.est_operateur ? 'Agent' : 'Client'}: ${m.contenu}`
      ).join('\n');

      const prompt = `Tu es un assistant commercial pour Imprimerie Ogooué à Moanda, Gabon.

Contexte de la conversation:
${context}

Mission: Génère une facture détaillée en JSON basé sur la commande confirmée. Inclus:
- Les produits/services fournis
- Quantités exactes
- Prix unitaires
- Prix totaux

Format JSON requis:
{
  "client_nom": "${selectedConversation.client_nom}",
  "lignes": [
    {"description": "Nom du produit/service", "quantite": 10, "prix_unitaire": 5000, "total": 50000}
  ],
  "notes": "Description de la facture"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            client_nom: { type: "string" },
            lignes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  quantite: { type: "number" },
                  prix_unitaire: { type: "number" },
                  total: { type: "number" }
                }
              }
            },
            notes: { type: "string" }
          }
        }
      });

      // Créer la facture
      const factureData = {
        ...result,
        client_id: selectedConversation.client_id,
        date_emission: new Date().toISOString().split('T')[0],
        date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        statut: 'envoyee',
        sous_total: result.lignes.reduce((sum, l) => sum + l.total, 0),
        total: result.lignes.reduce((sum, l) => sum + l.total, 0),
        numero: `FACT${Date.now()}`
      };

      const facture = await base44.entities.Facture.create(factureData);

      // Générer le PDF
      const { generateInvoicePDF } = await import('@/utils/pdfGenerator');
      const pdf = await generateInvoicePDF(factureData);
      const pdfBlob = pdf.output('blob');

      // Upload le PDF
      const file = new File([pdfBlob], `facture_${facture.numero}.pdf`, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Envoyer par email
      await base44.integrations.Core.SendEmail({
        from_name: 'Imprimerie Ogooué',
        to: selectedConversation.client_email || 'client@email.com',
        subject: `Facture ${facture.numero} - Imprimerie Ogooué`,
        body: `Bonjour ${selectedConversation.client_nom},\n\nVeuillez trouver ci-joint votre facture.\n\nLien: ${file_url}\n\nCordialement,\nImprimerie Ogooué`
      });

      toast.success('Facture générée et envoyée par email');
      setReplyText(`Bonjour, je viens de vous envoyer la facture n°${facture.numero} par email. Merci pour votre confiance !`);
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération de la facture');
    } finally {
      setSending(false);
    }
  };

  const handleUseTemplate = (template) => {
    setReplyText(template.contenu);
    setShowTemplates(false);
    toast.success('Template ajouté');
  };

  // Filtrage des conversations
  const filteredConversations = conversations.filter(conv => {
    if (platformFilter !== 'all' && conv.plateforme !== platformFilter) return false;
    if (statusFilter !== 'all' && conv.statut !== statusFilter) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return conv.client_nom?.toLowerCase().includes(search) ||
             conv.dernier_message?.toLowerCase().includes(search);
    }
    return true;
  });

  // Compter les conversations par plateforme
  const platformCounts = {
    all: conversations.length,
    whatsapp: conversations.filter(c => c.plateforme === 'whatsapp').length,
    facebook: conversations.filter(c => c.plateforme === 'facebook').length,
    instagram: conversations.filter(c => c.plateforme === 'instagram').length,
    interne: conversations.filter(c => c.plateforme === 'interne').length
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Messagerie Omnicanale</h1>
          <p className="text-slate-500">Centralisez toutes vos communications clients</p>
        </div>
        <Button 
          onClick={() => setShowNewConversation(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle conversation
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <PlatformFilters
          selected={platformFilter}
          onSelect={setPlatformFilter}
          counts={platformCounts}
        />

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Rechercher une conversation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="nouveau">Nouveau</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="clos">Clos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <ConversationList
            conversations={filteredConversations}
            onSelect={setSelectedConversation}
          />
        </div>

        {/* Conversation Thread */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedConversation ? (
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardContent className="py-24 text-center">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Sélectionnez une conversation</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Conversation Header */}
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedConversation(null)}
                        className="lg:hidden"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <div>
                        <h3 className="font-semibold text-slate-900">{selectedConversation.client_nom}</h3>
                        <p className="text-xs text-slate-500 capitalize">
                          {selectedConversation.plateforme} • {selectedConversation.statut.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <Select
                      value={selectedConversation.statut}
                      onValueChange={async (value) => {
                        await base44.entities.ConversationClient.update(selectedConversation.id, { statut: value });
                        loadData();
                        setSelectedConversation({ ...selectedConversation, statut: value });
                        toast.success('Statut mis à jour');
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nouveau">Nouveau</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="clos">Clos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Messages */}
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardContent className="p-6 max-h-96 overflow-y-auto">
                  <MessageThread messages={messages} />
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <QuickActions onAction={handleQuickAction} />

              {/* Reply Box */}
              <Card className="border-0 shadow-lg shadow-slate-200/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplates(true)}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Templates
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Écrivez votre réponse..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSendMessage(false)}
                      disabled={sending || !replyText.trim()}
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Envoyer
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* AI Assistant */}
              <AiAssistant
                conversation={selectedConversation}
                messages={messages}
                onUseSuggestion={(suggestion) => {
                  setReplyText(suggestion);
                  toast.success('Suggestion ajoutée');
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <Select
                value={newConvData.client_id}
                onValueChange={(value) => {
                  const client = clients.find(c => c.id === value);
                  setNewConvData(prev => ({
                    ...prev,
                    client_id: value,
                    client_nom: client?.nom || ''
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ou nouveau client</Label>
              <Input
                placeholder="Nom du client"
                value={newConvData.client_nom}
                onChange={(e) => setNewConvData(prev => ({ ...prev, client_nom: e.target.value, client_id: '' }))}
              />
            </div>
            <div>
              <Label>Plateforme</Label>
              <Select value={newConvData.plateforme} onValueChange={(v) => setNewConvData(prev => ({ ...prev, plateforme: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interne">Interne</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                Annuler
              </Button>
              <Button onClick={handleNewConversation}>
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Templates de réponse</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {templates.map(template => (
              <Card
                key={template.id}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => handleUseTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{template.titre}</p>
                    <Badge className="capitalize">{template.categorie}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{template.contenu.substring(0, 150)}...</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}