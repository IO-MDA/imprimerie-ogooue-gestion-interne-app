import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Upload, X, Plus } from 'lucide-react';

const CATEGORIES = [
  "Photos & Cadres",
  "Calendrier & Tampon",
  "Impression & Saisie",
  "Reliure & Plastification",
  "Numérisation",
  "Textile Personnalisé",
  "EPI & Sécurité",
  "Communication Visuelle",
  "Bâches & Banderoles",
  "Objets Publicitaires"
];

export default function ProduitForm({ produit, onSave, onCancel }) {
  const [formData, setFormData] = useState(produit || {
    nom: '',
    categorie: CATEGORIES[0],
    description_courte: '',
    details_techniques: '',
    images: [],
    prix_unitaire: null,
    prix_a_partir_de: null,
    delai_estime: '3-5 jours ouvrés',
    options_personnalisables: [],
    actif: true,
    partage_client: true,
    ordre: 0
  });
  const [uploading, setUploading] = useState(false);
  const [newOption, setNewOption] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...uploadedUrls]
      }));
      toast.success('Images téléchargées');
    } catch (e) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addOption = () => {
    if (newOption.trim()) {
      setFormData(prev => ({
        ...prev,
        options_personnalisables: [...(prev.options_personnalisables || []), newOption.trim()]
      }));
      setNewOption('');
    }
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options_personnalisables: prev.options_personnalisables.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom */}
      <div>
        <Label>Nom du produit *</Label>
        <Input
          value={formData.nom}
          onChange={(e) => handleChange('nom', e.target.value)}
          required
        />
      </div>

      {/* Catégorie */}
      <div>
        <Label>Catégorie *</Label>
        <Select value={formData.categorie} onValueChange={(v) => handleChange('categorie', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description courte */}
      <div>
        <Label>Description commerciale (2-3 lignes) *</Label>
        <Textarea
          value={formData.description_courte}
          onChange={(e) => handleChange('description_courte', e.target.value)}
          rows={3}
          required
        />
      </div>

      {/* Détails techniques */}
      <div>
        <Label>Détails techniques</Label>
        <Textarea
          value={formData.details_techniques}
          onChange={(e) => handleChange('details_techniques', e.target.value)}
          rows={4}
          placeholder="Formats, matières, options, couleurs disponibles..."
        />
      </div>

      {/* Images */}
      <div>
        <Label>Images du produit</Label>
        <div className="space-y-3">
          {formData.images && formData.images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {formData.images.map((url, index) => (
                <div key={index} className="relative group">
                  <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('image-upload').click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Téléchargement...' : 'Ajouter des images'}
          </Button>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Prix */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prix unitaire (FCFA)</Label>
          <Input
            type="number"
            value={formData.prix_unitaire || ''}
            onChange={(e) => handleChange('prix_unitaire', e.target.value ? Number(e.target.value) : null)}
          />
        </div>
        <div>
          <Label>Ou à partir de (FCFA)</Label>
          <Input
            type="number"
            value={formData.prix_a_partir_de || ''}
            onChange={(e) => handleChange('prix_a_partir_de', e.target.value ? Number(e.target.value) : null)}
          />
        </div>
      </div>

      {/* Délai */}
      <div>
        <Label>Délai estimé</Label>
        <Input
          value={formData.delai_estime}
          onChange={(e) => handleChange('delai_estime', e.target.value)}
          placeholder="ex: 3-5 jours ouvrés"
        />
      </div>

      {/* Options personnalisables */}
      <div>
        <Label>Options personnalisables</Label>
        <div className="space-y-2">
          {formData.options_personnalisables && formData.options_personnalisables.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.options_personnalisables.map((option, index) => (
                <div key={index} className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                  <span className="text-sm">{option}</span>
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              placeholder="ex: Impression logo, Choix couleur..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
            />
            <Button type="button" onClick={addOption} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-lg">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.actif}
            onChange={(e) => handleChange('actif', e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Produit actif</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.partage_client}
            onChange={(e) => handleChange('partage_client', e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Visible pour les clients</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {produit ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}