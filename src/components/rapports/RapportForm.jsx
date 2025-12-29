import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    services_data: rapport?.services_data || SERVICES.map(service => ({
      service,
      recettes: 0,
      depenses: 0,
      details_recettes: [],
      details_depenses: []
    })),
    observations: rapport?.observations || '',
    statut: rapport?.statut || 'brouillon'
  });
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeService, setActiveService] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    // Recalculate totals
    let totalRecettes = 0;
    let totalDepenses = 0;
    
    const updatedServicesData = formData.services_data.map(serviceData => {
      const recettes = serviceData.details_recettes.reduce((sum, item) => 
        sum + (item.montant * (item.quantite || 1)), 0);
      const depenses = serviceData.details_depenses.reduce((sum, item) => 
        sum + item.montant, 0);
      
      totalRecettes += recettes;
      totalDepenses += depenses;
      
      return { ...serviceData, recettes, depenses };
    });

    setFormData(prev => ({ 
      ...prev, 
      services_data: updatedServicesData,
      total_recettes: totalRecettes,
      total_depenses: totalDepenses
    }));
  }, [formData.services_data.map(s => JSON.stringify(s.details_recettes) + JSON.stringify(s.details_depenses)).join(',')]);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);
  };

  const updateServiceData = (serviceIndex, field, value) => {
    const updated = [...formData.services_data];
    updated[serviceIndex] = { ...updated[serviceIndex], [field]: value };
    setFormData(prev => ({ ...prev, services_data: updated }));
  };

  const addRecetteLine = (serviceIndex) => {
    const updated = [...formData.services_data];
    updated[serviceIndex].details_recettes.push({ libelle: '', montant: 0, quantite: 1 });
    setFormData(prev => ({ ...prev, services_data: updated }));
  };

  const addDepenseLine = (serviceIndex) => {
    const updated = [...formData.services_data];
    updated[serviceIndex].details_depenses.push({ libelle: '', montant: 0 });
    setFormData(prev => ({ ...prev, services_data: updated }));
  };

  const updateRecetteLine = (serviceIndex, lineIndex, field, value) => {
    const updated = [...formData.services_data];
    updated[serviceIndex].details_recettes[lineIndex] = {
      ...updated[serviceIndex].details_recettes[lineIndex],
      [field]: field === 'libelle' ? value : Number(value)
    };
    setFormData(prev => ({ ...prev, services_data: updated }));
  };

  const updateDepenseLine = (serviceIndex, lineIndex, field, value) => {
    const updated = [...formData.services_data];
    updated[serviceIndex].details_depenses[lineIndex] = {
      ...updated[serviceIndex].details_depenses[lineIndex],
      [field]: field === 'libelle' ? value : Number(value)
    };
    setFormData(prev => ({ ...prev, services_data: updated }));
  };

  const removeRecetteLine = (serviceIndex, lineIndex) => {
    const updated = [...formData.services_data];
    updated[serviceIndex].details_recettes = updated[serviceIndex].details_recettes.filter((_, i) => i !== lineIndex);
    setFormData(prev => ({ ...prev, services_data: updated }));
  };

  const removeDepenseLine = (serviceIndex, lineIndex) => {
    const updated = [...formData.services_data];
    updated[serviceIndex].details_depenses = updated[serviceIndex].details_depenses.filter((_, i) => i !== lineIndex);
    setFormData(prev => ({ ...prev, services_data: updated }));
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

  const totalRecettes = formData.services_data.reduce((sum, s) => sum + (s.recettes || 0), 0);
  const totalDepenses = formData.services_data.reduce((sum, s) => sum + (s.depenses || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Date</Label>
          <Input 
            type="date" 
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>
        <div>
          <Label>Opérateur</Label>
          <Input value={user?.full_name || user?.email || ''} disabled />
        </div>
      </div>

      {/* Services Tabs */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
          <CardTitle>Saisie par service</CardTitle>
          <p className="text-sm text-slate-500 mt-1">Remplissez les données pour chaque service de la journée</p>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeService.toString()} onValueChange={(v) => setActiveService(parseInt(v))}>
            <div className="px-4 pt-4 overflow-x-auto">
              <TabsList className="inline-flex">
                {SERVICES.map((service, index) => {
                  const serviceData = formData.services_data[index];
                  const hasData = serviceData.details_recettes.length > 0 || serviceData.details_depenses.length > 0;
                  return (
                    <TabsTrigger key={index} value={index.toString()} className="relative">
                      {service.split(' ')[0]}
                      {hasData && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {SERVICES.map((service, serviceIndex) => {
              const serviceData = formData.services_data[serviceIndex];
              return (
                <TabsContent key={serviceIndex} value={serviceIndex.toString()} className="p-4 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">{service}</h3>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Bénéfice</p>
                      <p className={`text-xl font-bold ${(serviceData.recettes - serviceData.depenses) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {((serviceData.recettes || 0) - (serviceData.depenses || 0)).toLocaleString()} FCFA
                      </p>
                    </div>
                  </div>

                  {/* Recettes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-emerald-700">Recettes - {(serviceData.recettes || 0).toLocaleString()} FCFA</h4>
                      <Button variant="outline" size="sm" onClick={() => addRecetteLine(serviceIndex)}>
                        <Plus className="w-4 h-4 mr-1" /> Ajouter
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {serviceData.details_recettes.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Aucune recette ajoutée</p>
                      ) : (
                        serviceData.details_recettes.map((line, lineIndex) => (
                          <div key={lineIndex} className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
                            <Input 
                              placeholder="Description"
                              value={line.libelle}
                              onChange={(e) => updateRecetteLine(serviceIndex, lineIndex, 'libelle', e.target.value)}
                              className="flex-1 bg-white"
                            />
                            <Input 
                              type="number"
                              placeholder="Qté"
                              value={line.quantite}
                              onChange={(e) => updateRecetteLine(serviceIndex, lineIndex, 'quantite', e.target.value)}
                              className="w-20 bg-white"
                            />
                            <Input 
                              type="number"
                              placeholder="Montant"
                              value={line.montant}
                              onChange={(e) => updateRecetteLine(serviceIndex, lineIndex, 'montant', e.target.value)}
                              className="w-32 bg-white"
                            />
                            <span className="text-sm text-slate-600 w-28 text-right font-medium">
                              {(line.montant * (line.quantite || 1)).toLocaleString()} FCFA
                            </span>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeRecetteLine(serviceIndex, lineIndex)}
                            >
                              <Trash2 className="w-4 h-4 text-slate-400" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Dépenses */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-rose-700">Dépenses - {(serviceData.depenses || 0).toLocaleString()} FCFA</h4>
                      <Button variant="outline" size="sm" onClick={() => addDepenseLine(serviceIndex)}>
                        <Plus className="w-4 h-4 mr-1" /> Ajouter
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {serviceData.details_depenses.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Aucune dépense ajoutée</p>
                      ) : (
                        serviceData.details_depenses.map((line, lineIndex) => (
                          <div key={lineIndex} className="flex items-center gap-2 p-2 bg-rose-50 rounded-lg">
                            <Input 
                              placeholder="Description de la dépense"
                              value={line.libelle}
                              onChange={(e) => updateDepenseLine(serviceIndex, lineIndex, 'libelle', e.target.value)}
                              className="flex-1 bg-white"
                            />
                            <Input 
                              type="number"
                              placeholder="Montant"
                              value={line.montant}
                              onChange={(e) => updateDepenseLine(serviceIndex, lineIndex, 'montant', e.target.value)}
                              className="w-40 bg-white"
                            />
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => removeDepenseLine(serviceIndex, lineIndex)}
                            >
                              <Trash2 className="w-4 h-4 text-slate-400" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      {/* Résumé global */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="py-6">
          <h3 className="text-lg font-semibold mb-4">Résumé de la journée</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white/10 rounded-xl">
              <p className="text-slate-300 text-sm">Total Recettes</p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{totalRecettes.toLocaleString()} FCFA</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-xl">
              <p className="text-slate-300 text-sm">Total Dépenses</p>
              <p className="text-3xl font-bold text-rose-400 mt-1">{totalDepenses.toLocaleString()} FCFA</p>
            </div>
            <div className="text-center p-4 bg-white/10 rounded-xl">
              <p className="text-slate-300 text-sm">Bénéfice Net</p>
              <p className={`text-3xl font-bold mt-1 ${(totalRecettes - totalDepenses) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {(totalRecettes - totalDepenses).toLocaleString()} FCFA
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau récapitulatif par service */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle>Tableau récapitulatif par service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-slate-600">Service</th>
                  <th className="text-right p-3 text-sm font-medium text-slate-600">Recettes</th>
                  <th className="text-right p-3 text-sm font-medium text-slate-600">Dépenses</th>
                  <th className="text-right p-3 text-sm font-medium text-slate-600">Bénéfice</th>
                </tr>
              </thead>
              <tbody>
                {formData.services_data.map((serviceData, index) => (
                  <tr key={index} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-medium">{serviceData.service}</td>
                    <td className="p-3 text-right text-emerald-600 font-medium">
                      {(serviceData.recettes || 0).toLocaleString()} FCFA
                    </td>
                    <td className="p-3 text-right text-rose-600 font-medium">
                      {(serviceData.depenses || 0).toLocaleString()} FCFA
                    </td>
                    <td className={`p-3 text-right font-bold ${(serviceData.recettes - serviceData.depenses) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                      {((serviceData.recettes || 0) - (serviceData.depenses || 0)).toLocaleString()} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Observations */}
      <div>
        <Label>Observations générales de la journée</Label>
        <Textarea 
          value={formData.observations}
          onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
          placeholder="Remarques, événements particuliers de la journée..."
          className="mt-1"
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          variant="secondary"
          onClick={() => handleSubmit('brouillon')}
          disabled={isSubmitting}
        >
          <Save className="w-4 h-4 mr-2" />
          Enregistrer brouillon
        </Button>
        <Button 
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          onClick={() => handleSubmit('soumis')}
          disabled={isSubmitting}
        >
          <Send className="w-4 h-4 mr-2" />
          Soumettre le rapport
        </Button>
      </div>
    </div>
  );
}