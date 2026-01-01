import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, User } from 'lucide-react';
import moment from 'moment';
import { cn } from "@/lib/utils";

export default function MessageThread({ messages }) {
  if (messages.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p>Aucun message dans cette conversation</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map(message => {
        const isOperator = message.est_operateur;
        
        return (
          <div
            key={message.id}
            className={cn("flex gap-3", isOperator ? "flex-row-reverse" : "flex-row")}
          >
            {/* Avatar */}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              isOperator ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
            )}>
              {isOperator ? (
                <User className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>

            {/* Message */}
            <div className={cn("flex flex-col max-w-[70%]", isOperator && "items-end")}>
              <Card className={cn(
                "p-3",
                isOperator ? "bg-blue-600 text-white" : "bg-slate-100"
              )}>
                <p className="text-sm whitespace-pre-wrap">{message.contenu}</p>
                
                {message.fichier_url && (
                  <div className="mt-2">
                    <a
                      href={message.fichier_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline"
                    >
                      Voir le fichier joint
                    </a>
                  </div>
                )}
              </Card>

              <div className="flex items-center gap-2 mt-1 px-1">
                <p className="text-xs text-slate-400">
                  {moment(message.created_date).format('HH:mm')}
                </p>
                {message.genere_par_ia && (
                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                    <Bot className="w-3 h-3 mr-1" />
                    IA
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}