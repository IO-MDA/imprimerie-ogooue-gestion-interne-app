import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DemandeForm({ client, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    type_demande: 'devis',
    titre: '',
    description: '',
    produit_concerne: '',
    budget_estime: '',
    delai_souhaite: ''
  });
  const [fichiers, setFichiers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        // Vérifier la taille (20 MB max)
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} est trop volumineux (max 20 MB)`);
          continue;
        }

        // Uploader le fichier
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push({
          url: file_url,
          nom: file.name,
          type: file.type
        });
      }

      setFichiers([...fichiers, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} fichier(s) ajouté(s)`);
    } catch (e) {
      toast.error('Erreur lors de l\'upload');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index) => {
    setFichiers(fichiers.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titre || !formData.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSending(true);
    try {
      await base44.entities.DemandeClient.create({
        client_id: client.id,
        client_nom: client.nom,
        client_email: client.email,
        ...formData,
        budget_estime: formData.budget_estime ? parseFloat(formData.budget_estime) : null,
        fichiers: fichiers.map(f => f.url),
        statut: 'nouveau',
        historique_statuts: [{
          statut: 'nouveau',
          date: new Date().toISOString(),
          par: client.nom,
          commentaire: 'Demande créée'
        }]
      });

      toast.success('Demande envoyée avec succès');
      onSuccess();
    } catch (e) {
      toast.error('Erreur lors de l\'envoi');
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Type de demande *</Label>
        <Select
          value={formData.type_demande}
          onValueChange={(v) => setFormData({ ...formData, type_demande: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="devis">Demande de devis</SelectItem>
            <SelectItem value="information">Demande d'information</SelectItem>
            <SelectItem value="commande_personnalisee">Commande personnalisée</SelectItem>
            <SelectItem value="reclamation">Réclamation</SelectItem>
            <SelectItem value="suivi">Suivi de commande</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Titre *</Label>
        <Input
          value={formData.titre}
          onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
          placeholder="Ex: Devis pour impression de cartes de visite"
          required
        />
      </div>

      <div>
        <Label>Description détaillée *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Décrivez votre besoin en détail..."
          rows={4}
          required
        />
      </div>

      <div>
        <Label>Produit concerné</Label>
        <Input
          value={formData.produit_concerne}
          onChange={(e) => setFormData({ ...formData, produit_concerne: e.target.value })}
          placeholder="Ex: Cartes de visite"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Budget estimé (FCFA)</Label>
          <Input
            type="number"
            value={formData.budget_estime}
            onChange={(e) => setFormData({ ...formData, budget_estime: e.target.value })}
            placeholder="Ex: 50000"
          />
        </div>
        <div>
          <Label>Délai souhaité</Label>
          <Input
            value={formData.delai_souhaite}
            onChange={(e) => setFormData({ ...formData, delai_souhaite: e.target.value })}
            placeholder="Ex: 3 jours"
          />
        </div>
      </div>

      {/* Upload fichiers */}
      <div>
        <Label>Fichiers joints (logo, maquette, BAT)</Label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors">
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.pdf,.ai,.psd"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
            <div className="text-center">
              {uploading ? (
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              ) : (
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              )}
              <p className="text-sm text-slate-600">
                {uploading ? 'Téléchargement...' : 'Cliquez pour ajouter des fichiers'}
              </p>
              <p className="text-xs text-slate-400">PNG, JPG, PDF (max 20 MB)</p>
            </div>
          </label>

          {fichiers.length > 0 && (
            <div className="space-y-2">
              {fichiers.map((fichier, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-700">{fichier.nom}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={sending || uploading}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Envoi...
            </>
          ) : (
            'Envoyer la demande'
          )}
        </Button>
      </div>
    </form>
  );
}