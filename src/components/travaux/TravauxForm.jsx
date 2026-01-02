import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function TravauxForm({ travail, defaultProjet, onSave, onCancel }) {
  const [formData, setFormData] = useState(travail || {
    projet: defaultProjet || 'papeterie',
    date: new Date().toISOString().split('T')[0],
    type_travail: 'construction',
    description: '',
    fournisseur: '',
    montant: '',
    numero_facture: '',
    statut_paiement: 'en_attente',
    montant_paye: 0,
    avancement: 0,
    responsable: '',
    notes: '',
    priorite: 'normale',
    date_prevue_fin: ''
  });
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, facture_url: file_url });
      toast.success('Fichier uploadé');
    } catch (error) {
      toast.error('Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      montant: parseFloat(formData.montant) || 0,
      montant_paye: parseFloat(formData.montant_paye) || 0,
      avancement: parseFloat(formData.avancement) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Projet *</Label>
          <Select value={formData.projet} onValueChange={(v) => setFormData({...formData, projet: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="papeterie">Papeterie Ogooué</SelectItem>
              <SelectItem value="restaurant">Restaurant Ogooué</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Date *</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            required
          />
        </div>
      </div>

      <div>
        <Label>Type de travaux *</Label>
        <Select value={formData.type_travail} onValueChange={(v) => setFormData({...formData, type_travail: v})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="construction">Construction</SelectItem>
            <SelectItem value="electricite">Électricité</SelectItem>
            <SelectItem value="plomberie">Plomberie</SelectItem>
            <SelectItem value="peinture">Peinture</SelectItem>
            <SelectItem value="menuiserie">Menuiserie</SelectItem>
            <SelectItem value="amenagement">Aménagement</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fournisseur</Label>
          <Input
            value={formData.fournisseur}
            onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
          />
        </div>

        <div>
          <Label>Numéro de facture</Label>
          <Input
            value={formData.numero_facture}
            onChange={(e) => setFormData({...formData, numero_facture: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Montant (FCFA) *</Label>
          <Input
            type="number"
            value={formData.montant}
            onChange={(e) => setFormData({...formData, montant: e.target.value})}
            required
          />
        </div>

        <div>
          <Label>Montant payé (FCFA)</Label>
          <Input
            type="number"
            value={formData.montant_paye}
            onChange={(e) => setFormData({...formData, montant_paye: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Avancement (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={formData.avancement}
            onChange={(e) => setFormData({...formData, avancement: e.target.value})}
          />
        </div>

        <div>
          <Label>Priorité</Label>
          <Select value={formData.priorite} onValueChange={(v) => setFormData({...formData, priorite: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basse">Basse</SelectItem>
              <SelectItem value="normale">Normale</SelectItem>
              <SelectItem value="haute">Haute</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Responsable</Label>
          <Input
            value={formData.responsable}
            onChange={(e) => setFormData({...formData, responsable: e.target.value})}
          />
        </div>

        <div>
          <Label>Date prévue de fin</Label>
          <Input
            type="date"
            value={formData.date_prevue_fin}
            onChange={(e) => setFormData({...formData, date_prevue_fin: e.target.value})}
          />
        </div>
      </div>

      <div>
        <Label>Facture (PDF/Image)</Label>
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50">
              {uploading ? (
                <p className="text-sm text-slate-500">Upload en cours...</p>
              ) : formData.facture_url ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-600">Fichier uploadé</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setFormData({...formData, facture_url: ''})}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">Cliquer pour uploader</span>
                </div>
              )}
            </div>
            <input
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div>
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
          Enregistrer
        </Button>
      </div>
    </form>
  );
}