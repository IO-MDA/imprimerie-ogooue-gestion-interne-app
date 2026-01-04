import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, 
  Send, 
  Plus, 
  Users, 
  Paperclip, 
  Search,
  X,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function Chat() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const [newChatType, setNewChatType] = useState('privee');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Vérifier si client
      const clients = await base44.entities.Client.filter({ user_id: userData.id });
      const isRealClient = userData.role === 'user' && clients.length > 0;
      if (isRealClient) {
        toast.error('Accès réservé aux employés');
        window.location.href = '/PortailClient';
        return;
      }

      const [conversationsData, usersData] = await Promise.all([
        base44.entities.ChatConversation.filter({ actif: true }),
        base44.entities.User.list()
      ]);

      // Filter conversations where user is participant
      const myConversations = conversationsData.filter(c => 
        c.participants?.some(p => p.user_id === userData.id)
      ).sort((a, b) => {
        const dateA = a.dernier_message_date ? new Date(a.dernier_message_date) : new Date(a.created_date);
        const dateB = b.dernier_message_date ? new Date(b.dernier_message_date) : new Date(b.created_date);
        return dateB - dateA;
      });

      setConversations(myConversations);
      setUsers(usersData.filter(u => u.id !== userData.id));
      setIsLoading(false);
    } catch (e) {
      console.error('Error loading data:', e);
      setIsLoading(false);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const messagesData = await base44.entities.ChatMessage.filter(
        { conversation_id: conversationId },
        'created_date'
      );
      setMessages(messagesData);
    } catch (e) {
      console.error('Error loading messages:', e);
    }
  };

  const markAsRead = async (conversationId) => {
    try {
      const conversationMessages = await base44.entities.ChatMessage.filter({ conversation_id: conversationId });
      
      for (const msg of conversationMessages) {
        if (msg.auteur_id !== user.id && !msg.lu_par?.includes(user.id)) {
          await base44.entities.ChatMessage.update(msg.id, {
            lu_par: [...(msg.lu_par || []), user.id]
          });
        }
      }
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachedFiles.length === 0) return;

    try {
      const newMessage = await base44.entities.ChatMessage.create({
        conversation_id: selectedConversation.id,
        auteur_id: user.id,
        auteur_nom: user.full_name || user.email,
        contenu: messageText.trim(),
        fichiers: attachedFiles,
        lu_par: [user.id]
      });

      await base44.entities.ChatConversation.update(selectedConversation.id, {
        dernier_message: messageText.trim() || '📎 Fichier joint',
        dernier_message_date: new Date().toISOString(),
        dernier_message_par: user.full_name || user.email
      });

      // Notify participants
      const otherParticipants = selectedConversation.participants.filter(p => p.user_id !== user.id);
      for (const participant of otherParticipants) {
        await base44.entities.Notification.create({
          destinataire_id: participant.user_id,
          destinataire_nom: participant.nom,
          destinataire_email: participant.email,
          type: 'message',
          titre: `💬 Nouveau message de ${user.full_name || user.email}`,
          message: messageText.trim() || 'Fichier joint',
          reference_id: selectedConversation.id,
          reference_type: 'ChatConversation',
          priorite: 'normale'
        });
      }

      setMessageText('');
      setAttachedFiles([]);
      loadMessages(selectedConversation.id);
      loadData();
    } catch (e) {
      console.error('Error sending message:', e);
      toast.error('Erreur lors de l\'envoi du message');
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { data } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(data.file_url);
      }
      setAttachedFiles([...attachedFiles, ...uploadedUrls]);
      toast.success(`${files.length} fichier(s) ajouté(s)`);
    } catch (e) {
      console.error('Error uploading files:', e);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleCreateConversation = async () => {
    if (newChatType === 'groupe' && !groupName.trim()) {
      toast.error('Veuillez entrer un nom de groupe');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('Veuillez sélectionner au moins un participant');
      return;
    }

    try {
      const participants = [
        { user_id: user.id, nom: user.full_name || user.email, email: user.email },
        ...selectedUsers.map(userId => {
          const u = users.find(usr => usr.id === userId);
          return { user_id: u.id, nom: u.full_name || u.email, email: u.email };
        })
      ];

      // Check if private conversation already exists
      if (newChatType === 'privee' && selectedUsers.length === 1) {
        const existing = conversations.find(c => 
          c.type === 'privee' && 
          c.participants?.length === 2 &&
          c.participants.some(p => p.user_id === selectedUsers[0])
        );
        if (existing) {
          setSelectedConversation(existing);
          setShowNewChatDialog(false);
          toast.info('Conversation existante ouverte');
          return;
        }
      }

      const newConv = await base44.entities.ChatConversation.create({
        nom: newChatType === 'groupe' ? groupName : null,
        type: newChatType,
        participants: participants,
        actif: true
      });

      toast.success('Conversation créée');
      setShowNewChatDialog(false);
      setSelectedUsers([]);
      setGroupName('');
      setNewChatType('privee');
      loadData();
      setSelectedConversation(newConv);
    } catch (e) {
      console.error('Error creating conversation:', e);
      toast.error('Erreur lors de la création');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getConversationName = (conv) => {
    if (conv.type === 'groupe') return conv.nom;
    const otherParticipant = conv.participants?.find(p => p.user_id !== user?.id);
    return otherParticipant?.nom || 'Conversation';
  };

  const getUnreadCount = (convId) => {
    const convMessages = messages.filter(m => 
      m.conversation_id === convId && 
      m.auteur_id !== user?.id &&
      !m.lu_par?.includes(user?.id)
    );
    return convMessages.length;
  };

  const filteredConversations = conversations.filter(c => {
    const name = getConversationName(c).toLowerCase();
    return name.includes(searchQuery.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chat Interne</h1>
          <p className="text-slate-500">Communications entre employés</p>
        </div>
        <Button onClick={() => setShowNewChatDialog(true)} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle conversation
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Sidebar - Conversations */}
        <Card className="col-span-12 md:col-span-4 border-0 shadow-lg flex flex-col">
          <CardContent className="p-4 flex-1 flex flex-col overflow-hidden">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Aucune conversation</p>
                </div>
              ) : (
                filteredConversations.map(conv => {
                  const unread = getUnreadCount(conv.id);
                  const isSelected = selectedConversation?.id === conv.id;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-2 border-blue-500' 
                          : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            conv.type === 'groupe' ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            {conv.type === 'groupe' ? (
                              <Users className="w-4 h-4 text-purple-600" />
                            ) : (
                              <span className="text-sm font-semibold text-blue-600">
                                {getConversationName(conv)[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-slate-900 text-sm">
                            {getConversationName(conv)}
                          </p>
                        </div>
                        {unread > 0 && (
                          <Badge className="bg-blue-600 text-white">{unread}</Badge>
                        )}
                      </div>
                      {conv.dernier_message && (
                        <p className="text-xs text-slate-500 truncate pl-10">
                          {conv.dernier_message}
                        </p>
                      )}
                      {conv.dernier_message_date && (
                        <p className="text-xs text-slate-400 mt-1 pl-10">
                          {moment(conv.dernier_message_date).fromNow()}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <Card className="col-span-12 md:col-span-8 border-0 shadow-lg flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      {getConversationName(selectedConversation)}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selectedConversation.type === 'groupe' 
                        ? `${selectedConversation.participants?.length} participants`
                        : 'Conversation privée'}
                    </p>
                  </div>
                  {selectedConversation.type === 'groupe' && (
                    <Badge className="bg-purple-100 text-purple-700">
                      <Users className="w-3 h-3 mr-1" />
                      Groupe
                    </Badge>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => {
                  const isMe = msg.auteur_id === user?.id;
                  const showAvatar = index === 0 || messages[index - 1]?.auteur_id !== msg.auteur_id;
                  const isRead = msg.lu_par?.length > 1;

                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {showAvatar && !isMe && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-slate-600">
                            {msg.auteur_nom[0]?.toUpperCase()}
                          </span>
                        </div>
                      )}
                      {!showAvatar && !isMe && <div className="w-8" />}
                      
                      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        {showAvatar && !isMe && (
                          <p className="text-xs text-slate-500 mb-1">{msg.auteur_nom}</p>
                        )}
                        <div className={`rounded-2xl px-4 py-2 ${
                          isMe 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-100 text-slate-900'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.contenu}</p>
                          {msg.fichiers && msg.fichiers.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.fichiers.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`flex items-center gap-2 p-2 rounded-lg ${
                                    isMe ? 'bg-blue-500' : 'bg-slate-200'
                                  } hover:opacity-80`}
                                >
                                  {url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                    <ImageIcon className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                  <span className="text-xs truncate max-w-[150px]">
                                    Fichier {idx + 1}
                                  </span>
                                  <Download className="w-3 h-3 ml-auto" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs text-slate-400">
                            {moment(msg.created_date).format('HH:mm')}
                          </p>
                          {isMe && (
                            <span className="text-slate-400">
                              {isRead ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t bg-slate-50">
                {attachedFiles.length > 0 && (
                  <div className="mb-2 flex gap-2 flex-wrap">
                    {attachedFiles.map((url, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm">
                        <Paperclip className="w-3 h-3" />
                        Fichier {idx + 1}
                        <button onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    placeholder="Écrivez votre message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} className="bg-blue-600">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Sélectionnez une conversation</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle conversation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={newChatType} onValueChange={setNewChatType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="privee">Conversation privée</SelectItem>
                  <SelectItem value="groupe">Groupe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newChatType === 'groupe' && (
              <div>
                <Label>Nom du groupe *</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Ex: Équipe Marketing"
                />
              </div>
            )}

            <div>
              <Label>Participants *</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (newChatType === 'privee' && selectedUsers.length >= 1) {
                            toast.error('Une seule personne pour une conversation privée');
                            return;
                          }
                          setSelectedUsers([...selectedUsers, u.id]);
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{u.full_name || u.email}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewChatDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreateConversation} className="bg-blue-600">
                Créer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}