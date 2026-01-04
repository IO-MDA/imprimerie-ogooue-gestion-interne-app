import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';
import moment from 'moment';

export default function TimelineView({ etapes }) {
  const getStatutIcon = (statut) => {
    switch (statut) {
      case 'termine':
        return <CheckCircle className="w-6 h-6 text-emerald-500" />;
      case 'en_cours':
        return <Clock className="w-6 h-6 text-blue-500" />;
      case 'bloque':
        return <AlertCircle className="w-6 h-6 text-rose-500" />;
      default:
        return <Circle className="w-6 h-6 text-slate-300" />;
    }
  };

  const getStatutColor = (statut) => {
    switch (statut) {
      case 'termine':
        return 'bg-emerald-500';
      case 'en_cours':
        return 'bg-blue-500';
      case 'bloque':
        return 'bg-rose-500';
      default:
        return 'bg-slate-300';
    }
  };

  const sortedEtapes = [...etapes].sort((a, b) => 
    (a.ordre || 0) - (b.ordre || 0)
  );

  return (
    <div className="space-y-0">
      {sortedEtapes.map((etape, index) => (
        <div key={etape.id} className="flex gap-4 relative">
          {/* Line */}
          {index < sortedEtapes.length - 1 && (
            <div className={`absolute left-7 top-14 bottom-0 w-0.5 ${getStatutColor(etape.statut)}`} />
          )}

          {/* Icon */}
          <div className="flex-shrink-0 mt-3 z-10">
            {getStatutIcon(etape.statut)}
          </div>

          {/* Content */}
          <Card className="flex-1 mb-6 border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{etape.nom}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {etape.categorie_nom}
                  </p>
                </div>
                <Badge className={
                  etape.statut === 'termine' ? 'bg-emerald-100 text-emerald-700' :
                  etape.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                  etape.statut === 'bloque' ? 'bg-rose-100 text-rose-700' :
                  'bg-slate-100 text-slate-700'
                }>
                  {etape.statut === 'a_faire' ? 'À faire' :
                   etape.statut === 'en_cours' ? 'En cours' :
                   etape.statut === 'termine' ? 'Terminé' : 'Bloqué'}
                </Badge>
              </div>

              {etape.description && (
                <p className="text-sm text-slate-600 mb-3">{etape.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm">
                {etape.date_prevue && (
                  <div>
                    <span className="text-slate-500">Date prévue: </span>
                    <span className="font-medium">{moment(etape.date_prevue).format('DD/MM/YYYY')}</span>
                  </div>
                )}
                {etape.responsable_nom && (
                  <div>
                    <span className="text-slate-500">Responsable: </span>
                    <span className="font-medium">{etape.responsable_nom}</span>
                  </div>
                )}
                {etape.budget_prevu > 0 && (
                  <div>
                    <span className="text-slate-500">Budget: </span>
                    <span className="font-medium text-blue-600">
                      {etape.budget_prevu.toLocaleString()} F
                    </span>
                  </div>
                )}
              </div>

              {/* Photos */}
              {(etape.photos_avant?.length > 0 || etape.photos_pendant?.length > 0 || etape.photos_apres?.length > 0) && (
                <div className="mt-3 flex gap-2">
                  {etape.photos_avant?.slice(0, 2).map((url, idx) => (
                    <img key={idx} src={url} className="w-16 h-16 object-cover rounded" />
                  ))}
                  {etape.photos_pendant?.slice(0, 2).map((url, idx) => (
                    <img key={idx} src={url} className="w-16 h-16 object-cover rounded" />
                  ))}
                  {etape.photos_apres?.slice(0, 2).map((url, idx) => (
                    <img key={idx} src={url} className="w-16 h-16 object-cover rounded" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}