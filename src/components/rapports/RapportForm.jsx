import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SERVICES = [
  "PHOTOCOPIE",
  "IMPRESSION & SAISIE", 
  "PHOTO ID",
  "SCAN & PLASTIFICATION",
  "VENTE ARTICLES",
  "IMPRIMERIE"
];

export default function RapportForm({ rapport, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    date: rapport?.date || new Date().toISOString().split('T')[0],
    service: rapport?.service || '',
    recettes: rapport?.recettes || 0,
    depenses: rapport?.depenses || 0,
    details_recettes: rapport?.details_recettes || [{ libelle: '', montant: 0, quantite: 1 }],
    details_depenses: rapport?.details_depenses || [{ libelle: '', montant: 0 }],
    observations: rapport?.observations || '',
    statut: rapport?.statut || 'brouillon'
  });
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const totalRecettes = formData.details_recettes.reduce((sum, item) => sum + (item.montant * (item.quantite || 1)), 0);
    const totalDepenses = formData.details_depenses.reduce((sum, item) => sum + item.montant, 0);
    setFormData(prev => ({ ...prev, recettes: totalRecettes, depenses: totalDepenses }));
  }, [formData.details_recettes, formData.details_depenses]);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const addRecetteLine = () => {
    setFormData(prev => ({
      ...prev,
      details_recettes: [...prev.details_recettes, { libelle: '', montant: 0, quantite: 1 }]
    }));
  };

  const addDepenseLine = () => {
    setFormData(prev => ({
      ...prev,
      details_depenses: [...prev.details_depenses, { libelle: '', montant: 0 }]
    }));
  };

  const updateRecetteLine = (index, field, value) => {
    const updated = [...formData.details_recettes];
    updated[index] = { ...updated[index], [field]: field === 'libelle' ? value : Number(value) };
    setFormData(prev => ({ ...prev, details_recettes: updated }));
  };

  const updateDepenseLine = (index, field, value) => {
    const updated = [...formData.details_depenses];
    updated[index] = { ...updated[index], [field]: field === 'libelle' ? value : Number(value) };
    setFormData(prev => ({ ...prev, details_depenses: updated }));
  };

  const removeRecetteLine = (index) => {
    if (formData.details_recettes.length > 1) {
      setFormData(prev => ({
        ...prev,
        details_recettes: prev.details_recettes.filter((_, i) => i !== index)
      }));
    }
  };

  const removeDepenseLine = (index) => {
    if (formData.details_depenses.length > 1) {
      setFormData(prev => ({
        ...prev,
        details_depenses: prev.details_depenses.filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (statut) => {
    setIsSubmitting(true);
    const data = {
      ...formData,
      statut,
      operateur: user?.email,
      operateur_nom: user?.full_name || user?.email,
      verrouille: statut === 'soumis'
    };
    await onSave(data);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Date</Label>
          <Input 
            type="date" 
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>
        <div>
          <Label>Service</Label>
          <Select 
            value={formData.service}
            onValueChange={(value) => setFormData(prev => ({ ...prev, service: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un service" />
            </SelectTrigger>
            <SelectContent>
              {SERVICES.map(service => (
                <SelectItem key={service} value={service}>{service}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Opérateur</Label>
          <Input value={user?.full_name || user?.email || ''} disabled />
        </div>
      </div>

      {/* Recettes */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-lg">
          <CardTitle className="text-emerald-700 flex items-center justify-between">
            <span>Recettes</span>
            <span className="text-2xl font-bold">{formData.recettes.toLocaleString()} FCFA</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {formData.details_recettes.map((line, index) => (
            <div key={index} className="flex items-center gap-3">
              <Input 
                placeholder="Description"
                value={line.libelle}
                onChange={(e) => updateRecetteLine(index, 'libelle', e.target.value)}
                className="flex-1"
              />
              <Input 
                type="number"
                placeholder="Qté"
                value={line.quantite}
                onChange={(e) => updateRecetteLine(index, 'quantite', e.target.value)}
                className="w-20"
              />
              <Input 
                type="number"
                placeholder="Montant"
                value={line.montant}
                onChange={(e) => updateRecetteLine(index, 'montant', e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-slate-500 w-28 text-right">
                {(line.montant * (line.quantite || 1)).toLocaleString()} FCFA
              </span>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => removeRecetteLine(index)}
                disabled={formData.details_recettes.length === 1}
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addRecetteLine} className="mt-2">
            <Plus className="w-4 h-4 mr-2" /> Ajouter une ligne
          </Button>
        </CardContent>
      </Card>

      {/* Dépenses */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-t-lg">
          <CardTitle className="text-rose-700 flex items-center justify-between">
            <span>Dépenses</span>
            <span className="text-2xl font-bold">{formData.depenses.toLocaleString()} FCFA</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {formData.details_depenses.map((line, index) => (
            <div key={index} className="flex items-center gap-3">
              <Input 
                placeholder="Description de la dépense"
                value={line.libelle}
                onChange={(e) => updateDepenseLine(index, 'libelle', e.target.value)}
                className="flex-1"
              />
              <Input 
                type="number"
                placeholder="Montant"
                value={line.montant}
                onChange={(e) => updateDepenseLine(index, 'montant', e.target.value)}
                className="w-40"
              />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => removeDepenseLine(index)}
                disabled={formData.details_depenses.length === 1}
              >
                <Trash2 className="w-4 h-4 text-slate-400" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addDepenseLine} className="mt-2">
            <Plus className="w-4 h-4 mr-2" /> Ajouter une dépense
          </Button>
        </CardContent>
      </Card>

      {/* Observations */}
      <div>
        <Label>Observations</Label>
        <Textarea 
          value={formData.observations}
          onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
          placeholder="Remarques ou observations sur la journée..."
          className="mt-1"
        />
      </div>

      {/* Résumé */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-slate-400 text-sm">Total Recettes</p>
              <p className="text-2xl font-bold text-emerald-400">{formData.recettes.toLocaleString()} FCFA</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Total Dépenses</p>
              <p className="text-2xl font-bold text-rose-400">{formData.depenses.toLocaleString()} FCFA</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm">Bénéfice Net</p>
              <p className={`text-2xl font-bold ${formData.recettes - formData.depenses >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(formData.recettes - formData.depenses).toLocaleString()} FCFA
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          variant="secondary"
          onClick={() => handleSubmit('brouillon')}
          disabled={isSubmitting || !formData.service}
        >
          <Save className="w-4 h-4 mr-2" />
          Enregistrer brouillon
        </Button>
        <Button 
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          onClick={() => handleSubmit('soumis')}
          disabled={isSubmitting || !formData.service}
        >
          <Send className="w-4 h-4 mr-2" />
          Soumettre le rapport
        </Button>
      </div>
    </div>
  );
}