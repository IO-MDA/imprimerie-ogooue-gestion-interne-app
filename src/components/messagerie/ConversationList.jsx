import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Facebook, Instagram, MessageCircle, MessageSquare, Clock } from 'lucide-react';
import moment from 'moment';
import { cn } from "@/lib/utils";

const getPlatformIcon = (platform) => {
  const icons = {
    whatsapp: MessageCircle,
    facebook: Facebook,
    instagram: Instagram,
    interne: MessageSquare
  };
  return icons[platform] || MessageSquare;
};

const getPlatformColor = (platform) => {
  const colors = {
    whatsapp: 'text-green-600 bg-green-50',
    facebook: 'text-blue-600 bg-blue-50',
    instagram: 'text-pink-600 bg-pink-50',
    interne: 'text-slate-600 bg-slate-50'
  };
  return colors[platform] || 'text-slate-600 bg-slate-50';
};

const getStatutBadge = (statut) => {
  const config = {
    nouveau: { label: 'Nouveau', class: 'bg-blue-100 text-blue-700' },
    en_cours: { label: 'En cours', class: 'bg-amber-100 text-amber-700' },
    en_attente: { label: 'En attente', class: 'bg-slate-100 text-slate-700' },
    clos: { label: 'Clos', class: 'bg-emerald-100 text-emerald-700' }
  };
  return config[statut] || config.nouveau;
};

const getIntentionBadge = (intention) => {
  const config = {
    devis: { label: '💰 Devis', class: 'bg-purple-100 text-purple-700' },
    commande: { label: '🛒 Commande', class: 'bg-green-100 text-green-700' },
    reclamation: { label: '⚠️ Réclamation', class: 'bg-red-100 text-red-700' },
    suivi: { label: '📦 Suivi', class: 'bg-blue-100 text-blue-700' },
    information: { label: 'ℹ️ Info', class: 'bg-slate-100 text-slate-700' }
  };
  return config[intention];
};

export default function ConversationList({ conversations, onSelect }) {
  if (conversations.length === 0) {
    return (
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="py-16 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucune conversation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map(conversation => {
        const Icon = getPlatformIcon(conversation.plateforme);
        const statusBadge = getStatutBadge(conversation.statut);
        const intentionBadge = conversation.intention_detectee ? getIntentionBadge(conversation.intention_detectee) : null;
        
        return (
          <Card
            key={conversation.id}
            className={cn(
              "border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all cursor-pointer",
              conversation.non_lu && "bg-blue-50/30 border-l-4 border-l-blue-500"
            )}
            onClick={() => onSelect(conversation)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Platform icon */}
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", getPlatformColor(conversation.plateforme))}>
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("font-medium truncate", conversation.non_lu ? 'text-slate-900' : 'text-slate-600')}>
                      {conversation.client_nom}
                    </p>
                    <Badge className={statusBadge.class}>{statusBadge.label}</Badge>
                    {conversation.non_lu && (
                      <Badge className="bg-red-500 text-white text-xs">Non lu</Badge>
                    )}
                    {intentionBadge && (
                      <Badge className={intentionBadge.class}>{intentionBadge.label}</Badge>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-400 mt-1">
                    <Icon className="w-3 h-3 inline mr-1" />
                    {conversation.plateforme.toUpperCase()}
                    {conversation.agent_nom && ` • Assigné à ${conversation.agent_nom}`}
                  </p>
                  
                  <p className={cn("text-sm truncate mt-1", conversation.non_lu ? 'font-medium text-slate-800' : 'text-slate-600')}>
                    {conversation.dernier_message}
                  </p>
                </div>

                {/* Time */}
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-400">
                    {moment(conversation.dernier_message_date).fromNow()}
                  </p>
                  <p className="text-xs text-slate-300 mt-1">
                    {moment(conversation.dernier_message_date).format('HH:mm')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}