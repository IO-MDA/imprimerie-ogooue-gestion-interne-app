import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ProjetTravauxForm({ projet, onSave, onCancel }) {
  const [formData, setFormData] = useState(projet || {
    nom: '',
    type_projet: 'autre',
    type_projet_personnalise: '',
    lieu: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin_prevue: '',
    budget_total_prevu: '',
    description: '',
    responsable_id: '',
    responsable_nom: ''
  });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const usersData = await base44.entities.User.list();
    setUsers(usersData);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      budget_total_prevu: parseFloat(formData.budget_total_prevu) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nom du projet *</Label>
        <Input
          value={formData.nom}
          onChange={(e) => setFormData({...formData, nom: e.target.value})}
          placeholder="Ex: Rénovation Restaurant OGOOUE"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type de projet *</Label>
          <Select value={formData.type_projet} onValueChange={(v) => setFormData({...formData, type_projet: v})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="imprimerie">Imprimerie</SelectItem>
              <SelectItem value="restaurant">Restaurant</SelectItem>
              <SelectItem value="chantier">Chantier</SelectItem>
              <SelectItem value="evenement">Événement</SelectItem>
              <SelectItem value="autre">Autre (personnalisé)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.type_projet === 'autre' && (
          <div>
            <Label>Type personnalisé</Label>
            <Input
              value={formData.type_projet_personnalise}
              onChange={(e) => setFormData({...formData, type_projet_personnalise: e.target.value})}
              placeholder="Ex: Boutique, Bureau..."
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Lieu</Label>
          <Input
            value={formData.lieu}
            onChange={(e) => setFormData({...formData, lieu: e.target.value})}
            placeholder="Localisation du projet"
          />
        </div>

        <div>
          <Label>Budget prévu (FCFA)</Label>
          <Input
            type="number"
            value={formData.budget_total_prevu}
            onChange={(e) => setFormData({...formData, budget_total_prevu: e.target.value})}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date de début *</Label>
          <Input
            type="date"
            value={formData.date_debut}
            onChange={(e) => setFormData({...formData, date_debut: e.target.value})}
            required
          />
        </div>

        <div>
          <Label>Date de fin prévue</Label>
          <Input
            type="date"
            value={formData.date_fin_prevue}
            onChange={(e) => setFormData({...formData, date_fin_prevue: e.target.value})}
          />
        </div>
      </div>

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
            <SelectValue placeholder="Sélectionner un responsable" />
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
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-blue-600">
          {projet ? 'Mettre à jour' : 'Créer le projet'}
        </Button>
      </div>
    </form>
  );
}