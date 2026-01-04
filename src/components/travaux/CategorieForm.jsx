import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CategorieForm({ categorie, projetId, projetNom, onSave, onCancel }) {
  const [formData, setFormData] = useState(categorie || {
    projet_id: projetId,
    projet_nom: projetNom,
    nom: '',
    description: '',
    budget_prevu: '',
    couleur: 'blue',
    icone: 'Package',
    ordre: 0
  });

  const couleurs = [
    { value: 'blue', label: 'Bleu' },
    { value: 'green', label: 'Vert' },
    { value: 'orange', label: 'Orange' },
    { value: 'red', label: 'Rouge' },
    { value: 'purple', label: 'Violet' },
    { value: 'yellow', label: 'Jaune' },
    { value: 'pink', label: 'Rose' },
    { value: 'slate', label: 'Gris' }
  ];

  const icones = [
    'Package', 'Wrench', 'Zap', 'Droplet', 'PaintBucket', 
    'Hammer', 'Building', 'Utensils', 'ShoppingCart', 'Truck'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      budget_prevu: parseFloat(formData.budget_prevu) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nom de la catégorie *</Label>
        <Input
          value={formData.nom}
          onChange={(e) => setFormData({...formData, nom: e.target.value})}
          placeholder="Ex: Électricité, Plomberie, Mobilier..."
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
          <Label>Budget prévu (FCFA)</Label>
          <Input
            type="number"
            value={formData.budget_prevu}
            onChange={(e) => setFormData({...formData, budget_prevu: e.target.value})}
          />
        </div>

        <div>
          <Label>Ordre d'affichage</Label>
          <Input
            type="number"
            value={formData.ordre}
            onChange={(e) => setFormData({...formData, ordre: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Couleur</Label>
          <Select value={formData.couleur} onValueChange={(v) => setFormData({...formData, couleur: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {couleurs.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Icône</Label>
          <Select value={formData.icone} onValueChange={(v) => setFormData({...formData, icone: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {icones.map(ic => (
                <SelectItem key={ic} value={ic}>{ic}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-blue-600">
          {categorie ? 'Mettre à jour' : 'Créer la catégorie'}
        </Button>
      </div>
    </form>
  );
}