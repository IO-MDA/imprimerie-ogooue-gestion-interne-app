import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Clock, Package, CheckCircle, Truck, MapPin, XCircle, StickyNote } from 'lucide-react';

const STATUTS = [
  { value: 'en_attente', label: 'En attente', icon: Clock, color: 'bg-slate-100 text-slate-700' },
  { value: 'en_preparation', label: 'En préparation', icon: Package, color: 'bg-blue-100 text-blue-700' },
  { value: 'prete', label: 'Prête pour retrait', icon: CheckCircle, color: 'bg-purple-100 text-purple-700' },
  { value: 'expediee', label: 'Expédiée', icon: Truck, color: 'bg-amber-100 text-amber-700' },
  { value: 'livree', label: 'Livrée', icon: MapPin, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'annulee', label: 'Annulée', icon: XCircle, color: 'bg-rose-100 text-rose-700' }
];

export default function ChangerStatutDialog({ facture, open, onClose, onSuccess }) {
  const [selectedStatut, setSelectedStatut] = useState(facture?.statut_commande || 'en_attente');
  const [commentaire, setCommentaire] = useState('');
  const [noteInterne, setNoteInterne] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!facture) return;

    setIsLoading(true);
    try {
      await base44.functions.invoke('notifierClientStatut', {
        factureId: facture.id,
        nouveauStatut: selectedStatut,
        commentaire,
        noteInterne
      });

      toast.success('Statut mis à jour et client notifié');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour du statut');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Changer le statut de la commande</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-2">Commande: <span className="font-semibold">{facture?.numero}</span></p>
            <p className="text-sm text-slate-600">Client: <span className="font-semibold">{facture?.client_nom}</span></p>
          </div>

          <div>
            <Label className="mb-3 block">Nouveau statut</Label>
            <div className="grid grid-cols-2 gap-3">
              {STATUTS.map(statut => {
                const Icon = statut.icon;
                const isSelected = selectedStatut === statut.value;
                return (
                  <button
                    key={statut.value}
                    onClick={() => setSelectedStatut(statut.value)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${statut.color} flex items-center justify-center`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-slate-900">{statut.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label>Commentaire pour le client (optionnel)</Label>
            <Textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Ex: Votre commande sera prête demain matin..."
              rows={2}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Ce commentaire sera inclus dans l'email envoyé au client
            </p>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-amber-600" />
              Note interne (non visible par le client)
            </Label>
            <Textarea
              value={noteInterne}
              onChange={(e) => setNoteInterne(e.target.value)}
              placeholder="Ex: Problème d'impression, à refaire..."
              rows={2}
              className="mt-2 border-amber-200 focus:border-amber-400"
            />
            <p className="text-xs text-amber-600 mt-1">
              Cette note reste privée pour l'équipe
            </p>
          </div>

          {facture?.historique_statuts && facture.historique_statuts.length > 0 && (
            <div className="border-t pt-4">
              <Label className="mb-2 block">Historique des changements</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {facture.historique_statuts.map((h, idx) => (
                  <div key={idx} className="text-xs p-2 bg-slate-50 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={STATUTS.find(s => s.value === h.statut)?.color}>
                        {STATUTS.find(s => s.value === h.statut)?.label || h.statut}
                      </Badge>
                      <span className="text-slate-500">
                        {new Date(h.date).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    {h.commentaire && (
                      <p className="text-slate-600 mb-1">💬 {h.commentaire}</p>
                    )}
                    {h.note_interne && (
                      <p className="text-amber-700 mb-1">🔒 Note: {h.note_interne}</p>
                    )}
                    <p className="text-slate-500">Par: {h.modifie_par}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Mise à jour...' : 'Confirmer et notifier'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}