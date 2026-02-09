import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function DocumentForm({ type, document, onSave, onCancel }) {
  const isDevis = type === 'devis';
  const [clients, setClients] = useState([]);
  const [produits, setProduits] = useState([]);
  const [showClientSearch, setShowClientSearch] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedLineIndex, setSelectedLineIndex] = useState(null);
  
  const [formData, setFormData] = useState({
    client_id: document?.client_id || '',
    client_nom: document?.client_nom || '',
    client_email: document?.client_email || '',
    client_telephone: document?.client_telephone || '',
    client_adresse: document?.client_adresse || '',
    date_emission: document?.date_emission || new Date().toISOString().split('T')[0],
    date_validite: document?.date_validite || '',
    date_echeance: document?.date_echeance || '',
    lignes: document?.lignes || [{ description: '', quantite: 1, prix_unitaire: 0, total: 0 }],
    tva: document?.tva || 0,
    notes: document?.notes || '',
    statut: document?.statut || 'brouillon',
    mode_paiement: document?.mode_paiement || ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
    loadProduits();
  }, []);

  const loadClients = async () => {
    const data = await base44.entities.Client.list();
    setClients(data);
  };

  const loadProduits = async () => {
    const data = await base44.entities.ProduitCatalogue.list();
    setProduits(data);
  };

  const selectClient = (client) => {
    setFormData(prev => ({
      ...prev,
      client_id: client.id,
      client_nom: client.nom,
      client_email: client.email || '',
      client_telephone: client.telephone || '',
      client_adresse: client.adresse || ''
    }));
    setShowClientSearch(false);
  };

  const updateLine = (index, field, value) => {
    const updated = [...formData.lignes];
    updated[index] = { 
      ...updated[index], 
      [field]: field === 'description' ? value : Number(value)
    };
    if (field === 'quantite' || field === 'prix_unitaire') {
      updated[index].total = updated[index].quantite * updated[index].prix_unitaire;
    }
    setFormData(prev => ({ ...prev, lignes: updated }));
  };

  const selectProduct = (product) => {
    const updated = [...formData.lignes];
    updated[selectedLineIndex] = {
      ...updated[selectedLineIndex],
      description: product.nom,
      prix_unitaire: product.prix || 0,
      total: updated[selectedLineIndex].quantite * (product.prix || 0)
    };
    setFormData(prev => ({ ...prev, lignes: updated }));
    setShowProductSearch(false);
    setSelectedLineIndex(null);
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lignes: [...prev.lignes, { description: '', quantite: 1, prix_unitaire: 0, total: 0 }]
    }));
  };

  const removeLine = (index) => {
    if (formData.lignes.length > 1) {
      setFormData(prev => ({
        ...prev,
        lignes: prev.lignes.filter((_, i) => i !== index)
      }));
    }
  };

  const sousTotal = formData.lignes.reduce((sum, line) => sum + line.total, 0);
  const tvaAmount = sousTotal * (formData.tva / 100);
  const total = sousTotal + tvaAmount;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const now = new Date();
    const prefix = isDevis ? 'DEV' : 'FAC';
    const numero = document?.numero || `${prefix}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    const data = {
      ...formData,
      numero,
      sous_total: sousTotal,
      total
    };
    
    await onSave(data);
    setIsSubmitting(false);
  };

  const filteredClients = clients.filter(c => 
    c.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProduits = produits.filter(p => 
    p.nom?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    p.categorie?.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Informations client</span>
            <Dialog open={showClientSearch} onOpenChange={setShowClientSearch}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Search className="w-4 h-4 mr-2" />
                  Rechercher un client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Sélectionner un client</DialogTitle>
                </DialogHeader>
                <Input 
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-4"
                />
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => selectClient(client)}
                      className="w-full p-3 text-left rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <p className="font-medium">{client.nom}</p>
                      <p className="text-sm text-slate-500">{client.email} • {client.telephone}</p>
                    </button>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nom / Raison sociale *</Label>
            <Input 
              value={formData.client_nom}
              onChange={(e) => setFormData(prev => ({ ...prev, client_nom: e.target.value }))}
              placeholder="Nom du client"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input 
              type="email"
              value={formData.client_email}
              onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
            />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input 
              value={formData.client_telephone}
              onChange={(e) => setFormData(prev => ({ ...prev, client_telephone: e.target.value }))}
            />
          </div>
          <div>
            <Label>Adresse</Label>
            <Input 
              value={formData.client_adresse}
              onChange={(e) => setFormData(prev => ({ ...prev, client_adresse: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Date d'émission</Label>
          <Input 
            type="date"
            value={formData.date_emission}
            onChange={(e) => setFormData(prev => ({ ...prev, date_emission: e.target.value }))}
          />
        </div>
        {isDevis ? (
          <div>
            <Label>Date de validité</Label>
            <Input 
              type="date"
              value={formData.date_validite}
              onChange={(e) => setFormData(prev => ({ ...prev, date_validite: e.target.value }))}
            />
          </div>
        ) : (
          <>
            <div>
              <Label>Date d'échéance</Label>
              <Input 
                type="date"
                value={formData.date_echeance}
                onChange={(e) => setFormData(prev => ({ ...prev, date_echeance: e.target.value }))}
              />
            </div>
            <div>
              <Label>Mode de paiement</Label>
              <Select 
                value={formData.mode_paiement}
                onValueChange={(value) => setFormData(prev => ({ ...prev, mode_paiement: value }))}
              >
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
          </>
        )}
      </div>

      {/* Lines */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle>Détail des prestations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden md:grid grid-cols-12 gap-3 text-sm font-medium text-slate-500 px-1">
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Quantité</div>
            <div className="col-span-2">Prix unitaire</div>
            <div className="col-span-2">Total</div>
            <div className="col-span-1"></div>
          </div>
          {formData.lignes.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-12 md:col-span-5 flex gap-2">
                <Input 
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) => updateLine(index, 'description', e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSelectedLineIndex(index);
                    setShowProductSearch(true);
                  }}
                  title="Choisir du catalogue"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <div className="col-span-4 md:col-span-2">
                <Input 
                  type="number"
                  placeholder="Qté"
                  value={line.quantite}
                  onChange={(e) => updateLine(index, 'quantite', e.target.value)}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <Input 
                  type="number"
                  placeholder="Prix"
                  value={line.prix_unitaire}
                  onChange={(e) => updateLine(index, 'prix_unitaire', e.target.value)}
                />
              </div>
              <div className="col-span-3 md:col-span-2 text-right font-medium">
                {line.total.toLocaleString()} FCFA
              </div>
              <div className="col-span-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeLine(index)}
                  disabled={formData.lignes.length === 1}
                >
                  <Trash2 className="w-4 h-4 text-slate-400" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addLine}>
            <Plus className="w-4 h-4 mr-2" /> Ajouter une ligne
          </Button>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full md:w-80 space-y-3">
          <div className="flex justify-between text-slate-600">
            <span>Sous-total</span>
            <span className="font-medium">{sousTotal.toLocaleString()} FCFA</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600">TVA (%)</span>
            <Input 
              type="number"
              value={formData.tva}
              onChange={(e) => setFormData(prev => ({ ...prev, tva: Number(e.target.value) }))}
              className="w-20 text-right"
            />
            <span className="font-medium w-32 text-right">{tvaAmount.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t pt-3">
            <span>Total</span>
            <span className="text-blue-600">{total.toLocaleString()} FCFA</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label>Notes / Conditions</Label>
        <Textarea 
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Conditions de paiement, remarques..."
          className="mt-1"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button 
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.client_nom}
        >
          <Save className="w-4 h-4 mr-2" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}