import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import RoleProtection from '@/components/auth/RoleProtection';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  HardHat, Plus, FolderKanban, Layers, Package, Users, 
  TrendingUp, DollarSign, Calendar, Image as ImageIcon, BarChart3,
  Edit, Trash2, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import ProjetTravauxForm from '@/components/travaux/ProjetTravauxForm';
import CategorieForm from '@/components/travaux/CategorieForm';
import EtapeForm from '@/components/travaux/EtapeForm';
import TimelineView from '@/components/travaux/TimelineView';
import PhotosView from '@/components/travaux/PhotosView';

export default function Travaux() {
  const [user, setUser] = useState(null);
  const [projets, setProjets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [etapes, setEtapes] = useState([]);
  const [selectedProjet, setSelectedProjet] = useState(null);
  const [activeView, setActiveView] = useState('categories');
  const [isLoading, setIsLoading] = useState(true);
  
  const [showProjetForm, setShowProjetForm] = useState(false);
  const [showCategorieForm, setShowCategorieForm] = useState(false);
  const [showEtapeForm, setShowEtapeForm] = useState(false);
  
  const [editingProjet, setEditingProjet] = useState(null);
  const [editingCategorie, setEditingCategorie] = useState(null);
  const [editingEtape, setEditingEtape] = useState(null);
  const [selectedCategorie, setSelectedCategorie] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProjet) {
      loadProjetData(selectedProjet.id);
    }
  }, [selectedProjet]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, projetsData] = await Promise.all([
        base44.auth.me(),
        base44.entities.ProjetTravaux.list('-created_date')
      ]);
      setUser(userData);
      setProjets(projetsData);
      
      if (projetsData.length > 0 && !selectedProjet) {
        setSelectedProjet(projetsData[0]);
      }
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjetData = async (projetId) => {
    try {
      const [categoriesData, etapesData] = await Promise.all([
        base44.entities.CategorieTravaux.filter({ projet_id: projetId }),
        base44.entities.EtapeTravaux.filter({ projet_id: projetId })
      ]);
      setCategories(categoriesData.sort((a, b) => (a.ordre || 0) - (b.ordre || 0)));
      setEtapes(etapesData);
      
      // Recalculer les totaux
      await recalculerTotaux(projetId, categoriesData, etapesData);
    } catch (e) {
      console.error('Error loading projet data:', e);
    }
  };

  const recalculerTotaux = async (projetId, cats, etps) => {
    // Calculer par catégorie
    const updatedCategories = [];
    for (const cat of cats) {
      const etapesCat = etps.filter(e => e.categorie_id === cat.id);
      const budget_depense = etapesCat.reduce((sum, e) => sum + (e.montant_depense || 0), 0);
      const budget_paye = etapesCat.reduce((sum, e) => sum + (e.montant_paye || 0), 0);
      const etapesTerminees = etapesCat.filter(e => e.statut === 'termine').length;
      const avancement = etapesCat.length > 0 ? (etapesTerminees / etapesCat.length) * 100 : 0;
      
      if (cat.budget_depense !== budget_depense || cat.budget_paye !== budget_paye || cat.avancement !== avancement) {
        await base44.entities.CategorieTravaux.update(cat.id, {
          budget_depense,
          budget_paye,
          avancement
        });
        updatedCategories.push({ ...cat, budget_depense, budget_paye, avancement });
      } else {
        updatedCategories.push(cat);
      }
    }
    
    // Calculer pour le projet
    const budget_total_depense = updatedCategories.reduce((sum, c) => sum + (c.budget_depense || 0), 0);
    const budget_total_paye = updatedCategories.reduce((sum, c) => sum + (c.budget_paye || 0), 0);
    const avancementProjet = updatedCategories.length > 0 
      ? updatedCategories.reduce((sum, c) => sum + (c.avancement || 0), 0) / updatedCategories.length 
      : 0;
    
    await base44.entities.ProjetTravaux.update(projetId, {
      budget_total_depense,
      budget_total_paye,
      avancement: avancementProjet
    });
    
    setCategories(updatedCategories);
    loadData();
  };

  const handleSaveProjet = async (data) => {
    try {
      if (editingProjet) {
        await base44.entities.ProjetTravaux.update(editingProjet.id, data);
        toast.success('Projet mis à jour');
      } else {
        const newProjet = await base44.entities.ProjetTravaux.create(data);
        setSelectedProjet(newProjet);
        toast.success('Projet créé');
      }
      setShowProjetForm(false);
      setEditingProjet(null);
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleSaveCategorie = async (data) => {
    try {
      if (editingCategorie) {
        await base44.entities.CategorieTravaux.update(editingCategorie.id, data);
        toast.success('Catégorie mise à jour');
      } else {
        await base44.entities.CategorieTravaux.create(data);
        toast.success('Catégorie créée');
      }
      setShowCategorieForm(false);
      setEditingCategorie(null);
      loadProjetData(selectedProjet.id);
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const handleSaveEtape = async (data) => {
    try {
      if (editingEtape) {
        await base44.entities.EtapeTravaux.update(editingEtape.id, data);
        toast.success('Étape mise à jour');
      } else {
        await base44.entities.EtapeTravaux.create(data);
        toast.success('Étape créée');
      }
      setShowEtapeForm(false);
      setEditingEtape(null);
      loadProjetData(selectedProjet.id);
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const handleDeleteCategorie = async (id) => {
    if (!confirm('Supprimer cette catégorie et toutes ses étapes ?')) return;
    const etapesCategorie = etapes.filter(e => e.categorie_id === id);
    for (const etape of etapesCategorie) {
      await base44.entities.EtapeTravaux.delete(etape.id);
    }
    await base44.entities.CategorieTravaux.delete(id);
    toast.success('Catégorie supprimée');
    loadProjetData(selectedProjet.id);
  };

  const handleDeleteEtape = async (id) => {
    if (!confirm('Supprimer cette étape ?')) return;
    await base44.entities.EtapeTravaux.delete(id);
    toast.success('Étape supprimée');
    loadProjetData(selectedProjet.id);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const projetStats = {
    totalDepense: selectedProjet?.budget_total_depense || 0,
    totalPaye: selectedProjet?.budget_total_paye || 0,
    resteAPayer: (selectedProjet?.budget_total_depense || 0) - (selectedProjet?.budget_total_paye || 0),
    avancement: selectedProjet?.avancement || 0
  };

  return (
    <RoleProtection allowedRoles={['admin', 'manager', 'user']} user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <HardHat className="w-7 h-7 text-orange-600" />
              Travaux Groupe Ogooué
            </h1>
            <p className="text-slate-500">Suivi des travaux Papeterie & Restaurant</p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => { setEditingProjet(null); setShowProjetForm(true); }}
              className="bg-gradient-to-r from-orange-600 to-red-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau projet
            </Button>
          )}
        </div>

        {projets.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 mb-4">Aucun projet de travaux</p>
              {isAdmin && (
                <Button onClick={() => { setEditingProjet(null); setShowProjetForm(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer le premier projet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Sélection projet */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {projets.map(p => (
                <Button
                  key={p.id}
                  variant={selectedProjet?.id === p.id ? 'default' : 'outline'}
                  onClick={() => setSelectedProjet(p)}
                  className="whitespace-nowrap"
                >
                  <FolderKanban className="w-4 h-4 mr-2" />
                  {p.nom}
                </Button>
              ))}
            </div>

            {selectedProjet && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total dépensé</p>
                          <p className="text-lg font-bold text-slate-900">
                            {projetStats.totalDepense.toLocaleString()} F
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total payé</p>
                          <p className="text-lg font-bold text-emerald-900">
                            {projetStats.totalPaye.toLocaleString()} F
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Reste à payer</p>
                          <p className="text-lg font-bold text-rose-900">
                            {projetStats.resteAPayer.toLocaleString()} F
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Avancement</p>
                          <p className="text-lg font-bold text-blue-900">
                            {projetStats.avancement.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Vues */}
                <Tabs value={activeView} onValueChange={setActiveView}>
                  <TabsList>
                    <TabsTrigger value="categories">
                      <Layers className="w-4 h-4 mr-2" />
                      Catégories
                    </TabsTrigger>
                    <TabsTrigger value="timeline">
                      <Calendar className="w-4 h-4 mr-2" />
                      Timeline
                    </TabsTrigger>
                    <TabsTrigger value="photos">
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Photos
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="categories" className="space-y-4 mt-6">
                    {isAdmin && (
                      <Button 
                        onClick={() => { setEditingCategorie(null); setShowCategorieForm(true); }}
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter une catégorie
                      </Button>
                    )}

                    {categories.length === 0 ? (
                      <Card className="border-0 shadow-lg">
                        <CardContent className="py-16 text-center">
                          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500">Aucune catégorie</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                        {categories.map(cat => {
                          const etapesCat = etapes.filter(e => e.categorie_id === cat.id);
                          
                          return (
                            <Card key={cat.id} className="border-0 shadow-lg">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <CardTitle className="flex items-center gap-2">
                                    {cat.nom}
                                    <Badge>{etapesCat.length} étape(s)</Badge>
                                  </CardTitle>
                                  {isAdmin && (
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => { 
                                          setEditingCategorie(cat); 
                                          setShowCategorieForm(true); 
                                        }}
                                      >
                                        <Edit className="w-4 h-4" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => handleDeleteCategorie(cat.id)}
                                        className="text-rose-600"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <p className="text-slate-500">Budget prévu</p>
                                    <p className="font-semibold">{cat.budget_prevu.toLocaleString()} F</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Dépensé</p>
                                    <p className="font-semibold text-orange-600">{cat.budget_depense.toLocaleString()} F</p>
                                  </div>
                                  <div>
                                    <p className="text-slate-500">Avancement</p>
                                    <p className="font-semibold text-blue-600">{cat.avancement.toFixed(0)}%</p>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-slate-600">Étapes</span>
                                    {isAdmin && (
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => { 
                                          setSelectedCategorie(cat); 
                                          setEditingEtape(null); 
                                          setShowEtapeForm(true); 
                                        }}
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Ajouter
                                      </Button>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    {etapesCat.map(etape => (
                                      <div 
                                        key={etape.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                      >
                                        <div className="flex-1">
                                          <p className="font-medium text-slate-900">{etape.nom}</p>
                                          <p className="text-xs text-slate-500">
                                            {etape.responsable_nom || 'Non assigné'}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge className={
                                            etape.statut === 'termine' ? 'bg-emerald-100 text-emerald-700' :
                                            etape.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                                            etape.statut === 'bloque' ? 'bg-rose-100 text-rose-700' :
                                            'bg-slate-100 text-slate-700'
                                          }>
                                            {etape.statut}
                                          </Badge>
                                          {isAdmin && (
                                            <>
                                              <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => { 
                                                  setSelectedCategorie(cat);
                                                  setEditingEtape(etape); 
                                                  setShowEtapeForm(true); 
                                                }}
                                              >
                                                <Edit className="w-3 h-3" />
                                              </Button>
                                              <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => handleDeleteEtape(etape.id)}
                                                className="text-rose-600"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </Button>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-6">
                    <TimelineView etapes={etapes} />
                  </TabsContent>

                  <TabsContent value="photos" className="mt-6">
                    <PhotosView etapes={etapes} />
                  </TabsContent>
                </Tabs>
              </>
            )}
          </>
        )}

        {/* Dialogs */}
        <Dialog open={showProjetForm} onOpenChange={setShowProjetForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingProjet ? 'Modifier' : 'Nouveau'} projet</DialogTitle>
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
          <DialogContent className="max-w-3xl">
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
      </div>
    </RoleProtection>
  );
}