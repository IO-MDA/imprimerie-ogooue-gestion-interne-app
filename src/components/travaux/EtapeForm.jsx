import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

export default function EtapeForm({ etape, projetId, categorieId, categorieNom, onSave, onCancel }) {
  const [formData, setFormData] = useState(etape || {
    projet_id: projetId,
    categorie_id: categorieId,
    categorie_nom: categorieNom,
    nom: '',
    description: '',
    statut: 'a_faire',
    priorite: 'normale',
    date_prevue: '',
    budget_prevu: '',
    montant_depense: '',
    avance_versee: '',
    responsable_id: '',
    responsable_nom: '',
    fournisseur_id: '',
    fournisseur_nom: '',
    mode_paiement: '',
    notes: '',
    photos_avant: [],
    photos_pendant: [],
    photos_apres: []
  });
  const [users, setUsers] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [usersData, fournisseursData] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.FournisseurTravaux.list()
    ]);
    setUsers(usersData);
    setFournisseurs(fournisseursData);
  };

  const handleFileUpload = async (e, type) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setFormData({
        ...formData,
        [type]: [...(formData[type] || []), ...urls]
      });
      toast.success(`${files.length} photo(s) ajoutée(s)`);
    } catch (e) {
      toast.error('Erreur upload');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (type, index) => {
    const newPhotos = [...formData[type]];
    newPhotos.splice(index, 1);
    setFormData({...formData, [type]: newPhotos});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      budget_prevu: parseFloat(formData.budget_prevu) || 0,
      montant_depense: parseFloat(formData.montant_depense) || 0,
      avance_versee: parseFloat(formData.avance_versee) || 0,
      montant_paye: parseFloat(formData.montant_paye) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div>
        <Label>Nom de l'étape *</Label>
        <Input
          value={formData.nom}
          onChange={(e) => setFormData({...formData, nom: e.target.value})}
          required
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Statut</Label>
          <Select value={formData.statut} onValueChange={(v) => setFormData({...formData, statut: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a_faire">À faire</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="termine">Terminé</SelectItem>
              <SelectItem value="bloque">Bloqué</SelectItem>
            </SelectContent>
          </Select>
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
          <Select 
            value={formData.responsable_id} 
            onValueChange={(v) => {
              const user = users.find(u => u.id === v);
              setFormData({
                ...formData, 
                responsable_id: v,
                responsable_nom: user?.full_name || user?.email
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Date prévue</Label>
          <Input
            type="date"
            value={formData.date_prevue}
            onChange={(e) => setFormData({...formData, date_prevue: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Budget prévu (FCFA)</Label>
          <Input
            type="number"
            value={formData.budget_prevu}
            onChange={(e) => setFormData({...formData, budget_prevu: e.target.value})}
          />
        </div>

        <div>
          <Label>Dépensé</Label>
          <Input
            type="number"
            value={formData.montant_depense}
            onChange={(e) => setFormData({...formData, montant_depense: e.target.value})}
          />
        </div>

        <div>
          <Label>Avance versée</Label>
          <Input
            type="number"
            value={formData.avance_versee}
            onChange={(e) => setFormData({...formData, avance_versee: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fournisseur</Label>
          <Select 
            value={formData.fournisseur_id} 
            onValueChange={(v) => {
              const f = fournisseurs.find(fr => fr.id === v);
              setFormData({
                ...formData, 
                fournisseur_id: v,
                fournisseur_nom: f?.nom
              });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {fournisseurs.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Mode de paiement</Label>
          <Select value={formData.mode_paiement} onValueChange={(v) => setFormData({...formData, mode_paiement: v})}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="especes">Espèces</SelectItem>
              <SelectItem value="virement">Virement</SelectItem>
              <SelectItem value="cheque">Chèque</SelectItem>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Photos */}
      <div className="space-y-3">
        <Label>Photos avant travaux</Label>
        <div className="grid grid-cols-4 gap-2">
          {formData.photos_avant?.map((url, idx) => (
            <div key={idx} className="relative">
              <img src={url} className="w-full h-20 object-cover rounded" />
              <button
                type="button"
                onClick={() => removePhoto('photos_avant', idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <label className="border-2 border-dashed rounded p-2 text-center cursor-pointer hover:bg-slate-50 block">
          <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
          <span className="text-xs text-slate-500">Ajouter photos</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'photos_avant')}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      <div className="space-y-3">
        <Label>Photos pendant travaux</Label>
        <div className="grid grid-cols-4 gap-2">
          {formData.photos_pendant?.map((url, idx) => (
            <div key={idx} className="relative">
              <img src={url} className="w-full h-20 object-cover rounded" />
              <button
                type="button"
                onClick={() => removePhoto('photos_pendant', idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <label className="border-2 border-dashed rounded p-2 text-center cursor-pointer hover:bg-slate-50 block">
          <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
          <span className="text-xs text-slate-500">Ajouter photos</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'photos_pendant')}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      <div className="space-y-3">
        <Label>Photos après travaux</Label>
        <div className="grid grid-cols-4 gap-2">
          {formData.photos_apres?.map((url, idx) => (
            <div key={idx} className="relative">
              <img src={url} className="w-full h-20 object-cover rounded" />
              <button
                type="button"
                onClick={() => removePhoto('photos_apres', idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <label className="border-2 border-dashed rounded p-2 text-center cursor-pointer hover:bg-slate-50 block">
          <Upload className="w-4 h-4 mx-auto mb-1 text-slate-400" />
          <span className="text-xs text-slate-500">Ajouter photos</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileUpload(e, 'photos_apres')}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      <div>
        <Label>Notes / Traces</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({...formData, notes: e.target.value})}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-white">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-blue-600" disabled={uploading}>
          {uploading ? 'Upload...' : (etape ? 'Mettre à jour' : 'Créer l\'étape')}
        </Button>
      </div>
    </form>
  );
}