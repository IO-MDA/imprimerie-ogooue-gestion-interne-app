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
import { DollarSign, AlertCircle, Calendar, User, Plus, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

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
    beneficiaire: '',
    beneficiaire_email: '',
    montant: '',
    date_avance: moment().format('YYYY-MM-DD'),
    mois_concerne: moment().format('YYYY-MM'),
    commentaire: '',
    charge_fixe_id: ''
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
      await base44.entities.Avance.create({
        ...formData,
        montant: parseFloat(formData.montant)
      });
      toast.success('Avance enregistrée');
      setShowForm(false);
      setFormData({
        type_avance: 'salaire',
        beneficiaire: '',
        beneficiaire_email: '',
        montant: '',
        date_avance: moment().format('YYYY-MM-DD'),
        mois_concerne: moment().format('YYYY-MM'),
        commentaire: '',
        charge_fixe_id: ''
      });
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleUserSelect = (userId) => {
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setFormData({
        ...formData,
        beneficiaire: selectedUser.full_name,
        beneficiaire_email: selectedUser.email
      });
    }
  };

  const avancesMois = avances.filter(a => 
    moment(a.date_avance).format('YYYY-MM') === selectedMonth && a.statut === 'versee'
  );

  const avancesParBeneficiaire = {};
  avancesMois.forEach(a => {
    if (!avancesParBeneficiaire[a.beneficiaire]) {
      avancesParBeneficiaire[a.beneficiaire] = {
        nom: a.beneficiaire,
        total: 0,
        avances: []
      };
    }
    avancesParBeneficiaire[a.beneficiaire].total += a.montant;
    avancesParBeneficiaire[a.beneficiaire].avances.push(a);
  });

  const chargesAvecAvances = chargesFixes
    .filter(c => c.active && c.type === 'salaire')
    .map(charge => {
      const avancesCharge = avances.filter(a => 
        a.beneficiaire === charge.beneficiaire &&
        a.mois_concerne === selectedMonth &&
        a.statut === 'versee'
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
                <p className="text-xl font-bold text-slate-900">{totalAvances.toLocaleString()} F</p>
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
                <p className="text-xl font-bold text-slate-900">{totalResteAPayer.toLocaleString()} F</p>
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
                <p className="text-xs text-slate-500">Bénéficiaires</p>
                <p className="text-xl font-bold text-slate-900">{Object.keys(avancesParBeneficiaire).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Charges avec avances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {chargesAvecAvances.map(charge => (
              <div key={charge.id} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{charge.beneficiaire}</p>
                    <p className="text-sm text-slate-500">{charge.libelle}</p>
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
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Montant total</p>
                    <p className="font-medium">{charge.montant_mensuel.toLocaleString()} F</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Avances versées</p>
                    <p className="font-medium text-amber-600">{charge.totalAvances.toLocaleString()} F</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Reste à payer</p>
                    <p className="font-medium text-rose-600">{charge.resteAPayer.toLocaleString()} F</p>
                  </div>
                </div>
                {charge.avances.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-slate-500 mb-2">Détail des avances:</p>
                    {charge.avances.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-xs py-1">
                        <span>{moment(a.date_avance).format('DD/MM/YYYY')}</span>
                        <span className="font-medium">{a.montant.toLocaleString()} F</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {chargesAvecAvances.length === 0 && (
              <p className="text-center text-slate-500 py-8">Aucune charge pour ce mois</p>
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
                <Label>Employé</Label>
                <Select onValueChange={handleUserSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type_avance !== 'salaire' && (
              <>
                <div>
                  <Label>Bénéficiaire</Label>
                  <Input
                    value={formData.beneficiaire}
                    onChange={(e) => setFormData({...formData, beneficiaire: e.target.value})}
                  />
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
                <Label>Mois concerné</Label>
                <Input
                  type="month"
                  value={formData.mois_concerne}
                  onChange={(e) => setFormData({...formData, mois_concerne: e.target.value})}
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