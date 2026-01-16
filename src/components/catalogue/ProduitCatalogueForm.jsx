import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, Upload, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CATEGORIES = [
  'Photos',
  'Calendriers & Tampons',
  'Impression & Saisie',
  'Reliure & Plastification',
  'Numérisation',
  'Textile',
  'EPI & Sécurité',
  'Marketing',
  'Signalétique'
];

export default function ProduitCatalogueForm({ produit, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    nom: '',
    categorie: '',
    sous_categorie: '',
    description_courte: '',
    details_techniques: '',
    photos: [],
    prix_unitaire: 0,
    prix_a_partir_de: false,
    delai_estime: '',
    options_personnalisables: [],
    stock_actuel: 0,
    stock_minimum: 5,
    unite: 'unité',
    actif: true,
    visible_clients: true,
    ordre: 0,
    tags: [],
    grille_tarifaire: []
  });

  const [newOption, setNewOption] = useState('');
  const [newTag, setNewTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    if (produit) {
      setFormData(produit);
    }
  }, [produit]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const result = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(result.file_url);
      }
      handleChange('photos', [...formData.photos, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} photo(s) ajoutée(s)`);
    } catch (e) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    const newPhotos = [...formData.photos];
    newPhotos.splice(index, 1);
    handleChange('photos', newPhotos);
  };

  const genererImageIA = async () => {
    if (!formData.nom || !formData.description_courte) {
      toast.error('Veuillez remplir le nom et la description du produit d\'abord');
      return;
    }

    setGeneratingImage(true);
    toast.info('Génération de l\'image en cours... (5-10 secondes)');
    
    try {
      const prompt = `Professional product photo of ${formData.nom}. ${formData.description_courte}. Category: ${formData.categorie || 'product'}. Style: Clean studio photography, white background, professional lighting, commercial quality, modern marketing aesthetic.`;

      const result = await base44.integrations.Core.GenerateImage({ prompt });
      
      if (result && result.url) {
        handleChange('photos', [...formData.photos, result.url]);
        toast.success('Image générée avec succès!');
      } else {
        throw new Error('URL de l\'image non reçue');
      }
    } catch (e) {
      console.error('Erreur génération image:', e);
      toast.error(`Erreur: ${e.message || 'Impossible de générer l\'image'}`);
    } finally {
      setGeneratingImage(false);
    }
  };

  const addOption = () => {
    if (!newOption.trim()) return;
    handleChange('options_personnalisables', [...formData.options_personnalisables, newOption.trim()]);
    setNewOption('');
  };

  const removeOption = (index) => {
    const newOptions = [...formData.options_personnalisables];
    newOptions.splice(index, 1);
    handleChange('options_personnalisables', newOptions);
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    handleChange('tags', [...formData.tags, newTag.trim()]);
    setNewTag('');
  };

  const removeTag = (index) => {
    const newTags = [...formData.tags];
    newTags.splice(index, 1);
    handleChange('tags', newTags);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informations de base */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Informations de base</h3>
        
        <div>
          <Label>Nom du produit *</Label>
          <Input
            value={formData.nom}
            onChange={(e) => handleChange('nom', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Catégorie *</Label>
            <Select value={formData.categorie} onValueChange={(v) => handleChange('categorie', v)} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Sous-catégorie</Label>
            <Input
              value={formData.sous_categorie}
              onChange={(e) => handleChange('sous_categorie', e.target.value)}
              placeholder="Ex: T-shirts, Flyers..."
            />
          </div>
        </div>

        <div>
          <Label>Description courte (2-3 lignes) *</Label>
          <Textarea
            value={formData.description_courte}
            onChange={(e) => handleChange('description_courte', e.target.value)}
            rows={3}
            required
          />
        </div>

        <div>
          <Label>Détails techniques</Label>
          <Textarea
            value={formData.details_techniques}
            onChange={(e) => handleChange('details_techniques', e.target.value)}
            placeholder="Formats, matières, options, couleurs..."
            rows={3}
          />
        </div>
      </div>

      {/* Photos */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Photos</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Ajouter une photo</Label>
            <div className="mt-2">
              <label className="cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">
                    {uploading ? 'Téléchargement...' : 'Télécharger une photo'}
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          <div>
            <Label>Générer avec IA</Label>
            <div className="mt-2">
              <button
                type="button"
                onClick={genererImageIA}
                disabled={generatingImage || !formData.nom || !formData.description_courte}
                className="w-full border-2 border-dashed border-purple-300 rounded-lg p-4 text-center hover:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-br from-purple-50 to-indigo-50"
              >
                {generatingImage ? (
                  <>
                    <Loader2 className="w-6 h-6 text-purple-500 mx-auto mb-2 animate-spin" />
                    <p className="text-sm text-purple-600">Génération...</p>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-sm text-purple-600">Générer image IA</p>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {formData.photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-4">
            {formData.photos.map((url, index) => (
              <div key={index} className="relative group">
                <img src={url} alt="" className="w-full h-24 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prix */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Tarification</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Prix unitaire (FCFA) *</Label>
            <Input
              type="number"
              value={formData.prix_unitaire}
              onChange={(e) => handleChange('prix_unitaire', parseFloat(e.target.value))}
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-8">
            <Checkbox
              checked={formData.prix_a_partir_de}
              onCheckedChange={(checked) => handleChange('prix_a_partir_de', checked)}
            />
            <Label>Prix "à partir de"</Label>
          </div>
        </div>

        <div>
          <Label>Délai estimé</Label>
          <Input
            value={formData.delai_estime}
            onChange={(e) => handleChange('delai_estime', e.target.value)}
            placeholder="Ex: 3-5 jours ouvrés"
          />
        </div>
      </div>

      {/* Options personnalisables */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Options personnalisables</h3>
        
        <div className="flex gap-2">
          <Input
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            placeholder="Ex: Logo, Texte, Couleur..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
          />
          <Button type="button" onClick={addOption}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {formData.options_personnalisables.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.options_personnalisables.map((option, index) => (
              <div key={index} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                {option}
                <button type="button" onClick={() => removeOption(index)}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Tags (pour recherche)</h3>
        
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Ajouter un tag..."
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" onClick={addTag}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <div key={index} className="flex items-center gap-1 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm">
                {tag}
                <button type="button" onClick={() => removeTag(index)}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Gestion du stock */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Gestion du stock</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div>
            <Label>Stock actuel</Label>
            <Input
              type="number"
              min="0"
              value={formData.stock_actuel || 0}
              onChange={(e) => handleChange('stock_actuel', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Stock minimum (alerte)</Label>
            <Input
              type="number"
              min="0"
              value={formData.stock_minimum || 5}
              onChange={(e) => handleChange('stock_minimum', parseFloat(e.target.value) || 5)}
              placeholder="5"
            />
          </div>
          <div>
            <Label>Unité de mesure</Label>
            <Input
              value={formData.unite || 'unité'}
              onChange={(e) => handleChange('unite', e.target.value)}
              placeholder="unité, lot, m², ml..."
            />
          </div>
        </div>
      </div>

      {/* Visibilité */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-900">Visibilité</h3>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.actif}
              onCheckedChange={(checked) => handleChange('actif', checked)}
            />
            <Label>Produit actif</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={formData.visible_clients}
              onCheckedChange={(checked) => handleChange('visible_clients', checked)}
            />
            <Label>Visible dans le catalogue client</Label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {produit ? 'Mettre à jour' : 'Créer le produit'}
        </Button>
      </div>
    </form>
  );
}