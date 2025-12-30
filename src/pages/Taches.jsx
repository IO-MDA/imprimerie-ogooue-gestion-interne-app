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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Calendar,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Upload,
  Eye,
  Edit,
  Trash2,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function Taches() {
  const [taches, setTaches] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingTache, setEditingTache] = useState(null);
  const [selectedTache, setSelectedTache] = useState(null);
  const [filterTab, setFilterTab] = useState('toutes');
  const [filterStatut, setFilterStatut] = useState('all');
  const [validationData, setValidationData] = useState({
    commentaire: '',
    fichier: null
  });
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    assigne_a: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_echeance: '',
    priorite: 'normale',
    categorie: 'autre',
    statut: 'en_attente',
    progression: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [tachesData, usersData, userData] = await Promise.all([
      base44.entities.Tache.list('-date_echeance'),
      base44.entities.User.list(),
      base44.auth.me()
    ]);
    setTaches(tachesData);
    setUsers(usersData);
    setUser(userData);
    setIsLoading(false);
  };

  const isAdmin = user?.role === 'admin';

  const getUrgenceColor = (dateEcheance, statut) => {
    if (statut === 'terminee' || statut === 'validee') return 'emerald';
    
    const today = moment();
    const echeance = moment(dateEcheance);
    const diffDays = echeance.diff(today, 'days');

    if (diffDays < 0) return 'rose'; // Dépassé
    if (diffDays === 0) return 'orange'; // Aujourd'hui
    if (diffDays <= 2) return 'amber'; // Dans 2 jours
    if (diffDays <= 7) return 'yellow'; // Dans une semaine
    return 'blue'; // Normal
  };

  const getUrgenceLabel = (dateEcheance, statut) => {
    if (statut === 'terminee') return 'Terminée';
    if (statut === 'validee') return 'Validée';
    
    const today = moment();
    const echeance = moment(dateEcheance);
    const diffDays = echeance.diff(today, 'days');

    if (diffDays < 0) return `En retard de ${Math.abs(diffDays)}j`;
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Demain';
    return `Dans ${diffDays}j`;
  };

  const getPriorityIcon = (priorite) => {
    const icons = {
      urgente: '🔴',
      haute: '🟠',
      normale: '🟡',
      basse: '🟢'
    };
    return icons[priorite] || '⚪';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const selectedUser = users.find(u => u.email === formData.assigne_a);
    const data = {
      ...formData,
      assigne_a_nom: selectedUser?.full_name || formData.assigne_a,
      createur: user.email,
      createur_nom: user.full_name || user.email
    };

    if (editingTache) {
      await base44.entities.Tache.update(editingTache.id, data);
      toast.success('Tâche mise à jour');
    } else {
      await base44.entities.Tache.create(data);
      
      // Send email notification
      try {
        await base44.integrations.Core.SendEmail({
          from_name: 'Imprimerie Ogooué',
          to: formData.assigne_a,
          subject: `Nouvelle tâche assignée: ${formData.titre}`,
          body: `Bonjour ${selectedUser?.full_name || formData.assigne_a},

Une nouvelle tâche vous a été assignée par ${user.full_name || user.email}.

Titre: ${formData.titre}
Description: ${formData.description || 'N/A'}
Priorité: ${formData.priorite}
Date d'échéance: ${moment(formData.date_echeance).format('DD/MM/YYYY')}

Veuillez consulter la plateforme pour plus de détails.

Cordialement,
Imprimerie Ogooué`
        });
      } catch (e) {
        console.log('Email error:', e);
      }
      
      toast.success('Tâche créée et notification envoyée');
    }

    setShowForm(false);
    setEditingTache(null);
    setFormData({
      titre: '',
      description: '',
      assigne_a: '',
      date_debut: new Date().toISOString().split('T')[0],
      date_echeance: '',
      priorite: 'normale',
      categorie: 'autre',
      statut: 'en_attente',
      progression: 0
    });
    loadData();
  };

  const handleValidation = async () => {
    if (!validationData.fichier && !validationData.commentaire) {
      toast.error('Veuillez ajouter un commentaire ou une pièce jointe');
      return;
    }

    let fileUrl = null;
    if (validationData.fichier) {
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: validationData.fichier
      });
      fileUrl = uploadResult.file_url;
    }

    await base44.entities.Tache.update(selectedTache.id, {
      statut: 'terminee',
      progression: 100,
      preuve_fichier_url: fileUrl,
      commentaire_validation: validationData.commentaire,
      date_validation: new Date().toISOString(),
      valide_par: user.email
    });

    // Send notification to creator and admins
    try {
      const allUsers = await base44.entities.User.list();
      const notifyUsers = allUsers.filter(u => 
        u.role === 'admin' || u.email === selectedTache.createur
      );
      
      for (const targetUser of notifyUsers) {
        await base44.integrations.Core.SendEmail({
          from_name: 'Imprimerie Ogooué',
          to: targetUser.email,
          subject: `Tâche terminée: ${selectedTache.titre}`,
          body: `Bonjour ${targetUser.full_name || targetUser.email},

${user.full_name || user.email} a marqué la tâche "${selectedTache.titre}" comme terminée.

Commentaire: ${validationData.commentaire || 'N/A'}
${fileUrl ? 'Une pièce jointe a été fournie.' : ''}

Date d'échéance: ${moment(selectedTache.date_echeance).format('DD/MM/YYYY')}

Consultez la plateforme pour voir les détails.

Cordialement,
Imprimerie Ogooué`
        });
      }
    } catch (e) {
      console.log('Email error:', e);
    }

    toast.success('Tâche validée avec succès');
    setShowValidation(false);
    setSelectedTache(null);
    setValidationData({ commentaire: '', fichier: null });
    loadData();
  };

  const handleDelete = async (tache) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      await base44.entities.Tache.delete(tache.id);
      toast.success('Tâche supprimée');
      loadData();
    }
  };

  const filteredTaches = taches.filter(t => {
    // Filter by tab
    if (filterTab === 'mes_taches' && t.assigne_a !== user?.email) return false;
    if (filterTab === 'creees' && t.createur !== user?.email) return false;
    
    // Filter by status
    if (filterStatut !== 'all' && t.statut !== filterStatut) return false;
    
    return true;
  });

  const mesTaches = taches.filter(t => t.assigne_a === user?.email);
  const enRetard = mesTaches.filter(t => 
    t.statut !== 'terminee' && t.statut !== 'validee' && 
    moment(t.date_echeance).isBefore(moment(), 'day')
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des tâches</h1>
          <p className="text-slate-500">Planifiez et suivez les tâches de l'équipe</p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => { setEditingTache(null); setShowForm(true); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle tâche
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg shadow-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Mes tâches</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{mesTaches.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-amber-200/50 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">En cours</p>
                <p className="text-3xl font-bold text-amber-900 mt-1">
                  {mesTaches.filter(t => t.statut === 'en_cours').length}
                </p>
              </div>
              <Clock className="w-10 h-10 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-rose-200/50 bg-gradient-to-br from-rose-50 to-rose-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-600 font-medium">En retard</p>
                <p className="text-3xl font-bold text-rose-900 mt-1">{enRetard}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-rose-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Terminées</p>
                <p className="text-3xl font-bold text-emerald-900 mt-1">
                  {mesTaches.filter(t => t.statut === 'terminee' || t.statut === 'validee').length}
                </p>
              </div>
              <CheckCircle className="w-10 h-10 text-emerald-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Tabs value={filterTab} onValueChange={setFilterTab} className="flex-1">
              <TabsList>
                <TabsTrigger value="toutes">Toutes</TabsTrigger>
                <TabsTrigger value="mes_taches">Mes tâches</TabsTrigger>
                {isAdmin && <TabsTrigger value="creees">Créées par moi</TabsTrigger>}
              </TabsList>
            </Tabs>
            
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="terminee">Terminée</SelectItem>
                <SelectItem value="validee">Validée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="grid gap-4">
        {filteredTaches.length === 0 ? (
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="py-16 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune tâche trouvée</p>
            </CardContent>
          </Card>
        ) : (
          filteredTaches.map(tache => {
            const urgenceColor = getUrgenceColor(tache.date_echeance, tache.statut);
            const colorClasses = {
              rose: 'from-rose-500 to-pink-600',
              orange: 'from-orange-500 to-red-600',
              amber: 'from-amber-500 to-orange-600',
              yellow: 'from-yellow-500 to-amber-600',
              blue: 'from-blue-500 to-indigo-600',
              emerald: 'from-emerald-500 to-teal-600'
            };

            return (
              <Card key={tache.id} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-2 h-20 rounded-full bg-gradient-to-b ${colorClasses[urgenceColor]} flex-shrink-0`} />
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="text-xl">{getPriorityIcon(tache.priorite)}</span>
                            <h3 className="text-lg font-semibold text-slate-900">{tache.titre}</h3>
                            <Badge className={`bg-${urgenceColor}-100 text-${urgenceColor}-700`}>
                              {getUrgenceLabel(tache.date_echeance, tache.statut)}
                            </Badge>
                            <Badge variant="outline">{tache.categorie}</Badge>
                          </div>
                          
                          {tache.description && (
                            <p className="text-sm text-slate-600 mb-3">{tache.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {tache.assigne_a_nom}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {moment(tache.date_echeance).format('DD/MM/YYYY')}
                            </span>
                          </div>

                          <div className="mt-3">
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-600">Progression</span>
                              <span className="font-medium text-slate-900">{tache.progression}%</span>
                            </div>
                            <Progress value={tache.progression} className="h-2" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedTache(tache); setShowDetails(true); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {tache.assigne_a === user?.email && (tache.statut !== 'terminee' && tache.statut !== 'validee') && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => { setSelectedTache(tache); setShowValidation(true); }}
                              className="text-emerald-600"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => { setEditingTache(tache); setFormData(tache); setShowForm(true); }}>
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(tache)} className="text-rose-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
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
            <DialogTitle>{editingTache ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Titre *</Label>
              <Input 
                value={formData.titre}
                onChange={(e) => setFormData(prev => ({ ...prev, titre: e.target.value }))}
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
                <Label>Assigner à *</Label>
                <Select value={formData.assigne_a} onValueChange={(v) => setFormData(prev => ({ ...prev, assigne_a: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priorité</Label>
                <Select value={formData.priorite} onValueChange={(v) => setFormData(prev => ({ ...prev, priorite: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">🟢 Basse</SelectItem>
                    <SelectItem value="normale">🟡 Normale</SelectItem>
                    <SelectItem value="haute">🟠 Haute</SelectItem>
                    <SelectItem value="urgente">🔴 Urgente</SelectItem>
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
                <Label>Date échéance *</Label>
                <Input 
                  type="date"
                  value={formData.date_echeance}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_echeance: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Catégorie</Label>
                <Select value={formData.categorie} onValueChange={(v) => setFormData(prev => ({ ...prev, categorie: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administration">Administration</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Statut</Label>
                <Select value={formData.statut} onValueChange={(v) => setFormData(prev => ({ ...prev, statut: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="terminee">Terminée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600">
                {editingTache ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Validation Dialog */}
      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Valider la tâche terminée</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-900">{selectedTache?.titre}</p>
              <p className="text-sm text-blue-700 mt-1">Marquez cette tâche comme terminée</p>
            </div>

            <div>
              <Label>Commentaire de validation</Label>
              <Textarea 
                value={validationData.commentaire}
                onChange={(e) => setValidationData(prev => ({ ...prev, commentaire: e.target.value }))}
                placeholder="Décrivez ce qui a été accompli..."
                rows={4}
              />
            </div>

            <div>
              <Label>Pièce jointe (preuve)</Label>
              <div className="mt-2">
                <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-slate-400 mr-2" />
                  <span className="text-sm text-slate-600">
                    {validationData.fichier ? validationData.fichier.name : 'Cliquer pour uploader un fichier'}
                  </span>
                  <input 
                    type="file"
                    onChange={(e) => setValidationData(prev => ({ ...prev, fichier: e.target.files[0] }))}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowValidation(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleValidation}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Valider la tâche
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la tâche</DialogTitle>
          </DialogHeader>
          {selectedTache && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{selectedTache.titre}</h3>
                {selectedTache.description && (
                  <p className="text-slate-600">{selectedTache.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Assigné à</p>
                  <p className="font-medium">{selectedTache.assigne_a_nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Créé par</p>
                  <p className="font-medium">{selectedTache.createur_nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Priorité</p>
                  <p className="font-medium">{getPriorityIcon(selectedTache.priorite)} {selectedTache.priorite}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Statut</p>
                  <Badge>{selectedTache.statut}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date début</p>
                  <p className="font-medium">{moment(selectedTache.date_debut).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date échéance</p>
                  <p className="font-medium">{moment(selectedTache.date_echeance).format('DD/MM/YYYY')}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">Progression</p>
                <Progress value={selectedTache.progression} className="h-3" />
                <p className="text-right text-sm font-medium mt-1">{selectedTache.progression}%</p>
              </div>

              {selectedTache.commentaire_validation && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm font-medium text-emerald-900 mb-1">Commentaire de validation</p>
                  <p className="text-sm text-emerald-700">{selectedTache.commentaire_validation}</p>
                  {selectedTache.date_validation && (
                    <p className="text-xs text-emerald-600 mt-2">
                      Validé le {moment(selectedTache.date_validation).format('DD/MM/YYYY à HH:mm')}
                    </p>
                  )}
                </div>
              )}

              {selectedTache.preuve_fichier_url && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Pièce jointe</p>
                  <a 
                    href={selectedTache.preuve_fichier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                  >
                    <Upload className="w-4 h-4" />
                    Voir le fichier
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}