import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { MessageCircle, Facebook, Instagram, Mail } from 'lucide-react';
import moment from 'moment';
import { cn } from "@/lib/utils";

const PLATFORM_CONFIG = {
  whatsapp: { 
    icon: MessageCircle, 
    color: 'bg-green-500', 
    textColor: 'text-green-700',
    bgLight: 'bg-green-50',
    label: 'WhatsApp' 
  },
  facebook: { 
    icon: Facebook, 
    color: 'bg-blue-500', 
    textColor: 'text-blue-700',
    bgLight: 'bg-blue-50',
    label: 'Facebook' 
  },
  instagram: { 
    icon: Instagram, 
    color: 'bg-pink-500', 
    textColor: 'text-pink-700',
    bgLight: 'bg-pink-50',
    label: 'Instagram' 
  },
  interne: { 
    icon: Mail, 
    color: 'bg-slate-500', 
    textColor: 'text-slate-700',
    bgLight: 'bg-slate-50',
    label: 'Interne' 
  }
};

const STATUS_CONFIG = {
  nouveau: { label: 'Nouveau', class: 'bg-blue-100 text-blue-700' },
  en_cours: { label: 'En cours', class: 'bg-amber-100 text-amber-700' },
  en_attente: { label: 'En attente', class: 'bg-purple-100 text-purple-700' },
  clos: { label: 'Clos', class: 'bg-slate-100 text-slate-700' }
};

export default function ConversationList({ conversations, selectedConversation, onSelect }) {
  return (
    <div className="space-y-2">
      {conversations.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Aucune conversation</p>
          </CardContent>
        </Card>
      ) : (
        conversations.map(conv => {
          const platform = PLATFORM_CONFIG[conv.plateforme] || PLATFORM_CONFIG.interne;
          const Icon = platform.icon;
          const status = STATUS_CONFIG[conv.statut] || STATUS_CONFIG.nouveau;
          const isSelected = selectedConversation?.id === conv.id;

          return (
            <Card 
              key={conv.id}
              className={cn(
                "border-0 shadow-sm hover:shadow-md transition-all cursor-pointer",
                isSelected && "ring-2 ring-blue-500 bg-blue-50",
                conv.non_lu && !isSelected && "bg-blue-50/30 border-l-4 border-l-blue-500"
              )}
              onClick={() => onSelect(conv)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className={cn("w-12 h-12 flex items-center justify-center", platform.color)}>
                    <span className="text-white font-semibold text-sm">
                      {conv.client_nom?.[0]?.toUpperCase() || 'C'}
                    </span>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn("font-medium truncate", conv.non_lu && "font-bold text-slate-900")}>
                        {conv.client_nom}
                      </p>
                      <Icon className={cn("w-4 h-4 flex-shrink-0", platform.textColor)} />
                      {conv.non_lu && (
                        <Badge className="bg-blue-600 text-xs">Nouveau</Badge>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm truncate",
                      conv.non_lu ? "text-slate-700 font-medium" : "text-slate-500"
                    )}>
                      {conv.dernier_message || 'Aucun message'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={status.class}>{status.label}</Badge>
                      {conv.intention_detectee && (
                        <Badge variant="outline" className="text-xs">
                          {conv.intention_detectee}
                        </Badge>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">
                        {conv.dernier_message_date ? moment(conv.dernier_message_date).fromNow() : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}