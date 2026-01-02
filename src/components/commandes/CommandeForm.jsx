import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function CommandeForm({ commande, onSave, onCancel }) {
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    client_id: '',
    client_nom: '',
    client_email: '',
    date_commande: new Date().toISOString().split('T')[0],
    date_livraison_prevue: '',
    type_prestation: '',
    description: '',
    quantite: 1,
    montant_total: 0,
    acompte: 0,
    statut: 'brouillon',
    commentaire_interne: '',
    commentaire_client: '',
    fichiers: []
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadClients();
    if (commande) {
      setFormData({...commande});
    }
  }, [commande]);

  const loadClients = async () => {
    const clientsData = await base44.entities.Client.list();
    setClients(clientsData);
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        client_id: clientId,
        client_nom: client.nom,
        client_email: client.email || ''
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        fichiers: [...(formData.fichiers || []), file_url]
      });
      toast.success('Fichier téléchargé');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Client *</Label>
        <Select 
          value={formData.client_id} 
          onValueChange={handleClientChange}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner un client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date commande *</Label>
          <Input
            type="date"
            value={formData.date_commande}
            onChange={(e) => setFormData({...formData, date_commande: e.target.value})}
            required
          />
        </div>
        <div>
          <Label>Date livraison prévue</Label>
          <Input
            type="date"
            value={formData.date_livraison_prevue}
            onChange={(e) => setFormData({...formData, date_livraison_prevue: e.target.value})}
          />
        </div>
      </div>

      <div>
        <Label>Type de prestation *</Label>
        <Input
          placeholder="Ex: Impression flyers, Cartes de visite..."
          value={formData.type_prestation}
          onChange={(e) => setFormData({...formData, type_prestation: e.target.value})}
          required
        />
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          placeholder="Détails de la commande..."
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quantité *</Label>
          <Input
            type="number"
            min="1"
            value={formData.quantite}
            onChange={(e) => setFormData({...formData, quantite: parseInt(e.target.value)})}
            required
          />
        </div>
        <div>
          <Label>Statut</Label>
          <Select 
            value={formData.statut} 
            onValueChange={(value) => setFormData({...formData, statut: value})}
          >
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Montant total (FCFA) *</Label>
          <Input
            type="number"
            min="0"
            value={formData.montant_total}
            onChange={(e) => setFormData({...formData, montant_total: parseFloat(e.target.value)})}
            required
          />
        </div>
        <div>
          <Label>Acompte (FCFA)</Label>
          <Input
            type="number"
            min="0"
            value={formData.acompte}
            onChange={(e) => setFormData({...formData, acompte: parseFloat(e.target.value)})}
          />
        </div>
      </div>

      <div>
        <Label>Commentaire client</Label>
        <Textarea
          placeholder="Message visible par le client..."
          value={formData.commentaire_client}
          onChange={(e) => setFormData({...formData, commentaire_client: e.target.value})}
          rows={2}
        />
      </div>

      <div>
        <Label>Note interne (privée)</Label>
        <Textarea
          placeholder="Note visible uniquement par l'équipe..."
          value={formData.commentaire_interne}
          onChange={(e) => setFormData({...formData, commentaire_interne: e.target.value})}
          rows={2}
          className="border-amber-200 focus:border-amber-400"
        />
      </div>

      <div>
        <Label>Fichiers (BAT, maquettes...)</Label>
        <div className="mt-2">
          <label className="flex items-center gap-2 px-4 py-2 border border-dashed rounded-lg cursor-pointer hover:bg-slate-50">
            <Upload className="w-4 h-4" />
            <span className="text-sm">{uploading ? 'Téléchargement...' : 'Ajouter un fichier'}</span>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
          {formData.fichiers && formData.fichiers.length > 0 && (
            <div className="mt-2 space-y-1">
              {formData.fichiers.map((url, i) => (
                <p key={i} className="text-xs text-blue-600 truncate">📎 Fichier {i + 1}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          {commande ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}