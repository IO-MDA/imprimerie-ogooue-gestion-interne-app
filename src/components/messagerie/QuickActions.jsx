import React from 'react';
import { Button } from "@/components/ui/button";
import { FileText, Image, Package, Clock } from 'lucide-react';

const QUICK_ACTIONS = [
  { id: 'devis', label: 'Envoyer devis', icon: FileText },
  { id: 'visuel', label: 'Demander visuel', icon: Image },
  { id: 'confirmer', label: 'Confirmer commande', icon: Package },
  { id: 'delai', label: 'Informer délai', icon: Clock }
];

export default function QuickActions({ onAction }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {QUICK_ACTIONS.map(action => {
        const Icon = action.icon;
        return (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onAction(action.id)}
            className="justify-start"
          >
            <Icon className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}