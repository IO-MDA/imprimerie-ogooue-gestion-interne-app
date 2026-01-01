import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DemandeClientForm({ client, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    type_demande: 'devis',
    objet: '',
    description: '',
    budget_estime: '',
    delai_souhaite: '',
    fichiers_urls: []
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (e) => {
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
        fichiers_urls: [...prev.fichiers_urls, ...uploadedUrls]
      }));
      toast.success(`${uploadedUrls.length} fichier(s) ajouté(s)`);
    } catch (e) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      fichiers_urls: prev.fichiers_urls.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.objet || !formData.description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      // Create a conversation for this request
      const conversation = await base44.entities.ConversationClient.create({
        client_id: client.id,
        client_nom: client.nom,
        plateforme: 'interne',
        statut: 'nouveau',
        intention_detectee: formData.type_demande,
        dernier_message: `${formData.objet}\n\n${formData.description}`,
        dernier_message_date: new Date().toISOString()
      });

      // Create initial message
      await base44.entities.MessageCanal.create({
        conversation_id: conversation.id,
        plateforme: 'interne',
        expediteur: client.email || client.id,
        expediteur_nom: client.nom,
        contenu: `Type: ${formData.type_demande}\nObjet: ${formData.objet}\n\nDescription:\n${formData.description}\n\nBudget estimé: ${formData.budget_estime || 'Non spécifié'}\nDélai souhaité: ${formData.delai_souhaite || 'Non spécifié'}`,
        est_operateur: false,
        fichier_url: formData.fichiers_urls.length > 0 ? formData.fichiers_urls[0] : null
      });

      toast.success('Votre demande a été envoyée avec succès!');
      onSuccess();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label>Type de demande *</Label>
        <Select
          value={formData.type_demande}
          onValueChange={(v) => setFormData(prev => ({ ...prev, type_demande: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="devis">Demande de devis</SelectItem>
            <SelectItem value="commande">Nouvelle commande</SelectItem>
            <SelectItem value="information">Demande d'information</SelectItem>
            <SelectItem value="reclamation">Réclamation / SAV</SelectItem>
            <SelectItem value="suivi">Suivi de commande</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Objet de la demande *</Label>
        <Input
          value={formData.objet}
          onChange={(e) => setFormData(prev => ({ ...prev, objet: e.target.value }))}
          placeholder="Ex: Impression de 500 flyers A5"
          required
        />
      </div>

      <div>
        <Label>Description détaillée *</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Décrivez votre demande en détail: format, quantité, couleurs, délais..."
          rows={5}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Budget estimé (FCFA)</Label>
          <Input
            type="number"
            value={formData.budget_estime}
            onChange={(e) => setFormData(prev => ({ ...prev, budget_estime: e.target.value }))}
            placeholder="Ex: 50000"
          />
        </div>
        <div>
          <Label>Délai souhaité</Label>
          <Input
            value={formData.delai_souhaite}
            onChange={(e) => setFormData(prev => ({ ...prev, delai_souhaite: e.target.value }))}
            placeholder="Ex: 7 jours"
          />
        </div>
      </div>

      <div>
        <Label>Fichiers joints (optionnel)</Label>
        <div className="mt-2">
          <label className="cursor-pointer">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-600">
                {uploading ? 'Téléchargement...' : 'Cliquer pour ajouter des fichiers'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Images, PDF, documents...
              </p>
            </div>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {formData.fichiers_urls.length > 0 && (
          <div className="mt-3 space-y-2">
            {formData.fichiers_urls.map((url, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <span className="text-sm text-slate-600 truncate flex-1">
                  Fichier {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Note:</strong> Votre demande sera transmise à notre équipe qui vous répondra dans les plus brefs délais.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={submitting || uploading}
          className="bg-gradient-to-r from-blue-600 to-indigo-600"
        >
          {submitting ? (
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