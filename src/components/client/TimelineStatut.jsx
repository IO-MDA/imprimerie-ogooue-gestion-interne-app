import React from 'react';
import { CheckCircle2, Clock, Package, Truck, MapPin, XCircle } from 'lucide-react';
import moment from 'moment';
import { cn } from '@/lib/utils';

export default function TimelineStatut({ historique, statutActuel }) {
  const etapesConfig = {
    'nouveau': { label: 'Reçu', icon: CheckCircle2, color: 'blue' },
    'en_cours': { label: 'En traitement', icon: Clock, color: 'amber' },
    'en_production': { label: 'En production', icon: Package, color: 'purple' },
    'pret': { label: 'Prêt', icon: CheckCircle2, color: 'emerald' },
    'repondu': { label: 'Répondu', icon: CheckCircle2, color: 'green' },
    'termine': { label: 'Terminé', icon: MapPin, color: 'green' },
    'annule': { label: 'Annulé', icon: XCircle, color: 'red' }
  };

  const etapesOrdre = ['nouveau', 'en_cours', 'en_production', 'pret', 'termine'];
  const indexActuel = etapesOrdre.indexOf(statutActuel);

  return (
    <div className="space-y-4">
      {etapesOrdre.map((etape, index) => {
        const config = etapesConfig[etape];
        const Icon = config.icon;
        const isComplete = index <= indexActuel;
        const isCurrent = etape === statutActuel;
        const etapeHistorique = historique?.find(h => h.statut === etape);

        return (
          <div key={etape} className="flex gap-4">
            {/* Ligne verticale */}
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isComplete 
                  ? `bg-${config.color}-100` 
                  : "bg-slate-100"
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  isComplete ? `text-${config.color}-600` : "text-slate-400"
                )} />
              </div>
              {index < etapesOrdre.length - 1 && (
                <div className={cn(
                  "w-0.5 h-12 mt-2",
                  isComplete ? `bg-${config.color}-300` : "bg-slate-200"
                )} />
              )}
            </div>

            {/* Contenu */}
            <div className="flex-1 pb-8">
              <div className="flex items-center justify-between">
                <p className={cn(
                  "font-medium",
                  isComplete ? "text-slate-900" : "text-slate-400"
                )}>
                  {config.label}
                </p>
                {etapeHistorique && (
                  <p className="text-xs text-slate-500">
                    {moment(etapeHistorique.date).format('DD/MM/YYYY HH:mm')}
                  </p>
                )}
              </div>
              {etapeHistorique?.commentaire && (
                <p className="text-sm text-slate-600 mt-1">
                  {etapeHistorique.commentaire}
                </p>
              )}
              {etapeHistorique?.par && (
                <p className="text-xs text-slate-500 mt-1">
                  Par: {etapeHistorique.par}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}