import React from 'react';
import { Badge } from "@/components/ui/badge";
import moment from 'moment';

export default function HistoriqueCommande({ commande }) {
  const getStatutConfig = (statut) => {
    const configs = {
      'brouillon': { label: 'Brouillon', class: 'bg-slate-100 text-slate-700' },
      'confirmee': { label: 'Confirmée', class: 'bg-blue-100 text-blue-700' },
      'en_production': { label: 'En production', class: 'bg-purple-100 text-purple-700' },
      'prete': { label: 'Prête', class: 'bg-emerald-100 text-emerald-700' },
      'livree': { label: 'Livrée', class: 'bg-green-100 text-green-700' },
      'annulee': { label: 'Annulée', class: 'bg-rose-100 text-rose-700' }
    };
    return configs[statut] || configs['brouillon'];
  };

  if (!commande.historique_statuts || commande.historique_statuts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        Aucun historique disponible
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-900 mb-3">📊 Suivi de votre commande</h3>
      {commande.historique_statuts.map((h, i) => (
        <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-blue-700">{i + 1}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <Badge className={getStatutConfig(h.statut).class}>
                {getStatutConfig(h.statut).label}
              </Badge>
              <span className="text-xs text-slate-500">
                {moment(h.date).format('DD/MM/YYYY HH:mm')}
              </span>
            </div>
            {h.commentaire && (
              <p className="text-sm text-slate-700 mt-1">{h.commentaire}</p>
            )}
            <p className="text-xs text-slate-500 mt-1">Par: {h.modifie_par}</p>
          </div>
        </div>
      ))}
    </div>
  );
}