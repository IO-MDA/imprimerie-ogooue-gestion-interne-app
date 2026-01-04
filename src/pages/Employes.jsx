import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  Edit, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase,
  TrendingUp,
  Clock,
  Award,
  History,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { useOptimizedQuery, useStaticQuery } from '@/components/hooks/useOptimizedQuery';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import moment from 'moment';

export default function Employes() {
  const [user, setUser] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    telephone: '',
    departement: '',
    poste: '',
    date_embauche: '',
    salaire: '',
    adresse: ''
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const userData = await base44.auth.me();
    setUser(userData);

    if (userData.role !== 'admin' && userData.role !== 'manager') {
      toast.error('Accès réservé aux administrateurs et managers');
      window.location.href = '/Dashboard';
    }
  };

  // Optimized queries
  const { data: usersData = [] } = useStaticQuery('all-users', () => base44.entities.User.list());
  const { data: clientsData = [] } = useStaticQuery('all-clients', () => base44.entities.Client.list());

  const employees = usersData.filter(u => !clientsData.map(c => c.user_id).includes(u.id));

  const { data: pointages = [] } = useOptimizedQuery(
    ['employee-pointages', selectedEmployee?.id],
    () => selectedEmployee ? base44.entities.Pointage.filter({ employe_id: selectedEmployee.id }, '-date') : Promise.resolve([]),
    { enabled: !!selectedEmployee, staleTime: 60 * 1000 }
  );

  const { data: demandes = [] } = useOptimizedQuery(
    ['employee-demandes', selectedEmployee?.id],
    () => selectedEmployee ? base44.entities.DemandeRH.filter({ demandeur_id: selectedEmployee.id }, '-created_date') : Promise.resolve([]),
    { enabled: !!selectedEmployee, staleTime: 60 * 1000 }
  );

  // Mutations
  const updateEmployeeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['all-users']);
      toast.success('Profil mis à jour');
      setShowEditDialog(false);
    },
    onError: () => toast.error('Erreur lors de la mise à jour')
  });

  const handleEditEmployee = async () => {
    if (!editForm.full_name || !editForm.email) {
      toast.error('Le nom et l\'email sont obligatoires');
      return;
    }

    updateEmployeeMutation.mutate({
      id: selectedEmployee.id,
      data: {
        full_name: editForm.full_name,
        email: editForm.email,
        telephone: editForm.telephone,
        departement: editForm.departement,
        poste: editForm.poste,
        date_embauche: editForm.date_embauche,
        salaire: editForm.salaire ? parseFloat(editForm.salaire) : null,
        adresse: editForm.adresse
      }
    });
  };

  const handleEditEmployee = async () => {
    if (!editForm.full_name || !editForm.email) {
      toast.error('Le nom et l\'email sont obligatoires');
      return;
    }

    try {
      await base44.entities.User.update(selectedEmployee.id, {
        full_name: editForm.full_name,
        email: editForm.email,
        telephone: editForm.telephone,
        departement: editForm.departement,
        poste: editForm.poste,
        date_embauche: editForm.date_embauche,
        salaire: editForm.salaire ? parseFloat(editForm.salaire) : null,
        adresse: editForm.adresse
      });

      toast.success('Profil mis à jour');
      setShowEditDialog(false);
      loadData();
      
      // Refresh selected employee
      const updatedEmployee = employees.find(e => e.id === selectedEmployee.id);
      setSelectedEmployee({...updatedEmployee, ...editForm});
    } catch (e) {
      console.error('Error updating employee:', e);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const openEditDialog = () => {
    setEditForm({
      full_name: selectedEmployee.full_name || '',
      email: selectedEmployee.email || '',
      telephone: selectedEmployee.telephone || '',
      departement: selectedEmployee.departement || '',
      poste: selectedEmployee.poste || '',
      date_embauche: selectedEmployee.date_embauche || '',
      salaire: selectedEmployee.salaire || '',
      adresse: selectedEmployee.adresse || ''
    });
    setShowEditDialog(true);
  };

  const calculateStats = (employeeId) => {
    const employeePointages = pointages.filter(p => p.employe_id === employeeId);
    const totalHeures = employeePointages.reduce((sum, p) => sum + (p.duree_minutes || 0), 0) / 60;
    const retards = employeePointages.filter(p => p.heure_entree > '08:00').length;
    const anomalies = employeePointages.filter(p => p.statut === 'anomalie').length;

    return { totalHeures, retards, anomalies };
  };

  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchQuery.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.departement?.toLowerCase().includes(searchLower) ||
      emp.poste?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Employés</h1>
          <p className="text-slate-500">Profils détaillés et performances</p>
        </div>
        <Badge className="bg-blue-100 text-blue-700">
          {employees.length} employé{employees.length > 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar - Liste employés */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Card className="border-0 shadow-lg max-h-[calc(100vh-16rem)] overflow-y-auto">
            <CardContent className="p-4 space-y-2">
              {filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedEmployee?.id === emp.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-slate-50 hover:bg-slate-100 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-white ${
                      emp.role === 'admin' ? 'bg-amber-500' :
                      emp.role === 'manager' ? 'bg-blue-500' :
                      'bg-slate-500'
                    }`}>
                      {emp.full_name?.[0]?.toUpperCase() || emp.email?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {emp.full_name || emp.email}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {emp.poste || emp.role}
                      </p>
                    </div>
                    <Badge className={
                      emp.role === 'admin' ? 'bg-amber-100 text-amber-700' :
                      emp.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }>
                      {emp.role}
                    </Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main - Détails employé */}
        <div className="col-span-12 lg:col-span-8">
          {selectedEmployee ? (
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                      {selectedEmployee.full_name?.[0]?.toUpperCase() || selectedEmployee.email?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedEmployee.full_name || selectedEmployee.email}</h2>
                      <p className="text-blue-100">{selectedEmployee.poste || selectedEmployee.role}</p>
                    </div>
                  </div>
                  {user.role === 'admin' && (
                    <Button onClick={openEditDialog} variant="secondary">
                      <Edit className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Informations</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="historique">Historique</TabsTrigger>
                  </TabsList>

                  <TabsContent value="info" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-slate-50 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="text-xs text-slate-500">Email</p>
                              <p className="font-medium text-slate-900">{selectedEmployee.email}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-50 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-xs text-slate-500">Téléphone</p>
                              <p className="font-medium text-slate-900">
                                {selectedEmployee.telephone || 'Non renseigné'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-50 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Briefcase className="w-5 h-5 text-purple-600" />
                            <div>
                              <p className="text-xs text-slate-500">Département</p>
                              <p className="font-medium text-slate-900">
                                {selectedEmployee.departement || 'Non renseigné'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-50 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-amber-600" />
                            <div>
                              <p className="text-xs text-slate-500">Date d'embauche</p>
                              <p className="font-medium text-slate-900">
                                {selectedEmployee.date_embauche 
                                  ? moment(selectedEmployee.date_embauche).format('DD/MM/YYYY')
                                  : 'Non renseigné'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-slate-50 border-0">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Shield className="w-5 h-5 text-red-600" />
                            <div>
                              <p className="text-xs text-slate-500">Rôle système</p>
                              <p className="font-medium text-slate-900">
                                {selectedEmployee.role === 'admin' ? 'Administrateur' :
                                 selectedEmployee.role === 'manager' ? 'Manager' : 'Employé'}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {selectedEmployee.adresse && (
                        <Card className="bg-slate-50 border-0">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-5 h-5 text-slate-600" />
                              <div>
                                <p className="text-xs text-slate-500">Adresse</p>
                                <p className="font-medium text-slate-900">{selectedEmployee.adresse}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {selectedEmployee.date_embauche && (
                      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0">
                        <CardContent className="p-4">
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">Ancienneté:</span>{' '}
                            {moment().diff(moment(selectedEmployee.date_embauche), 'years')} an(s) et{' '}
                            {moment().diff(moment(selectedEmployee.date_embauche), 'months') % 12} mois
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="performance" className="space-y-4 mt-6">
                    {(() => {
                      const stats = calculateStats(selectedEmployee.id);
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-blue-50 border-0">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <Clock className="w-8 h-8 text-blue-600" />
                                  <div>
                                    <p className="text-xs text-slate-500">Total heures</p>
                                    <p className="text-xl font-bold text-blue-600">
                                      {stats.totalHeures.toFixed(1)}h
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="bg-amber-50 border-0">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <TrendingUp className="w-8 h-8 text-amber-600" />
                                  <div>
                                    <p className="text-xs text-slate-500">Retards</p>
                                    <p className="text-xl font-bold text-amber-600">{stats.retards}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="bg-red-50 border-0">
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <Award className="w-8 h-8 text-red-600" />
                                  <div>
                                    <p className="text-xs text-slate-500">Anomalies</p>
                                    <p className="text-xl font-bold text-red-600">{stats.anomalies}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          <Card className="border-0">
                            <CardHeader>
                              <CardTitle className="text-lg">Derniers pointages</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {pointages.length === 0 ? (
                                <p className="text-slate-500 text-center py-4">Aucun pointage</p>
                              ) : (
                                <div className="space-y-2">
                                  {pointages.slice(0, 5).map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                      <div>
                                        <p className="font-medium text-slate-900">
                                          {moment(p.date).format('DD/MM/YYYY')}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                          {p.heure_entree} → {p.heure_sortie || 'En cours'}
                                        </p>
                                      </div>
                                      <Badge className={
                                        p.statut === 'termine' ? 'bg-green-100 text-green-700' :
                                        p.statut === 'anomalie' ? 'bg-red-100 text-red-700' :
                                        'bg-blue-100 text-blue-700'
                                      }>
                                        {p.duree_minutes 
                                          ? `${Math.floor(p.duree_minutes / 60)}h${p.duree_minutes % 60}min`
                                          : p.statut}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </>
                      );
                    })()}
                  </TabsContent>

                  <TabsContent value="historique" className="space-y-4 mt-6">
                    <Card className="border-0">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <History className="w-5 h-5" />
                          Demandes RH récentes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {demandes.length === 0 ? (
                          <p className="text-slate-500 text-center py-4">Aucune demande</p>
                        ) : (
                          <div className="space-y-3">
                            {demandes.map(d => (
                              <div key={d.id} className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="font-medium text-slate-900">{d.titre}</p>
                                  <Badge className={
                                    d.statut === 'approuvee' ? 'bg-green-100 text-green-700' :
                                    d.statut === 'rejetee' ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                  }>
                                    {d.statut}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-600">
                                  {d.type_demande} - {moment(d.created_date).format('DD/MM/YYYY')}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-blue-50">
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold">Membre depuis:</span>{' '}
                          {moment(selectedEmployee.created_date).format('DD/MM/YYYY')} 
                          ({moment(selectedEmployee.created_date).fromNow()})
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-24 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Sélectionnez un employé pour voir son profil</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le profil employé</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Nom complet *</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={editForm.telephone}
                  onChange={(e) => setEditForm({...editForm, telephone: e.target.value})}
                />
              </div>
              <div>
                <Label>Département</Label>
                <Input
                  value={editForm.departement}
                  onChange={(e) => setEditForm({...editForm, departement: e.target.value})}
                />
              </div>
              <div>
                <Label>Poste</Label>
                <Input
                  value={editForm.poste}
                  onChange={(e) => setEditForm({...editForm, poste: e.target.value})}
                />
              </div>
              <div>
                <Label>Date d'embauche</Label>
                <Input
                  type="date"
                  value={editForm.date_embauche}
                  onChange={(e) => setEditForm({...editForm, date_embauche: e.target.value})}
                />
              </div>
              <div>
                <Label>Salaire (FCFA)</Label>
                <Input
                  type="number"
                  value={editForm.salaire}
                  onChange={(e) => setEditForm({...editForm, salaire: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input
                value={editForm.adresse}
                onChange={(e) => setEditForm({...editForm, adresse: e.target.value})}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditEmployee} className="bg-blue-600">
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}