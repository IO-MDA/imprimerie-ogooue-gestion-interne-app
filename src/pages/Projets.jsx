import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function Projets() {
  const [projets, setProjets] = useState([]);
  const [clients, setClients] = useState([]);
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  const [taches, setTaches] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingProjet, setEditingProjet] = useState(null);
  const [selectedProjet, setSelectedProjet] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    client_id: '',
    client_nom: '',
    devis_id: '',
    facture_id: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin_prevue: '',
    statut: 'planifie',
    budget: 0,
    responsable: '',
    responsable_nom: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [projetsData, clientsData, devisData, facturesData, tachesData, usersData, userData] = await Promise.all([
      base44.entities.Projet.list('-created_date'),
      base44.entities.Client.list(),
      base44.entities.Devis.list(),
      base44.entities.Facture.list(),
      base44.entities.Tache.list(),
      base44.entities.User.list(),
      base44.auth.me()
    ]);
    setProjets(projetsData);
    setClients(clientsData);
    setDevis(devisData);
    setFactures(facturesData);
    setTaches(tachesData);
    setUsers(usersData);
    setUser(userData);
    setIsLoading(false);
  };

  const calculateProgression = (projetId) => {
    const projetTaches = taches.filter(t => t.projet_id === projetId);
    if (projetTaches.length === 0) return 0;
    const avgProgression = projetTaches.reduce((sum, t) => sum + (t.progression || 0), 0) / projetTaches.length;
    return Math.round(avgProgression);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedClient = clients.find(c => c.id === formData.client_id);
    const selectedUser = users.find(u => u.email === formData.responsable);
    
    const data = {
      ...formData,
      client_nom: selectedClient?.nom || formData.client_nom,
      responsable_nom: selectedUser?.full_name || formData.responsable,
      progression: editingProjet ? calculateProgression(editingProjet.id) : 0
    };

    if (editingProjet) {
      await base44.entities.Projet.update(editingProjet.id, data);
      toast.success('Projet mis à jour');
    } else {
      await base44.entities.Projet.create(data);
      toast.success('Projet créé');
    }

    setShowForm(false);
    setEditingProjet(null);
    resetForm();
    loadData();
  };

  const handleDelete = async (projet) => {
    if (confirm(`Supprimer le projet ${projet.nom} ?`)) {
      await base44.entities.Projet.delete(projet.id);
      toast.success('Projet supprimé');
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      description: '',
      client_id: '',
      client_nom: '',
      devis_id: '',
      facture_id: '',
      date_debut: new Date().toISOString().split('T')[0],
      date_fin_prevue: '',
      statut: 'planifie',
      budget: 0,
      responsable: '',
      responsable_nom: ''
    });
  };

  const getStatutBadge = (statut) => {
    const config = {
      planifie: { label: 'Planifié', class: 'bg-blue-100 text-blue-700' },
      en_cours: { label: 'En cours', class: 'bg-amber-100 text-amber-700' },
      termine: { label: 'Terminé', class: 'bg-emerald-100 text-emerald-700' },
      annule: { label: 'Annulé', class: 'bg-slate-100 text-slate-700' }
    };
    return <Badge className={config[statut]?.class}>{config[statut]?.label}</Badge>;
  };

  const isAdmin = user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const projetTaches = selectedProjet ? taches.filter(t => t.projet_id === selectedProjet.id) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Projets</h1>
          <p className="text-slate-500">Suivez vos projets liés aux devis et factures</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => { setEditingProjet(null); resetForm(); setShowForm(true); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau projet
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg shadow-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total projets</p>
                <p className="text-3xl font-bold text-blue-900">{projets.length}</p>
              </div>
              <FolderKanban className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-amber-200/50 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">En cours</p>
                <p className="text-3xl font-bold text-amber-900">
                  {projets.filter(p => p.statut === 'en_cours').length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Terminés</p>
                <p className="text-3xl font-bold text-emerald-900">
                  {projets.filter(p => p.statut === 'termine').length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-emerald-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-purple-200/50 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Planifiés</p>
                <p className="text-3xl font-bold text-purple-900">
                  {projets.filter(p => p.statut === 'planifie').length}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      <div className="grid gap-4">
        {projets.length === 0 ? (
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="py-16 text-center">
              <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucun projet créé</p>
              {isAdmin && (
                <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">
                  Créer un projet
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          projets.map(projet => {
            const progression = calculateProgression(projet.id);
            const nbTaches = taches.filter(t => t.projet_id === projet.id).length;
            
            return (
              <Card key={projet.id} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <FolderKanban className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{projet.nom}</h3>
                          <p className="text-sm text-slate-500">{projet.client_nom}</p>
                        </div>
                        {getStatutBadge(projet.statut)}
                      </div>

                      {projet.description && (
                        <p className="text-sm text-slate-600 mb-3">{projet.description}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                        <div>
                          <p className="text-slate-500">Début</p>
                          <p className="font-medium">{moment(projet.date_debut).format('DD/MM/YYYY')}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Fin prévue</p>
                          <p className="font-medium">{moment(projet.date_fin_prevue).format('DD/MM/YYYY')}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Budget</p>
                          <p className="font-medium">{projet.budget?.toLocaleString()} FCFA</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Tâches</p>
                          <p className="font-medium">{nbTaches}</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-600">Progression</span>
                          <span className="font-medium text-slate-900">{progression}%</span>
                        </div>
                        <Progress value={progression} className="h-2" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedProjet(projet); setShowDetails(true); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => { setEditingProjet(projet); setFormData(projet); setShowForm(true); }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(projet)} className="text-rose-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProjet ? 'Modifier le projet' : 'Nouveau projet'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nom du projet *</Label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData(prev => ({ ...prev, client_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Responsable</Label>
                <Select value={formData.responsable} onValueChange={(v) => setFormData(prev => ({ ...prev, responsable: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.email}>{u.full_name || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Devis associé</Label>
                <Select value={formData.devis_id} onValueChange={(v) => setFormData(prev => ({ ...prev, devis_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucun</SelectItem>
                    {devis.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.numero} - {d.client_nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Facture associée</Label>
                <Select value={formData.facture_id} onValueChange={(v) => setFormData(prev => ({ ...prev, facture_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucune</SelectItem>
                    {factures.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.numero} - {f.client_nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date début</Label>
                <Input
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                />
              </div>

              <div>
                <Label>Date fin prévue *</Label>
                <Input
                  type="date"
                  value={formData.date_fin_prevue}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_fin_prevue: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget (FCFA)</Label>
                <Input
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData(prev => ({ ...prev, budget: Number(e.target.value) }))}
                />
              </div>

              <div>
                <Label>Statut</Label>
                <Select value={formData.statut} onValueChange={(v) => setFormData(prev => ({ ...prev, statut: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifie">Planifié</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                    <SelectItem value="annule">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600">
                {editingProjet ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Détails du projet</DialogTitle>
          </DialogHeader>
          {selectedProjet && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{selectedProjet.nom}</h3>
                {selectedProjet.description && <p className="text-slate-600">{selectedProjet.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Client</p>
                  <p className="font-medium">{selectedProjet.client_nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Responsable</p>
                  <p className="font-medium">{selectedProjet.responsable_nom || 'Non assigné'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Statut</p>
                  {getStatutBadge(selectedProjet.statut)}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Budget</p>
                  <p className="font-medium">{selectedProjet.budget?.toLocaleString()} FCFA</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date début</p>
                  <p className="font-medium">{moment(selectedProjet.date_debut).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date fin prévue</p>
                  <p className="font-medium">{moment(selectedProjet.date_fin_prevue).format('DD/MM/YYYY')}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Progression globale</p>
                <Progress value={calculateProgression(selectedProjet.id)} className="h-3" />
                <p className="text-right text-sm font-medium mt-1">{calculateProgression(selectedProjet.id)}%</p>
              </div>

              {projetTaches.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Tâches associées ({projetTaches.length})</h4>
                  <div className="space-y-2">
                    {projetTaches.map(tache => (
                      <div key={tache.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{tache.titre}</p>
                          <p className="text-xs text-slate-500">{tache.assigne_a_nom}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">{tache.statut}</Badge>
                          <span className="text-sm font-medium">{tache.progression}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}