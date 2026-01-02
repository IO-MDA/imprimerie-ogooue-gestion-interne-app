import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import RoleProtection from '@/components/auth/RoleProtection';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertCircle, Calendar, User, Plus, TrendingDown, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { formatMontant } from '@/components/utils/formatMontant.jsx';

export default function Avances() {
  const [avances, setAvances] = useState([]);
  const [chargesFixes, setChargesFixes] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  
  const [formData, setFormData] = useState({
    type_avance: 'salaire',
    employe_id: '',
    nom_employe: '',
    email_employe: '',
    montant: '',
    date_avance: moment().format('YYYY-MM-DD'),
    mois_comptable: moment().format('YYYY-MM'),
    commentaire: '',
    charge_fixe_id: '',
    statut: 'validee'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [avancesData, chargesData, usersData, userData] = await Promise.all([
        base44.entities.Avance.list('-date_avance'),
        base44.entities.ChargeFixe.list(),
        base44.entities.User.list(),
        base44.auth.me()
      ]);
      setAvances(avancesData);
      setChargesFixes(chargesData);
      setUsers(usersData);
      setUser(userData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.employe_id || !formData.montant) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      // Find matching ChargeFixe
      let chargeFixeId = formData.charge_fixe_id;
      if (!chargeFixeId && formData.nom_employe) {
        const matchingCharge = chargesFixes.find(c => 
          c.beneficiaire === formData.nom_employe && c.active && c.type === 'salaire'
        );
        chargeFixeId = matchingCharge?.id;
      }

      await base44.entities.Avance.create({
        employe_id: formData.employe_id,
        nom_employe: formData.nom_employe,
        email_employe: formData.email_employe,
        type_avance: formData.type_avance,
        montant: parseFloat(formData.montant),
        date_avance: formData.date_avance,
        mois_comptable: formData.mois_comptable,
        commentaire: formData.commentaire,
        charge_fixe_id: chargeFixeId,
        statut: 'validee',
        cree_par: user.id,
        cree_par_nom: user.full_name
      });
      
      toast.success('Avance enregistrée avec succès');
      setShowForm(false);
      setFormData({
        type_avance: 'salaire',
        employe_id: '',
        nom_employe: '',
        email_employe: '',
        montant: '',
        date_avance: moment().format('YYYY-MM-DD'),
        mois_comptable: moment().format('YYYY-MM'),
        commentaire: '',
        charge_fixe_id: '',
        statut: 'validee'
      });
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
      console.error(e);
    }
  };

  const handleUserSelect = (userId) => {
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      // Find matching charge fixe for this user
      const matchingCharge = chargesFixes.find(c => 
        c.beneficiaire === selectedUser.full_name && c.active && c.type === 'salaire'
      );
      setFormData({
        ...formData,
        employe_id: selectedUser.id,
        nom_employe: selectedUser.full_name,
        email_employe: selectedUser.email,
        charge_fixe_id: matchingCharge?.id || ''
      });
    }
  };

  const handleValiderAvance = async (avanceId) => {
    try {
      await base44.entities.Avance.update(avanceId, { statut: 'validee' });
      toast.success('Avance validée');
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la validation');
    }
  };

  const handleAnnulerAvance = async (avanceId) => {
    if (!confirm('Annuler cette avance ?')) return;
    try {
      await base44.entities.Avance.update(avanceId, { statut: 'annulee' });
      toast.success('Avance annulée');
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const avancesMois = avances.filter(a => 
    a.mois_comptable === selectedMonth && (a.statut === 'validee' || a.statut === 'deduite')
  );

  // Grouper par employé
  const avancesParEmploye = {};
  avancesMois.forEach(a => {
    const key = a.employe_id || a.nom_employe;
    if (!avancesParEmploye[key]) {
      avancesParEmploye[key] = {
        employe_id: a.employe_id,
        nom: a.nom_employe,
        email: a.email_employe,
        total: 0,
        avances: []
      };
    }
    avancesParEmploye[key].total += a.montant;
    avancesParEmploye[key].avances.push(a);
  });

  const chargesAvecAvances = chargesFixes
    .filter(c => c.active && c.type === 'salaire')
    .map(charge => {
      const avancesCharge = avances.filter(a => 
        a.nom_employe === charge.beneficiaire &&
        a.mois_comptable === selectedMonth &&
        (a.statut === 'validee' || a.statut === 'deduite')
      );
      const totalAvances = avancesCharge.reduce((sum, a) => sum + a.montant, 0);
      const resteAPayer = charge.montant_mensuel - totalAvances;
      
      return {
        ...charge,
        totalAvances,
        resteAPayer,
        avances: avancesCharge,
        statut: resteAPayer === 0 ? 'solde' : totalAvances > 0 ? 'partiellement_paye' : 'en_attente'
      };
    });

  const totalAvances = avancesMois.reduce((sum, a) => sum + a.montant, 0);
  const totalResteAPayer = chargesAvecAvances.reduce((sum, c) => sum + c.resteAPayer, 0);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RoleProtection allowedRoles={['admin', 'manager']} user={user}>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Avances & Restes à payer</h1>
          <p className="text-slate-500">Gestion des avances sur salaires et charges</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle avance
          </Button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Label>Mois</Label>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total avances</p>
                <p className="text-xl font-bold text-slate-900">{formatMontant(totalAvances)} F</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Reste à payer</p>
                <p className="text-xl font-bold text-slate-900">{formatMontant(totalResteAPayer)} F</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Employés concernés</p>
                <p className="text-xl font-bold text-slate-900">{Object.keys(avancesParEmploye).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des employés avec avances */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Détail par employé - {moment(selectedMonth).format('MMMM YYYY')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chargesAvecAvances.map(charge => (
              <div key={charge.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{charge.beneficiaire}</p>
                      <p className="text-xs text-slate-500">{charge.libelle}</p>
                    </div>
                  </div>
                  <Badge className={
                    charge.statut === 'solde' ? 'bg-emerald-100 text-emerald-700' :
                    charge.statut === 'partiellement_paye' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }>
                    {charge.statut === 'solde' ? 'Soldé' :
                     charge.statut === 'partiellement_paye' ? 'Partiellement payé' :
                     'En attente'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                  <div className="p-3 bg-white rounded-lg">
                    <p className="text-slate-500 text-xs mb-1">Salaire brut</p>
                    <p className="font-bold text-slate-900">{formatMontant(charge.montant_mensuel)} F</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-slate-500 text-xs mb-1">Avances versées</p>
                    <p className="font-bold text-amber-700">{formatMontant(charge.totalAvances)} F</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-lg">
                    <p className="text-slate-500 text-xs mb-1">Reste à payer</p>
                    <p className="font-bold text-rose-700">{formatMontant(charge.resteAPayer)} F</p>
                  </div>
                </div>
                
                {charge.avances.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-semibold text-slate-700 mb-2">Historique des avances du mois:</p>
                    <div className="space-y-1">
                      {charge.avances.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-2 bg-white rounded text-xs">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-700">{moment(a.date_avance).format('DD/MM/YYYY')}</span>
                            <Badge className={
                              a.statut === 'validee' ? 'bg-emerald-100 text-emerald-700 text-xs' :
                              a.statut === 'en_attente' ? 'bg-amber-100 text-amber-700 text-xs' :
                              'bg-slate-100 text-slate-700 text-xs'
                            }>
                              {a.statut}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{formatMontant(a.montant)} F</span>
                            {isAdmin && a.statut === 'en_attente' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleValiderAvance(a.id)}
                                  className="h-6 px-2"
                                >
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleAnnulerAvance(a.id)}
                                  className="h-6 px-2"
                                >
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {chargesAvecAvances.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun employé avec salaire pour ce mois</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle avance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type d'avance</Label>
                <Select value={formData.type_avance} onValueChange={(v) => setFormData({...formData, type_avance: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salaire">Salaire</SelectItem>
                    <SelectItem value="loyer">Loyer</SelectItem>
                    <SelectItem value="autre_charge">Autre charge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de l'avance</Label>
                <Input
                  type="date"
                  value={formData.date_avance}
                  onChange={(e) => setFormData({...formData, date_avance: e.target.value})}
                />
              </div>
            </div>

            {formData.type_avance === 'salaire' && (
              <div>
                <Label>Employé *</Label>
                <Select onValueChange={handleUserSelect} value={formData.employe_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.role !== 'admin' || u.id === user?.id).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.employe_id && (
                  <p className="text-xs text-slate-500 mt-1">
                    Email: {formData.email_employe}
                  </p>
                )}
              </div>
            )}

            {formData.type_avance !== 'salaire' && (
              <>
                <div>
                  <Label>Bénéficiaire *</Label>
                  {formData.type_avance === 'loyer' ? (
                    <Select 
                      value={formData.beneficiaire} 
                      onValueChange={(v) => {
                        const charge = chargesFixes.find(c => c.beneficiaire === v && c.type === 'loyer');
                        setFormData({
                          ...formData, 
                          beneficiaire: v,
                          charge_fixe_id: charge?.id || ''
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner le bailleur" />
                      </SelectTrigger>
                      <SelectContent>
                        {chargesFixes.filter(c => c.type === 'loyer' && c.active && c.beneficiaire).map(c => (
                          <SelectItem key={c.id} value={c.beneficiaire}>{c.beneficiaire}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={formData.beneficiaire}
                      onChange={(e) => setFormData({...formData, beneficiaire: e.target.value})}
                      required
                    />
                  )}
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.beneficiaire_email}
                    onChange={(e) => setFormData({...formData, beneficiaire_email: e.target.value})}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Montant (FCFA)</Label>
                <Input
                  type="number"
                  value={formData.montant}
                  onChange={(e) => setFormData({...formData, montant: e.target.value})}
                />
              </div>
              <div>
                <Label>Mois comptable *</Label>
                <Input
                  type="month"
                  value={formData.mois_comptable}
                  onChange={(e) => setFormData({...formData, mois_comptable: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Commentaire (optionnel)</Label>
              <Textarea
                value={formData.commentaire}
                onChange={(e) => setFormData({...formData, commentaire: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </RoleProtection>
  );
}