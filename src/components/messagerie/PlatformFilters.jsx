import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Facebook, Instagram, MessageCircle } from 'lucide-react';

const PLATFORMS = [
  { id: 'all', name: 'Tous', icon: MessageSquare, color: 'bg-slate-600' },
  { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'bg-green-600' },
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-pink-600' },
  { id: 'interne', name: 'Interne', icon: MessageSquare, color: 'bg-slate-600' }
];

export default function PlatformFilters({ selected, onSelect, counts }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORMS.map(platform => {
        const Icon = platform.icon;
        const count = counts[platform.id] || 0;
        const isSelected = selected === platform.id;
        
        return (
          <Button
            key={platform.id}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(platform.id)}
            className={isSelected ? platform.color : ''}
          >
            <Icon className="w-4 h-4 mr-2" />
            {platform.name}
            {count > 0 && (
              <Badge className="ml-2 bg-white/20">{count}</Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}