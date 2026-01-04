import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';
import { Plus, Phone, Mail, MapPin, Star, TrendingUp, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FournisseursView({ fournisseurs, etapes, materiaux, onUpdate, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    telephone: '',
    email: '',
    adresse: '',
    type: 'autre',
    note: 5
  });

  const handleSave = async () => {
    try {
      if (editingFournisseur) {
        await base44.entities.FournisseurTravaux.update(editingFournisseur.id, formData);
        toast.success('Fournisseur mis à jour');
      } else {
        await base44.entities.FournisseurTravaux.create(formData);
        toast.success('Fournisseur créé');
      }
      setShowForm(false);
      setEditingFournisseur(null);
      setFormData({ nom: '', telephone: '', email: '', adresse: '', type: 'autre', note: 5 });
      onUpdate();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Supprimer ce fournisseur ?')) return;
    await base44.entities.FournisseurTravaux.delete(id);
    toast.success('Fournisseur supprimé');
    onUpdate();
  };

  const getFournisseurStats = (fournisseurId) => {
    const etapesFournisseur = etapes.filter(e => e.fournisseur_id === fournisseurId);
    const materiauxFournisseur = materiaux.filter(m => m.fournisseur_id === fournisseurId);
    
    const totalDepense = etapesFournisseur.reduce((sum, e) => sum + (e.montant_depense || 0), 0) +
                         materiauxFournisseur.reduce((sum, m) => sum + (m.total || 0), 0);
    const totalPaye = etapesFournisseur.reduce((sum, e) => sum + (e.montant_paye || 0), 0) +
                      materiauxFournisseur.reduce((sum, m) => sum + (m.montant_paye || 0), 0);
    const nbCommandes = etapesFournisseur.length + materiauxFournisseur.length;
    
    return { totalDepense, totalPaye, nbCommandes };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Fournisseurs</h2>
        {isAdmin && (
          <Button 
            onClick={() => { 
              setEditingFournisseur(null); 
              setFormData({ nom: '', telephone: '', email: '', adresse: '', type: 'autre', note: 5 });
              setShowForm(true); 
            }}
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau fournisseur
          </Button>
        )}
      </div>

      {fournisseurs.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <p className="text-slate-500">Aucun fournisseur</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fournisseurs.map(f => {
            const stats = getFournisseurStats(f.id);
            
            return (
              <Card 
                key={f.id} 
                className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedFournisseur(f)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{f.nom}</CardTitle>
                      <Badge className="mt-2">{f.type}</Badge>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFournisseur(f);
                            setFormData(f);
                            setShowForm(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(f.id);
                          }}
                          className="text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {f.telephone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{f.telephone}</span>
                    </div>
                  )}
                  {f.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600">{f.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">{f.note}/5</span>
                  </div>
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500">Total dépensé</p>
                        <p className="font-semibold text-blue-600">{stats.totalDepense.toLocaleString()} F</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Commandes</p>
                        <p className="font-semibold">{stats.nbCommandes}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFournisseur ? 'Modifier' : 'Nouveau'} fournisseur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({...formData, nom: e.target.value})}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={formData.telephone}
                  onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input
                value={formData.adresse}
                onChange={(e) => setFormData({...formData, adresse: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="materiaux">Matériaux</SelectItem>
                    <SelectItem value="impression">Impression</SelectItem>
                    <SelectItem value="cuisine">Cuisine</SelectItem>
                    <SelectItem value="equipement">Équipement</SelectItem>
                    <SelectItem value="main_oeuvre">Main d'œuvre</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Note /5</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.note}
                  onChange={(e) => setFormData({...formData, note: parseFloat(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} className="bg-blue-600">
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showProjetForm} onOpenChange={setShowProjetForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProjet ? 'Modifier' : 'Nouveau'} projet avancé</DialogTitle>
          </DialogHeader>
          <ProjetTravauxForm
            projet={editingProjet}
            onSave={handleSaveProjet}
            onCancel={() => { setShowProjetForm(false); setEditingProjet(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showCategorieForm} onOpenChange={setShowCategorieForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategorie ? 'Modifier' : 'Nouvelle'} catégorie</DialogTitle>
          </DialogHeader>
          <CategorieForm
            categorie={editingCategorie}
            projetId={selectedProjet?.id}
            projetNom={selectedProjet?.nom}
            onSave={handleSaveCategorie}
            onCancel={() => { setShowCategorieForm(false); setEditingCategorie(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showEtapeForm} onOpenChange={setShowEtapeForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEtape ? 'Modifier' : 'Nouvelle'} étape</DialogTitle>
          </DialogHeader>
          <EtapeForm
            etape={editingEtape}
            projetId={selectedProjet?.id}
            categorieId={selectedCategorie?.id}
            categorieNom={selectedCategorie?.nom}
            onSave={handleSaveEtape}
            onCancel={() => { setShowEtapeForm(false); setEditingEtape(null); setSelectedCategorie(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Fournisseur Detail Dialog */}
      <Dialog open={!!selectedFournisseur} onOpenChange={() => setSelectedFournisseur(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedFournisseur?.nom}</DialogTitle>
          </DialogHeader>
          {selectedFournisseur && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-0">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-600">Total dépensé</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {getFournisseurStats(selectedFournisseur.id).totalDepense.toLocaleString()} F
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-emerald-50 border-0">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-600">Commandes</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {getFournisseurStats(selectedFournisseur.id).nbCommandes}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Historique des achats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {etapes.filter(e => e.fournisseur_id === selectedFournisseur.id).map(e => (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{e.nom}</p>
                          <p className="text-xs text-slate-500">{e.categorie_nom}</p>
                        </div>
                        <p className="font-semibold text-blue-600">{e.montant_depense.toLocaleString()} F</p>
                      </div>
                    ))}
                    {materiaux.filter(m => m.fournisseur_id === selectedFournisseur.id).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-slate-900">{m.designation}</p>
                          <p className="text-xs text-slate-500">{m.quantite} {m.unite}</p>
                        </div>
                        <p className="font-semibold text-blue-600">{m.total.toLocaleString()} F</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}