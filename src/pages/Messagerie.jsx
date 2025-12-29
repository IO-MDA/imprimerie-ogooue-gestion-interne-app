import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  MessageSquare,
  Send,
  Inbox,
  Mail,
  MailOpen,
  Clock,
  User,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function Messagerie() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState('inbox');

  const [composeData, setComposeData] = useState({
    sujet: '',
    contenu: '',
    destinataire: 'admin'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [messagesData, userData] = await Promise.all([
      base44.entities.Message.list('-created_date'),
      base44.auth.me()
    ]);
    setMessages(messagesData);
    setUser(userData);
    setIsLoading(false);
  };

  const isAdmin = user?.role === 'admin';

  const myMessages = messages.filter(m => {
    if (view === 'inbox') {
      // Messages reçus
      if (isAdmin) {
        return m.destinataire === 'admin' || m.destinataire === user?.email;
      }
      return m.destinataire === user?.email;
    } else {
      // Messages envoyés
      return m.expediteur === user?.email;
    }
  });

  const filteredMessages = myMessages.filter(m => {
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return m.sujet?.toLowerCase().includes(search) ||
             m.contenu?.toLowerCase().includes(search) ||
             m.expediteur_nom?.toLowerCase().includes(search);
    }
    return true;
  });

  const unreadCount = myMessages.filter(m => !m.lu && view === 'inbox').length;

  const handleSend = async () => {
    if (!composeData.sujet || !composeData.contenu) {
      toast.error('Veuillez remplir le sujet et le message');
      return;
    }

    await base44.entities.Message.create({
      ...composeData,
      expediteur: user?.email,
      expediteur_nom: user?.full_name || user?.email,
      lu: false
    });
    
    toast.success('Message envoyé');
    setShowCompose(false);
    setComposeData({ sujet: '', contenu: '', destinataire: 'admin' });
    loadData();
  };

  const handleRead = async (message) => {
    setSelectedMessage(message);
    if (!message.lu && message.destinataire === user?.email || (isAdmin && message.destinataire === 'admin')) {
      await base44.entities.Message.update(message.id, { lu: true });
      loadData();
    }
  };

  const handleReply = async (originalMessage) => {
    setComposeData({
      sujet: `RE: ${originalMessage.sujet}`,
      contenu: '',
      destinataire: originalMessage.expediteur,
      conversation_id: originalMessage.conversation_id || originalMessage.id
    });
    setSelectedMessage(null);
    setShowCompose(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messagerie</h1>
          <p className="text-slate-500">Communiquez avec l'équipe administrative</p>
        </div>
        <Button 
          onClick={() => setShowCompose(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau message
        </Button>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2">
        <Button 
          variant={view === 'inbox' ? 'default' : 'outline'}
          onClick={() => setView('inbox')}
          className={view === 'inbox' ? 'bg-blue-600' : ''}
        >
          <Inbox className="w-4 h-4 mr-2" />
          Boîte de réception
          {unreadCount > 0 && (
            <Badge className="ml-2 bg-red-500">{unreadCount}</Badge>
          )}
        </Button>
        <Button 
          variant={view === 'sent' ? 'default' : 'outline'}
          onClick={() => setView('sent')}
          className={view === 'sent' ? 'bg-blue-600' : ''}
        >
          <Send className="w-4 h-4 mr-2" />
          Envoyés
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input 
          placeholder="Rechercher..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Messages List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="py-16 text-center">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun message</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMessages.map(message => (
            <Card 
              key={message.id} 
              className={`border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all cursor-pointer ${
                !message.lu && view === 'inbox' ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
              }`}
              onClick={() => handleRead(message)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                    {(view === 'inbox' ? message.expediteur_nom : message.destinataire)?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium truncate ${!message.lu && view === 'inbox' ? 'text-slate-900' : 'text-slate-600'}`}>
                        {view === 'inbox' ? message.expediteur_nom : (message.destinataire === 'admin' ? 'Administration' : message.destinataire)}
                      </p>
                      {!message.lu && view === 'inbox' && (
                        <Badge className="bg-blue-600 text-xs">Nouveau</Badge>
                      )}
                    </div>
                    <p className={`text-sm truncate ${!message.lu && view === 'inbox' ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                      {message.sujet}
                    </p>
                    <p className="text-xs text-slate-400 truncate mt-1">{message.contenu}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">
                      {moment(message.created_date).format('DD/MM HH:mm')}
                    </p>
                    {message.lu && view === 'inbox' ? (
                      <MailOpen className="w-4 h-4 text-slate-300 mt-1 ml-auto" />
                    ) : view === 'inbox' ? (
                      <Mail className="w-4 h-4 text-blue-500 mt-1 ml-auto" />
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Compose Dialog */}
      <Dialog open={showCompose} onOpenChange={setShowCompose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Destinataire</Label>
              <Input 
                value={composeData.destinataire === 'admin' ? 'Administration' : composeData.destinataire}
                disabled={!isAdmin}
                onChange={(e) => setComposeData(prev => ({ ...prev, destinataire: e.target.value }))}
              />
              {!isAdmin && (
                <p className="text-xs text-slate-500 mt-1">Les messages sont envoyés à l'administration</p>
              )}
            </div>
            <div>
              <Label>Sujet</Label>
              <Input 
                value={composeData.sujet}
                onChange={(e) => setComposeData(prev => ({ ...prev, sujet: e.target.value }))}
                placeholder="Objet du message"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea 
                value={composeData.contenu}
                onChange={(e) => setComposeData(prev => ({ ...prev, contenu: e.target.value }))}
                placeholder="Votre message..."
                rows={6}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCompose(false)}>
                Annuler
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleSend}
              >
                <Send className="w-4 h-4 mr-2" />
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Message Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMessage?.sujet}</DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                  {selectedMessage.expediteur_nom?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-medium">{selectedMessage.expediteur_nom}</p>
                  <p className="text-sm text-slate-500">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {moment(selectedMessage.created_date).format('DD/MM/YYYY à HH:mm')}
                  </p>
                </div>
              </div>
              <div className="py-4 whitespace-pre-wrap text-slate-700">
                {selectedMessage.contenu}
              </div>
              {view === 'inbox' && (
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={() => handleReply(selectedMessage)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Répondre
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}