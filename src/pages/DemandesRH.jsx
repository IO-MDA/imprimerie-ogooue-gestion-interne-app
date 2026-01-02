import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  XCircle, 
  FileText,
  Calendar,
  DollarSign,
  GraduationCap,
  Upload
} from 'lucide-react';
import RoleProtection from '@/components/auth/RoleProtection';
import moment from 'moment';
import { toast } from 'sonner';
import { formatMontant } from '@/components/utils/formatMontant';

export default function DemandesRH() {
  const [user, setUser] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [formData, setFormData] = useState({
    type_demande: 'conge',
    titre: '',
    description: '',
    date_debut: '',
    date_fin: '',
    montant: 0,
    formation_nom: '',
    formation_cout: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, demandesData] = await Promise.all([
        base44.auth.me(),
        base44.entities.DemandeRH.list('-created_date')
      ]);
      setUser(userData);
      
      // Filtrer selon le rôle
      if (userData.role === 'admin' || userData.role === 'manager') {
        setDemandes(demandesData);
      } else {
        setDemandes(demandesData.filter(d => d.demandeur_id === userData.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const handleSubmit = async () => {
    try {
      const demandeData = {
        ...formData,
        demandeur_id: user.id,
        demandeur_nom: user.full_name,
        demandeur_email: user.email,
        historique: [{
          date: new Date().toISOString(),
          action: 'Demande créée',
          par: user.full_name
        }]
      };

      await base44.entities.DemandeRH.create(demandeData);
      toast.success('Demande créée avec succès');
      setShowForm(false);
      setFormData({
        type_demande: 'conge',
        titre: '',
        description: '',
        date_debut: '',
        date_fin: '',
        montant: 0,
        formation_nom: '',
        formation_cout: 0
      });
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleApprobation = async (demande, statut, commentaire) => {
    try {
      const historique = [
        ...(demande.historique || []),
        {
          date: new Date().toISOString(),
          action: statut === 'approuvee' ? 'Approuvée' : 'Rejetée',
          par: user.full_name,
          commentaire
        }
      ];

      await base44.entities.DemandeRH.update(demande.id, {
        statut,
        approbateur_id: user.id,
        approbateur_nom: user.full_name,
        date_approbation: new Date().toISOString(),
        commentaire_approbation: commentaire,
        historique
      });

      // Notifier le demandeur par email
      try {
        await base44.integrations.Core.SendEmail({
          to: demande.demandeur_email,
          subject: `Demande ${statut === 'approuvee' ? 'approuvée' : 'rejetée'} : ${demande.titre}`,
          body: `Bonjour ${demande.demandeur_nom},

Votre demande "${demande.titre}" a été ${statut === 'approuvee' ? 'approuvée' : 'rejetée'}.

${commentaire ? `Commentaire : ${commentaire}` : ''}

Cordialement,
${user.full_name}`,
          from_name: 'Imprimerie Ogooué - RH'
        });
      } catch (e) {
        console.log('Email notification failed');
      }

      toast.success(`Demande ${statut === 'approuvee' ? 'approuvée' : 'rejetée'}`);
      setSelectedDemande(null);
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const getStatutIcon = (statut) => {
    switch (statut) {
      case 'en_attente': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'approuvee': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'rejetee': return <XCircle className="w-5 h-5 text-rose-500" />;
      default: return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const getStatutBadge = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', class: 'bg-amber-100 text-amber-700' },
      'approuvee': { label: 'Approuvée', class: 'bg-emerald-100 text-emerald-700' },
      'rejetee': { label: 'Rejetée', class: 'bg-rose-100 text-rose-700' },
      'annulee': { label: 'Annulée', class: 'bg-slate-100 text-slate-700' }
    };
    const config = configs[statut] || configs['en_attente'];
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  const demandesEnAttente = demandes.filter(d => d.statut === 'en_attente');
  const demandesTraitees = demandes.filter(d => d.statut !== 'en_attente');
  const mesDemandes = demandes.filter(d => d.demandeur_id === user?.id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RoleProtection allowedRoles={['admin', 'manager', 'user']} user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Demandes RH</h1>
            <p className="text-slate-500">Gestion des demandes de congés, avances et formations</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle demande
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">En attente</p>
                  <p className="text-2xl font-bold text-slate-900">{demandesEnAttente.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Approuvées</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {demandes.filter(d => d.statut === 'approuvee').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Mes demandes</p>
                  <p className="text-2xl font-bold text-slate-900">{mesDemandes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={isAdmin ? "en-attente" : "mes-demandes"} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {isAdmin && <TabsTrigger value="en-attente">En attente ({demandesEnAttente.length})</TabsTrigger>}
            <TabsTrigger value="mes-demandes">Mes demandes</TabsTrigger>
            {isAdmin && <TabsTrigger value="toutes">Toutes</TabsTrigger>}
          </TabsList>

          {isAdmin && (
            <TabsContent value="en-attente" className="space-y-4">
              {demandesEnAttente.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="py-16 text-center">
                    <CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
                    <p className="text-slate-500">Aucune demande en attente</p>
                  </CardContent>
                </Card>
              ) : (
                demandesEnAttente.map(demande => (
                  <Card key={demande.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => setSelectedDemande(demande)}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          {getStatutIcon(demande.statut)}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-slate-900">{demande.titre}</h3>
                              {getStatutBadge(demande.statut)}
                              <Badge className="bg-blue-100 text-blue-700">{demande.type_demande}</Badge>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{demande.description}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>Par: {demande.demandeur_nom}</span>
                              <span>•</span>
                              <span>{moment(demande.created_date).fromNow()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          )}

          <TabsContent value="mes-demandes" className="space-y-4">
            {mesDemandes.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-16 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucune demande pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              mesDemandes.map(demande => (
                <Card key={demande.id} className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        {getStatutIcon(demande.statut)}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900">{demande.titre}</h3>
                            {getStatutBadge(demande.statut)}
                            <Badge className="bg-blue-100 text-blue-700">{demande.type_demande}</Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{demande.description}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>{moment(demande.created_date).format('DD/MM/YYYY')}</span>
                            {demande.approbateur_nom && (
                              <>
                                <span>•</span>
                                <span>Traitée par: {demande.approbateur_nom}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="toutes" className="space-y-4">
              {demandes.map(demande => (
                <Card key={demande.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setSelectedDemande(demande)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        {getStatutIcon(demande.statut)}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900">{demande.titre}</h3>
                            {getStatutBadge(demande.statut)}
                            <Badge className="bg-blue-100 text-blue-700">{demande.type_demande}</Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{demande.description}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Par: {demande.demandeur_nom}</span>
                            <span>•</span>
                            <span>{moment(demande.created_date).format('DD/MM/YYYY')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          )}
        </Tabs>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouvelle demande RH</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Type de demande</Label>
                <select
                  value={formData.type_demande}
                  onChange={(e) => setFormData({...formData, type_demande: e.target.value})}
                  className="w-full p-2 border rounded-lg mt-1"
                >
                  <option value="conge">Congé</option>
                  <option value="avance">Avance sur salaire</option>
                  <option value="formation">Formation</option>
                  <option value="document">Document</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <Label>Titre</Label>
                <Input
                  value={formData.titre}
                  onChange={(e) => setFormData({...formData, titre: e.target.value})}
                  placeholder="Ex: Congé annuel"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Détails de la demande..."
                  rows={4}
                />
              </div>

              {formData.type_demande === 'conge' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de début</Label>
                    <Input
                      type="date"
                      value={formData.date_debut}
                      onChange={(e) => setFormData({...formData, date_debut: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Date de fin</Label>
                    <Input
                      type="date"
                      value={formData.date_fin}
                      onChange={(e) => setFormData({...formData, date_fin: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {formData.type_demande === 'avance' && (
                <div>
                  <Label>Montant demandé (FCFA)</Label>
                  <Input
                    type="number"
                    value={formData.montant}
                    onChange={(e) => setFormData({...formData, montant: parseFloat(e.target.value)})}
                  />
                </div>
              )}

              {formData.type_demande === 'formation' && (
                <div className="space-y-4">
                  <div>
                    <Label>Nom de la formation</Label>
                    <Input
                      value={formData.formation_nom}
                      onChange={(e) => setFormData({...formData, formation_nom: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Coût estimé (FCFA)</Label>
                    <Input
                      type="number"
                      value={formData.formation_cout}
                      onChange={(e) => setFormData({...formData, formation_cout: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.titre}>
                  Soumettre la demande
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approval Dialog */}
        <Dialog open={!!selectedDemande && isAdmin} onOpenChange={() => setSelectedDemande(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Examiner la demande</DialogTitle>
            </DialogHeader>
            {selectedDemande && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-slate-900">{selectedDemande.titre}</h3>
                    {getStatutBadge(selectedDemande.statut)}
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{selectedDemande.description}</p>
                  <div className="grid grid-cols-2 gap-3 text-sm mt-3">
                    <div>
                      <span className="text-slate-500">Demandeur:</span>
                      <p className="font-medium">{selectedDemande.demandeur_nom}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Date:</span>
                      <p className="font-medium">{moment(selectedDemande.created_date).format('DD/MM/YYYY')}</p>
                    </div>
                    {selectedDemande.date_debut && (
                      <div>
                        <span className="text-slate-500">Période:</span>
                        <p className="font-medium">
                          {moment(selectedDemande.date_debut).format('DD/MM')} - {moment(selectedDemande.date_fin).format('DD/MM/YYYY')}
                        </p>
                      </div>
                    )}
                    {selectedDemande.montant > 0 && (
                      <div>
                        <span className="text-slate-500">Montant:</span>
                        <p className="font-medium">{formatMontant(selectedDemande.montant)} F</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedDemande.statut === 'en_attente' && (
                  <>
                    <div>
                      <Label>Commentaire</Label>
                      <Textarea
                        placeholder="Ajouter un commentaire..."
                        rows={3}
                        id="commentaire-approbation"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const commentaire = document.getElementById('commentaire-approbation').value;
                          handleApprobation(selectedDemande, 'rejetee', commentaire);
                        }}
                        className="text-rose-600"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeter
                      </Button>
                      <Button
                        onClick={() => {
                          const commentaire = document.getElementById('commentaire-approbation').value;
                          handleApprobation(selectedDemande, 'approuvee', commentaire);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approuver
                      </Button>
                    </div>
                  </>
                )}

                {selectedDemande.statut !== 'en_attente' && (
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">
                      <strong>Traitée par:</strong> {selectedDemande.approbateur_nom}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      <strong>Le:</strong> {moment(selectedDemande.date_approbation).format('DD/MM/YYYY à HH:mm')}
                    </p>
                    {selectedDemande.commentaire_approbation && (
                      <p className="text-sm text-slate-600 mt-2">
                        <strong>Commentaire:</strong> {selectedDemande.commentaire_approbation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleProtection>
  );
}