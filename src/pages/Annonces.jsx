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
import {
  Megaphone,
  Plus,
  Eye,
  Edit,
  Trash2,
  Users,
  UserCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function Annonces() {
  const [annonces, setAnnonces] = useState([]);
  const [clients, setClients] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingAnnonce, setEditingAnnonce] = useState(null);
  const [selectedAnnonce, setSelectedAnnonce] = useState(null);
  const [formData, setFormData] = useState({
    titre: '',
    contenu: '',
    type_cible: 'tous',
    clients_cibles: [],
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: moment().add(7, 'days').format('YYYY-MM-DD'),
    priorite: 'normale',
    active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [annoncesData, clientsData, userData] = await Promise.all([
      base44.entities.Annonce.list('-created_date'),
      base44.entities.Client.list(),
      base44.auth.me()
    ]);
    setAnnonces(annoncesData);
    setClients(clientsData);
    setUser(userData);
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      createur: user.email,
      createur_nom: user.full_name || user.email
    };

    if (editingAnnonce) {
      await base44.entities.Annonce.update(editingAnnonce.id, data);
      toast.success('Annonce mise à jour');
    } else {
      await base44.entities.Annonce.create(data);
      
      // Send email to targeted clients
      try {
        let targetClients = [];
        if (formData.type_cible === 'tous') {
          targetClients = clients;
        } else if (formData.type_cible === 'client_specifique' || formData.type_cible === 'groupe_clients') {
          targetClients = clients.filter(c => formData.clients_cibles.includes(c.id));
        }

        for (const client of targetClients) {
          if (client.email) {
            await base44.integrations.Core.SendEmail({
              from_name: 'Imprimerie Ogooué',
              to: client.email,
              subject: `${formData.priorite === 'urgente' ? '🚨 URGENT - ' : ''}${formData.titre}`,
              body: `Bonjour ${client.nom},

${formData.contenu}

Valide du ${moment(formData.date_debut).format('DD/MM/YYYY')} au ${moment(formData.date_fin).format('DD/MM/YYYY')}.

Cordialement,
Imprimerie Ogooué`
            });
          }
        }
        toast.success(`Annonce créée et envoyée à ${targetClients.length} client(s)`);
      } catch (e) {
        console.log('Email error:', e);
        toast.success('Annonce créée');
      }
    }

    setShowForm(false);
    setEditingAnnonce(null);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormData({
      titre: '',
      contenu: '',
      type_cible: 'tous',
      clients_cibles: [],
      date_debut: new Date().toISOString().split('T')[0],
      date_fin: moment().add(7, 'days').format('YYYY-MM-DD'),
      priorite: 'normale',
      active: true
    });
  };

  const handleDelete = async (annonce) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      await base44.entities.Annonce.delete(annonce.id);
      toast.success('Annonce supprimée');
      loadData();
    }
  };

  const toggleClientSelection = (clientId) => {
    setFormData(prev => ({
      ...prev,
      clients_cibles: prev.clients_cibles.includes(clientId)
        ? prev.clients_cibles.filter(id => id !== clientId)
        : [...prev.clients_cibles, clientId]
    }));
  };

  const getPriorityColor = (priorite) => {
    const colors = {
      urgente: 'bg-rose-100 text-rose-700',
      importante: 'bg-amber-100 text-amber-700',
      normale: 'bg-blue-100 text-blue-700'
    };
    return colors[priorite] || colors.normale;
  };

  const isAdmin = user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeAnnonces = annonces.filter(a => {
    const now = moment();
    const debut = moment(a.date_debut);
    const fin = moment(a.date_fin);
    return a.active && now.isBetween(debut, fin, 'day', '[]');
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Annonces Clients</h1>
          <p className="text-slate-500">Créez et gérez les annonces ciblées pour vos clients</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => { setEditingAnnonce(null); resetForm(); setShowForm(true); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle annonce
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg shadow-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Annonces actives</p>
                <p className="text-3xl font-bold text-blue-900">{activeAnnonces.length}</p>
              </div>
              <Megaphone className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Total annonces</p>
                <p className="text-3xl font-bold text-emerald-900">{annonces.length}</p>
              </div>
              <Calendar className="w-10 h-10 text-emerald-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-purple-200/50 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Clients ciblés</p>
                <p className="text-3xl font-bold text-purple-900">{clients.length}</p>
              </div>
              <Users className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Announcements Banner */}
      {activeAnnonces.length > 0 && (
        <div className="space-y-2">
          {activeAnnonces.slice(0, 2).map(annonce => (
            <Card key={annonce.id} className={`border-2 ${
              annonce.priorite === 'urgente' ? 'border-rose-300 bg-rose-50' :
              annonce.priorite === 'importante' ? 'border-amber-300 bg-amber-50' :
              'border-blue-300 bg-blue-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Megaphone className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-slate-900">{annonce.titre}</h3>
                      <Badge className={getPriorityColor(annonce.priorite)}>{annonce.priorite}</Badge>
                    </div>
                    <p className="text-sm text-slate-700">{annonce.contenu}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Announcements List */}
      <div className="grid gap-4">
        {annonces.length === 0 ? (
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="py-16 text-center">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune annonce créée</p>
              {isAdmin && (
                <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">
                  Créer une annonce
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          annonces.map(annonce => (
            <Card key={annonce.id} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{annonce.titre}</h3>
                      <Badge className={getPriorityColor(annonce.priorite)}>{annonce.priorite}</Badge>
                      {annonce.active ? (
                        <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                      {annonce.type_cible === 'tous' ? (
                        <Badge variant="outline">
                          <Users className="w-3 h-3 mr-1" />
                          Tous les clients
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <UserCheck className="w-3 h-3 mr-1" />
                          {annonce.clients_cibles?.length || 0} client(s)
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm mb-3">{annonce.contenu}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {moment(annonce.date_debut).format('DD/MM/YYYY')} - {moment(annonce.date_fin).format('DD/MM/YYYY')}
                      </span>
                      <span>Par: {annonce.createur_nom}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedAnnonce(annonce); setShowDetails(true); }}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => { setEditingAnnonce(annonce); setFormData(annonce); setShowForm(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(annonce)} className="text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAnnonce ? 'Modifier l\'annonce' : 'Nouvelle annonce'}</DialogTitle>
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
              <Label>Contenu *</Label>
              <Textarea
                value={formData.contenu}
                onChange={(e) => setFormData(prev => ({ ...prev, contenu: e.target.value }))}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Priorité</Label>
                <Select value={formData.priorite} onValueChange={(v) => setFormData(prev => ({ ...prev, priorite: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="importante">Importante</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ciblage</Label>
                <Select value={formData.type_cible} onValueChange={(v) => setFormData(prev => ({ ...prev, type_cible: v, clients_cibles: [] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les clients</SelectItem>
                    <SelectItem value="client_specifique">Client spécifique</SelectItem>
                    <SelectItem value="groupe_clients">Groupe de clients</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(formData.type_cible === 'client_specifique' || formData.type_cible === 'groupe_clients') && (
              <div>
                <Label>Sélectionner les clients</Label>
                <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {clients.map(client => (
                    <label key={client.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.clients_cibles.includes(client.id)}
                        onChange={() => toggleClientSelection(client.id)}
                        className="rounded"
                      />
                      <span className="text-sm">{client.nom}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date début</Label>
                <Input
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Date fin</Label>
                <Input
                  type="date"
                  value={formData.date_fin}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_fin: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600">
                {editingAnnonce ? 'Mettre à jour' : 'Créer et envoyer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de l'annonce</DialogTitle>
          </DialogHeader>
          {selectedAnnonce && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{selectedAnnonce.titre}</h3>
                <p className="text-slate-600">{selectedAnnonce.contenu}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Priorité</p>
                  <Badge className={getPriorityColor(selectedAnnonce.priorite)}>{selectedAnnonce.priorite}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Statut</p>
                  <Badge className={selectedAnnonce.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}>
                    {selectedAnnonce.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date début</p>
                  <p className="font-medium">{moment(selectedAnnonce.date_debut).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date fin</p>
                  <p className="font-medium">{moment(selectedAnnonce.date_fin).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Créé par</p>
                  <p className="font-medium">{selectedAnnonce.createur_nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ciblage</p>
                  <p className="font-medium">
                    {selectedAnnonce.type_cible === 'tous' ? 'Tous les clients' : `${selectedAnnonce.clients_cibles?.length || 0} client(s)`}
                  </p>
                </div>
              </div>

              {selectedAnnonce.type_cible !== 'tous' && selectedAnnonce.clients_cibles?.length > 0 && (
                <div>
                  <p className="text-sm text-slate-500 mb-2">Clients ciblés</p>
                  <div className="flex flex-wrap gap-2">
                    {clients.filter(c => selectedAnnonce.clients_cibles.includes(c.id)).map(client => (
                      <Badge key={client.id} variant="outline">{client.nom}</Badge>
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