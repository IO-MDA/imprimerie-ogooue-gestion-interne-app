import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Clock, CheckCircle, XCircle, Truck, Calendar, DollarSign, FileText } from 'lucide-react';
import moment from 'moment';
import { toast } from 'sonner';
import { formatMontant } from '@/components/utils/formatMontant.jsx';

export default function CommandeDetail({ commande, isAdmin, onUpdate, onClose }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    statut: commande.statut,
    date_livraison_prevue: commande.date_livraison_prevue || '',
    date_livraison_reelle: commande.date_livraison_reelle || '',
    commentaire_client: commande.commentaire_client || '',
    commentaire_interne: commande.commentaire_interne || ''
  });

  const handleSave = async () => {
    try {
      // Mettre à jour la commande et notifier le client
      await base44.functions.invoke('notifierClientCommande', {
        commandeId: commande.id,
        nouveauStatut: formData.statut,
        commentaire: formData.commentaire_client
      });

      // Mettre à jour les autres champs
      await base44.entities.Commande.update(commande.id, {
        date_livraison_prevue: formData.date_livraison_prevue,
        date_livraison_reelle: formData.date_livraison_reelle,
        commentaire_interne: formData.commentaire_interne
      });

      // Si commande confirmée, mettre à jour le stock
      if (formData.statut === 'confirmee' && commande.statut !== 'confirmee') {
        try {
          await base44.functions.invoke('mettreAJourStock', {
            commandeId: commande.id
          });
        } catch (stockError) {
          console.error('Erreur mise à jour stock:', stockError);
        }
      }

      toast.success('Commande mise à jour et client notifié');
      setEditMode(false);
      onUpdate();
      onClose();
    } catch (e) {
      toast.error('Erreur lors de la mise à jour');
      console.error(e);
    }
  };

  const getStatutConfig = (statut) => {
    const configs = {
      'brouillon': { label: 'Brouillon', icon: Clock, class: 'bg-slate-100 text-slate-700' },
      'confirmee': { label: 'Confirmée', icon: CheckCircle, class: 'bg-blue-100 text-blue-700' },
      'en_production': { label: 'En production', icon: Package, class: 'bg-purple-100 text-purple-700' },
      'prete': { label: 'Prête', icon: CheckCircle, class: 'bg-emerald-100 text-emerald-700' },
      'livree': { label: 'Livrée', icon: Truck, class: 'bg-green-100 text-green-700' },
      'annulee': { label: 'Annulée', icon: XCircle, class: 'bg-rose-100 text-rose-700' }
    };
    return configs[statut] || configs['brouillon'];
  };

  const StatutIcon = getStatutConfig(commande.statut).icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{commande.reference_commande}</h2>
          <p className="text-slate-500">{commande.type_prestation}</p>
        </div>
        <Badge className={getStatutConfig(commande.statut).class}>
          <StatutIcon className="w-4 h-4 mr-1" />
          {getStatutConfig(commande.statut).label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
        <div>
          <p className="text-sm text-slate-500">Client</p>
          <p className="font-medium">{commande.client_nom}</p>
          {commande.client_email && <p className="text-sm text-slate-500">{commande.client_email}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Date de commande</p>
          <p className="font-medium">{moment(commande.date_commande).format('DD/MM/YYYY')}</p>
        </div>
      </div>

      {commande.description && (
        <div>
          <Label className="mb-2 block">Description</Label>
          <p className="text-slate-700 p-3 bg-slate-50 rounded-lg">{commande.description}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-slate-600 mb-1">Quantité</p>
          <p className="text-2xl font-bold text-blue-900">{commande.quantite}</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-lg">
          <p className="text-sm text-slate-600 mb-1">Montant total</p>
          <p className="text-2xl font-bold text-emerald-900">{formatMontant(commande.montant_total)} F</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-lg">
          <p className="text-sm text-slate-600 mb-1">Reste à payer</p>
          <p className="text-2xl font-bold text-amber-900">{formatMontant(commande.reste_a_payer || 0)} F</p>
        </div>
      </div>

      {isAdmin && editMode ? (
        <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
          <div>
            <Label>Statut</Label>
            <Select value={formData.statut} onValueChange={(value) => setFormData({...formData, statut: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="confirmee">Confirmée</SelectItem>
                <SelectItem value="en_production">En production</SelectItem>
                <SelectItem value="prete">Prête</SelectItem>
                <SelectItem value="livree">Livrée</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date livraison prévue</Label>
              <Input
                type="date"
                value={formData.date_livraison_prevue}
                onChange={(e) => setFormData({...formData, date_livraison_prevue: e.target.value})}
              />
            </div>
            <div>
              <Label>Date livraison réelle</Label>
              <Input
                type="date"
                value={formData.date_livraison_reelle}
                onChange={(e) => setFormData({...formData, date_livraison_reelle: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label>Commentaire client</Label>
            <Textarea
              value={formData.commentaire_client}
              onChange={(e) => setFormData({...formData, commentaire_client: e.target.value})}
              rows={2}
            />
          </div>

          <div>
            <Label>Note interne</Label>
            <Textarea
              value={formData.commentaire_interne}
              onChange={(e) => setFormData({...formData, commentaire_interne: e.target.value})}
              rows={2}
              className="border-amber-200"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="bg-blue-600">
              Enregistrer
            </Button>
            <Button variant="outline" onClick={() => setEditMode(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <>
          {commande.date_livraison_prevue && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">📅 Livraison prévue</p>
              <p className="font-semibold text-blue-900">{moment(commande.date_livraison_prevue).format('DD/MM/YYYY')}</p>
            </div>
          )}

          {commande.date_livraison_reelle && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 mb-1">✅ Livré le</p>
              <p className="font-semibold text-green-900">{moment(commande.date_livraison_reelle).format('DD/MM/YYYY')}</p>
            </div>
          )}

          {commande.commentaire_client && (
            <div>
              <Label className="mb-2 block">Message</Label>
              <p className="text-slate-700 p-3 bg-blue-50 rounded-lg">{commande.commentaire_client}</p>
            </div>
          )}

          {isAdmin && commande.commentaire_interne && (
            <div>
              <Label className="mb-2 block">Note interne (privée)</Label>
              <p className="text-amber-700 p-3 bg-amber-50 rounded-lg">{commande.commentaire_interne}</p>
            </div>
          )}

          {isAdmin && (
            <Button onClick={() => setEditMode(true)} className="w-full">
              Modifier la commande
            </Button>
          )}
        </>
      )}

      {commande.historique_statuts && commande.historique_statuts.length > 0 && (
        <div className="border-t pt-4">
          <Label className="mb-3 block">Historique</Label>
          <div className="space-y-2">
            {commande.historique_statuts.map((h, i) => (
              <div key={i} className="flex items-start gap-3 text-sm p-2 bg-slate-50 rounded">
                <Badge className={getStatutConfig(h.statut).class}>
                  {getStatutConfig(h.statut).label}
                </Badge>
                <div className="flex-1">
                  <p className="text-slate-600">{h.commentaire}</p>
                  <p className="text-xs text-slate-400">
                    {moment(h.date).format('DD/MM/YYYY HH:mm')} • {h.modifie_par}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}