import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { 
  Send, 
  Paperclip, 
  Sparkles, 
  FileText, 
  MessageCircle,
  Facebook,
  Instagram,
  Mail,
  Clock,
  Bot,
  User
} from 'lucide-react';
import moment from 'moment';
import { cn } from "@/lib/utils";

const PLATFORM_CONFIG = {
  whatsapp: { icon: MessageCircle, color: 'bg-green-500', label: 'WhatsApp' },
  facebook: { icon: Facebook, color: 'bg-blue-500', label: 'Facebook' },
  instagram: { icon: Instagram, color: 'bg-pink-500', label: 'Instagram' },
  interne: { icon: Mail, color: 'bg-slate-500', label: 'Interne' }
};

export default function ConversationView({ 
  conversation, 
  messages, 
  onSendMessage, 
  onRequestAi,
  templates,
  onUseTemplate 
}) {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    await onSendMessage(messageText);
    setMessageText('');
    setSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAiSuggestion = async () => {
    const suggestion = await onRequestAi();
    if (suggestion) {
      setMessageText(suggestion);
    }
  };

  if (!conversation) {
    return (
      <Card className="h-full border-0 shadow-lg">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center">
            <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Sélectionnez une conversation</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const platform = PLATFORM_CONFIG[conversation.plateforme] || PLATFORM_CONFIG.interne;
  const Icon = platform.icon;

  return (
    <Card className="h-full border-0 shadow-lg flex flex-col">
      {/* Header */}
      <CardHeader className="border-b bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className={cn("w-12 h-12 flex items-center justify-center", platform.color)}>
              <span className="text-white font-semibold">
                {conversation.client_nom?.[0]?.toUpperCase() || 'C'}
              </span>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900">{conversation.client_nom}</p>
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-xs text-slate-500">{platform.label}</p>
            </div>
          </div>
          {conversation.intention_detectee && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {conversation.intention_detectee}
            </Badge>
          )}
        </div>
      </CardHeader>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2",
              msg.est_operateur ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[70%] rounded-2xl px-4 py-2",
              msg.est_operateur 
                ? "bg-blue-600 text-white" 
                : "bg-white border shadow-sm"
            )}>
              <p className="text-sm whitespace-pre-wrap">{msg.contenu}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-xs",
                  msg.est_operateur ? "text-blue-100" : "text-slate-400"
                )}>
                  {moment(msg.created_date).format('HH:mm')}
                </span>
                {msg.genere_par_ia && (
                  <Bot className={cn(
                    "w-3 h-3",
                    msg.est_operateur ? "text-blue-200" : "text-slate-400"
                  )} />
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="border-t p-3 bg-white">
        <div className="flex gap-2 mb-2 overflow-x-auto">
          <Button variant="outline" size="sm" onClick={handleAiSuggestion}>
            <Sparkles className="w-3 h-3 mr-1" />
            IA
          </Button>
          {templates.slice(0, 3).map(template => (
            <Button 
              key={template.id} 
              variant="outline" 
              size="sm"
              onClick={() => onUseTemplate(template)}
            >
              <FileText className="w-3 h-3 mr-1" />
              {template.titre}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-white">
        <div className="flex gap-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tapez votre message..."
            rows={2}
            className="resize-none"
          />
          <Button 
            onClick={handleSend}
            disabled={!messageText.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}