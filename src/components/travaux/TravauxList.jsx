import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, FileText, Calendar, DollarSign } from 'lucide-react';
import moment from 'moment';

export default function TravauxList({ travaux, onEdit, onDelete, isAdmin }) {
  const getStatusBadge = (travail) => {
    if (travail.statut_paiement === 'paye') {
      return <Badge className="bg-emerald-100 text-emerald-700">Payé</Badge>;
    } else if (travail.statut_paiement === 'partiel') {
      return <Badge className="bg-amber-100 text-amber-700">Partiel</Badge>;
    } else {
      return <Badge className="bg-rose-100 text-rose-700">En attente</Badge>;
    }
  };

  const getPriorityBadge = (priorite) => {
    const configs = {
      urgente: { label: 'Urgente', class: 'bg-rose-600' },
      haute: { label: 'Haute', class: 'bg-orange-500' },
      normale: { label: 'Normale', class: 'bg-blue-500' },
      basse: { label: 'Basse', class: 'bg-slate-500' }
    };
    const config = configs[priorite] || configs.normale;
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  if (travaux.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="py-16 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucun travaux enregistré</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {travaux.map(travail => (
        <Card key={travail.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-semibold text-slate-900">{travail.type_travail}</h3>
                  {getStatusBadge(travail)}
                  {getPriorityBadge(travail.priorite)}
                </div>

                <p className="text-sm text-slate-600 mb-3">{travail.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Date</p>
                    <p className="font-medium">{moment(travail.date).format('DD/MM/YYYY')}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Fournisseur</p>
                    <p className="font-medium">{travail.fournisseur || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Montant</p>
                    <p className="font-medium text-orange-600">{travail.montant.toLocaleString()} F</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Reste à payer</p>
                    <p className="font-medium text-rose-600">
                      {(travail.montant - (travail.montant_paye || 0)).toLocaleString()} F
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Avancement</span>
                    <span className="font-medium">{travail.avancement || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all"
                      style={{ width: `${travail.avancement || 0}%` }}
                    />
                  </div>
                </div>

                {travail.facture_url && (
                  <a
                    href={travail.facture_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline mt-3"
                  >
                    <FileText className="w-4 h-4" />
                    Voir la facture
                  </a>
                )}
              </div>

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(travail)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(travail.id)} className="text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}