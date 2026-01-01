import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import moment from 'moment';
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
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  Edit,
  Trash2,
  PieChart
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function Finances() {
  const [charges, setCharges] = useState([]);
  const [dettes, setDettes] = useState([]);
  const [actionnaires, setActionnaires] = useState([]);
  const [investissements, setInvestissements] = useState([]);
  const [rapports, setRapports] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('charges');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('');
  const [editingItem, setEditingItem] = useState(null);

  const [chargeForm, setChargeForm] = useState({
    type: 'salaire',
    libelle: '',
    montant_mensuel: 0,
    beneficiaire: '',
    date_debut: new Date().toISOString().split('T')[0],
    active: true,
    notes: ''
  });

  const [detteForm, setDetteForm] = useState({
    type: 'credit',
    libelle: '',
    montant_initial: 0,
    taux_interet: 0,
    duree_mois: 12,
    date_debut: new Date().toISOString().split('T')[0],
    creancier: '',
    statut: 'en_cours'
  });

  const [actionnaireForm, setActionnaireForm] = useState({
    nom: '',
    parts: 0,
    pourcentage: 0,
    email: '',
    telephone: '',
    date_entree: new Date().toISOString().split('T')[0],
    montant_investi: 0,
    actif: true
  });

  const [investissementForm, setInvestissementForm] = useState({
    titre: '',
    description: '',
    montant: 0,
    source_service: '',
    justification: '',
    date_prevue: new Date().toISOString().split('T')[0],
    statut: 'planifie',
    retour_estime: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [chargesData, dettesData, actionnairesData, investData, rapportsData, userData] = await Promise.all([
      base44.entities.ChargeFixe.list(),
      base44.entities.Dette.list(),
      base44.entities.Actionnaire.list(),
      base44.entities.Investissement.list(),
      base44.entities.RapportJournalier.list('-date', 200),
      base44.auth.me()
    ]);
    setCharges(chargesData);
    setDettes(dettesData);
    setActionnaires(actionnairesData);
    setInvestissements(investData);
    setRapports(rapportsData);
    setUser(userData);
    setIsLoading(false);
  };

  const calculateMensualite = (montant, taux, duree) => {
    if (taux === 0) return montant / duree;
    const tauxMensuel = taux / 100 / 12;
    return montant * (tauxMensuel * Math.pow(1 + tauxMensuel, duree)) / (Math.pow(1 + tauxMensuel, duree) - 1);
  };

  const handleChargeSubmit = async (e) => {
    e.preventDefault();
    if (editingItem) {
      await base44.entities.ChargeFixe.update(editingItem.id, chargeForm);
      toast.success('Charge mise à jour');
    } else {
      await base44.entities.ChargeFixe.create(chargeForm);
      toast.success('Charge ajoutée');
    }
    closeForm();
    loadData();
  };

  const handleDetteSubmit = async (e) => {
    e.preventDefault();
    const mensualite = calculateMensualite(detteForm.montant_initial, detteForm.taux_interet, detteForm.duree_mois);
    const data = {
      ...detteForm,
      mensualite,
      montant_restant: detteForm.montant_initial
    };
    if (editingItem) {
      await base44.entities.Dette.update(editingItem.id, data);
      toast.success('Dette mise à jour');
    } else {
      await base44.entities.Dette.create(data);
      toast.success('Dette ajoutée');
    }
    closeForm();
    loadData();
  };

  const handleActionnaireSubmit = async (e) => {
    e.preventDefault();
    if (editingItem) {
      await base44.entities.Actionnaire.update(editingItem.id, actionnaireForm);
      toast.success('Actionnaire mis à jour');
    } else {
      await base44.entities.Actionnaire.create(actionnaireForm);
      toast.success('Actionnaire ajouté');
    }
    closeForm();
    loadData();
  };

  const handleInvestissementSubmit = async (e) => {
    e.preventDefault();
    if (editingItem) {
      await base44.entities.Investissement.update(editingItem.id, investissementForm);
      toast.success('Investissement mis à jour');
    } else {
      await base44.entities.Investissement.create(investissementForm);
      toast.success('Investissement créé');
    }
    closeForm();
    loadData();
  };

  const handleDelete = async (entity, id) => {
    if (confirm('Supprimer cet élément ?')) {
      await base44.entities[entity].delete(id);
      toast.success('Élément supprimé');
      loadData();
    }
  };

  const openForm = (type, item = null) => {
    setFormType(type);
    setEditingItem(item);
    if (item) {
      if (type === 'charge') setChargeForm(item);
      if (type === 'dette') setDetteForm(item);
      if (type === 'actionnaire') setActionnaireForm(item);
      if (type === 'investissement') setInvestissementForm(item);
    }
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setFormType('');
    setEditingItem(null);
    setChargeForm({ type: 'salaire', libelle: '', montant_mensuel: 0, beneficiaire: '', date_debut: new Date().toISOString().split('T')[0], active: true, notes: '' });
    setDetteForm({ type: 'credit', libelle: '', montant_initial: 0, taux_interet: 0, duree_mois: 12, date_debut: new Date().toISOString().split('T')[0], creancier: '', statut: 'en_cours' });
    setActionnaireForm({ nom: '', parts: 0, pourcentage: 0, email: '', telephone: '', date_entree: new Date().toISOString().split('T')[0], montant_investi: 0, actif: true });
    setInvestissementForm({ titre: '', description: '', montant: 0, source_service: '', justification: '', date_prevue: new Date().toISOString().split('T')[0], statut: 'planifie', retour_estime: 0 });
  };

  const getAmortissement = (dette) => {
    const echeances = [];
    const tauxMensuel = dette.taux_interet / 100 / 12;
    let capital = dette.montant_initial;
    
    for (let i = 1; i <= dette.duree_mois; i++) {
      const interet = capital * tauxMensuel;
      const principal = dette.mensualite - interet;
      capital -= principal;
      
      echeances.push({
        mois: i,
        date: moment(dette.date_debut).add(i, 'months').format('MM/YYYY'),
        mensualite: dette.mensualite,
        interet,
        principal,
        reste: Math.max(0, capital)
      });
    }
    return echeances;
  };

  // Calcul bénéfice mensuel
  const thisMonth = moment().format('YYYY-MM');
  const monthRapports = rapports.filter(r => moment(r.date).format('YYYY-MM') === thisMonth);
  const recettesMois = monthRapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
  const depensesMois = monthRapports.reduce((sum, r) => sum + (r.total_depenses || 0), 0);
  const chargesMensuelles = charges.filter(c => c.active).reduce((sum, c) => sum + c.montant_mensuel, 0);
  const remboursementsMois = dettes.filter(d => d.statut === 'en_cours').reduce((sum, d) => sum + (d.mensualite || 0), 0);
  const beneficeBrut = recettesMois - depensesMois;
  const beneficeNet = beneficeBrut - chargesMensuelles - remboursementsMois;

  // Dividendes
  const totalParts = actionnaires.filter(a => a.actif).reduce((sum, a) => sum + a.parts, 0);
  const dividendesActionnaires = actionnaires.filter(a => a.actif).map(a => ({
    ...a,
    dividende: beneficeNet > 0 ? (beneficeNet * (a.parts / totalParts)) : 0
  }));

  const isAdmin = user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Accès Restreint</h2>
          <p className="text-slate-600">Seuls les administrateurs peuvent accéder aux finances.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion Financière</h1>
          <p className="text-slate-500">Charges, dettes, actionnaires et investissements</p>
        </div>
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Bénéfice Net (mois)</p>
                <p className="text-2xl font-bold text-emerald-900">{beneficeNet.toLocaleString()} F</p>
              </div>
              <TrendingUp className="w-10 h-10 text-emerald-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-rose-200/50 bg-gradient-to-br from-rose-50 to-rose-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-600 font-medium">Charges mensuelles</p>
                <p className="text-2xl font-bold text-rose-900">{chargesMensuelles.toLocaleString()} F</p>
              </div>
              <TrendingDown className="w-10 h-10 text-rose-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-amber-200/50 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Dettes totales</p>
                <p className="text-2xl font-bold text-amber-900">
                  {dettes.filter(d => d.statut === 'en_cours').reduce((s, d) => s + d.montant_restant, 0).toLocaleString()} F
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Actionnaires</p>
                <p className="text-2xl font-bold text-blue-900">{actionnaires.filter(a => a.actif).length}</p>
              </div>
              <Users className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="charges">Charges Fixes</TabsTrigger>
          <TabsTrigger value="dettes">Dettes & Crédits</TabsTrigger>
          <TabsTrigger value="actionnaires">Actionnaires</TabsTrigger>
          <TabsTrigger value="investissements">Investissements</TabsTrigger>
        </TabsList>

        {/* Charges Fixes */}
        <TabsContent value="charges" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Charges mensuelles fixes</h3>
            <Button onClick={() => openForm('charge')} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter charge
            </Button>
          </div>
          <div className="grid gap-4">
            {charges.map(charge => (
              <Card key={charge.id} className="border-0 shadow-lg shadow-slate-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{charge.libelle}</h4>
                        <Badge variant="outline">{charge.type}</Badge>
                        {!charge.active && <Badge variant="secondary">Inactive</Badge>}
                      </div>
                      <p className="text-sm text-slate-600">{charge.beneficiaire}</p>
                      <p className="text-sm text-slate-500">Depuis: {moment(charge.date_debut).format('DD/MM/YYYY')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-rose-600">{charge.montant_mensuel.toLocaleString()} F/mois</p>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openForm('charge', charge)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete('ChargeFixe', charge.id)}>
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Dettes */}
        <TabsContent value="dettes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Dettes et crédits</h3>
            <Button onClick={() => openForm('dette')} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter dette
            </Button>
          </div>
          <div className="grid gap-4">
            {dettes.map(dette => {
              const amortissement = getAmortissement(dette);
              const progression = ((dette.montant_initial - dette.montant_restant) / dette.montant_initial) * 100;
              
              return (
                <Card key={dette.id} className="border-0 shadow-lg shadow-slate-200/50">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{dette.libelle}</h4>
                            <Badge variant="outline">{dette.type}</Badge>
                            <Badge className={dette.statut === 'en_cours' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}>
                              {dette.statut}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">Créancier: {dette.creancier}</p>
                          <p className="text-sm text-slate-500">Depuis: {moment(dette.date_debut).format('DD/MM/YYYY')}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openForm('dette', dette)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete('Dette', dette.id)}>
                            <Trash2 className="w-4 h-4 text-rose-600" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Montant initial</p>
                          <p className="font-bold">{dette.montant_initial.toLocaleString()} F</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Restant</p>
                          <p className="font-bold text-amber-600">{dette.montant_restant.toLocaleString()} F</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Mensualité</p>
                          <p className="font-bold">{dette.mensualite?.toLocaleString()} F</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Taux</p>
                          <p className="font-bold">{dette.taux_interet}%</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Remboursement</span>
                          <span>{progression.toFixed(1)}%</span>
                        </div>
                        <Progress value={progression} className="h-2" />
                      </div>

                      <details className="text-sm">
                        <summary className="cursor-pointer text-blue-600 hover:underline">Voir l'amortissement</summary>
                        <div className="mt-3 overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-50">
                              <tr>
                                <th className="p-2 text-left">Mois</th>
                                <th className="p-2 text-right">Mensualité</th>
                                <th className="p-2 text-right">Intérêts</th>
                                <th className="p-2 text-right">Capital</th>
                                <th className="p-2 text-right">Reste</th>
                              </tr>
                            </thead>
                            <tbody>
                              {amortissement.slice(0, 12).map((e, i) => (
                                <tr key={i} className="border-t">
                                  <td className="p-2">{e.date}</td>
                                  <td className="p-2 text-right">{e.mensualite.toLocaleString()}</td>
                                  <td className="p-2 text-right text-rose-600">{e.interet.toLocaleString()}</td>
                                  <td className="p-2 text-right text-blue-600">{e.principal.toLocaleString()}</td>
                                  <td className="p-2 text-right font-medium">{e.reste.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {amortissement.length > 12 && (
                            <p className="text-xs text-slate-500 mt-2">... et {amortissement.length - 12} autres échéances</p>
                          )}
                        </div>
                      </details>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Actionnaires */}
        <TabsContent value="actionnaires" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Actionnaires & Dividendes</h3>
            <Button onClick={() => openForm('actionnaire')} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter actionnaire
            </Button>
          </div>

          <Card className="border-0 shadow-lg shadow-blue-200/50 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-3">Répartition des dividendes (ce mois)</h4>
              <p className="text-2xl font-bold text-blue-900 mb-4">
                {beneficeNet > 0 ? beneficeNet.toLocaleString() : 0} FCFA à distribuer
              </p>
              <div className="space-y-2">
                {dividendesActionnaires.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                        {a.nom[0]}
                      </div>
                      <div>
                        <p className="font-medium">{a.nom}</p>
                        <p className="text-sm text-slate-500">{a.pourcentage}% • {a.parts} parts</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-emerald-600">{a.dividende.toLocaleString()} F</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {actionnaires.map(act => (
              <Card key={act.id} className="border-0 shadow-lg shadow-slate-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{act.nom}</h4>
                        {!act.actif && <Badge variant="secondary">Inactif</Badge>}
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Parts</p>
                          <p className="font-medium">{act.parts}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Pourcentage</p>
                          <p className="font-medium">{act.pourcentage}%</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Investi</p>
                          <p className="font-medium">{act.montant_investi?.toLocaleString()} F</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openForm('actionnaire', act)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete('Actionnaire', act.id)}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Investissements */}
        <TabsContent value="investissements" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Investissements planifiés</h3>
            <Button onClick={() => openForm('investissement')} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nouvel investissement
            </Button>
          </div>
          <div className="grid gap-4">
            {investissements.map(inv => (
              <Card key={inv.id} className="border-0 shadow-lg shadow-slate-200/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{inv.titre}</h4>
                        <Badge className={
                          inv.statut === 'planifie' ? 'bg-blue-100 text-blue-700' :
                          inv.statut === 'approuve' ? 'bg-emerald-100 text-emerald-700' :
                          inv.statut === 'realise' ? 'bg-slate-100 text-slate-700' :
                          'bg-rose-100 text-rose-700'
                        }>
                          {inv.statut}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{inv.description}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Montant</p>
                          <p className="font-bold text-blue-600">{inv.montant.toLocaleString()} F</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Service</p>
                          <p className="font-medium">{inv.source_service || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">ROI estimé</p>
                          <p className="font-medium text-emerald-600">{inv.retour_estime}%</p>
                        </div>
                      </div>
                      {inv.justification && (
                        <p className="text-xs text-slate-500 mt-2 italic">{inv.justification}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openForm('investissement', inv)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete('Investissement', inv.id)}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Dialogs */}
      <Dialog open={showForm} onOpenChange={closeForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Modifier' : 'Ajouter'} {formType === 'charge' ? 'une charge' : formType === 'dette' ? 'une dette' : formType === 'actionnaire' ? 'un actionnaire' : 'un investissement'}
            </DialogTitle>
          </DialogHeader>

          {formType === 'charge' && (
            <form onSubmit={handleChargeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type *</Label>
                  <Select value={chargeForm.type} onValueChange={(v) => setChargeForm(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salaire">Salaire</SelectItem>
                      <SelectItem value="internet">Internet</SelectItem>
                      <SelectItem value="electricite">Électricité</SelectItem>
                      <SelectItem value="abonnement">Abonnement</SelectItem>
                      <SelectItem value="loyer">Loyer</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Montant mensuel (FCFA) *</Label>
                  <Input type="number" value={chargeForm.montant_mensuel} onChange={(e) => setChargeForm(prev => ({ ...prev, montant_mensuel: Number(e.target.value) }))} required />
                </div>
              </div>
              <div>
                <Label>Libellé *</Label>
                <Input value={chargeForm.libelle} onChange={(e) => setChargeForm(prev => ({ ...prev, libelle: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bénéficiaire</Label>
                  <Input value={chargeForm.beneficiaire} onChange={(e) => setChargeForm(prev => ({ ...prev, beneficiaire: e.target.value }))} />
                </div>
                <div>
                  <Label>Date début</Label>
                  <Input type="date" value={chargeForm.date_debut} onChange={(e) => setChargeForm(prev => ({ ...prev, date_debut: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={chargeForm.notes} onChange={(e) => setChargeForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={chargeForm.active} onChange={(e) => setChargeForm(prev => ({ ...prev, active: e.target.checked }))} />
                <Label htmlFor="active">Charge active</Label>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeForm}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          )}

          {formType === 'dette' && (
            <form onSubmit={handleDetteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type *</Label>
                  <Select value={detteForm.type} onValueChange={(v) => setDetteForm(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit">Crédit</SelectItem>
                      <SelectItem value="dette">Dette</SelectItem>
                      <SelectItem value="emprunt">Emprunt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Montant initial (FCFA) *</Label>
                  <Input type="number" value={detteForm.montant_initial} onChange={(e) => setDetteForm(prev => ({ ...prev, montant_initial: Number(e.target.value) }))} required />
                </div>
              </div>
              <div>
                <Label>Libellé *</Label>
                <Input value={detteForm.libelle} onChange={(e) => setDetteForm(prev => ({ ...prev, libelle: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Taux d'intérêt annuel (%)</Label>
                  <Input type="number" step="0.1" value={detteForm.taux_interet} onChange={(e) => setDetteForm(prev => ({ ...prev, taux_interet: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Durée (mois) *</Label>
                  <Input type="number" value={detteForm.duree_mois} onChange={(e) => setDetteForm(prev => ({ ...prev, duree_mois: Number(e.target.value) }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Créancier</Label>
                  <Input value={detteForm.creancier} onChange={(e) => setDetteForm(prev => ({ ...prev, creancier: e.target.value }))} />
                </div>
                <div>
                  <Label>Date début *</Label>
                  <Input type="date" value={detteForm.date_debut} onChange={(e) => setDetteForm(prev => ({ ...prev, date_debut: e.target.value }))} required />
                </div>
              </div>
              {detteForm.montant_initial > 0 && detteForm.duree_mois > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">Mensualité calculée: <span className="font-bold">{calculateMensualite(detteForm.montant_initial, detteForm.taux_interet, detteForm.duree_mois).toLocaleString()} FCFA</span></p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeForm}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          )}

          {formType === 'actionnaire' && (
            <form onSubmit={handleActionnaireSubmit} className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input value={actionnaireForm.nom} onChange={(e) => setActionnaireForm(prev => ({ ...prev, nom: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de parts *</Label>
                  <Input type="number" value={actionnaireForm.parts} onChange={(e) => setActionnaireForm(prev => ({ ...prev, parts: Number(e.target.value) }))} required />
                </div>
                <div>
                  <Label>Pourcentage *</Label>
                  <Input type="number" step="0.01" value={actionnaireForm.pourcentage} onChange={(e) => setActionnaireForm(prev => ({ ...prev, pourcentage: Number(e.target.value) }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={actionnaireForm.email} onChange={(e) => setActionnaireForm(prev => ({ ...prev, email: e.target.value }))} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input value={actionnaireForm.telephone} onChange={(e) => setActionnaireForm(prev => ({ ...prev, telephone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Montant investi</Label>
                  <Input type="number" value={actionnaireForm.montant_investi} onChange={(e) => setActionnaireForm(prev => ({ ...prev, montant_investi: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Date d'entrée</Label>
                  <Input type="date" value={actionnaireForm.date_entree} onChange={(e) => setActionnaireForm(prev => ({ ...prev, date_entree: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="actif" checked={actionnaireForm.actif} onChange={(e) => setActionnaireForm(prev => ({ ...prev, actif: e.target.checked }))} />
                <Label htmlFor="actif">Actif</Label>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeForm}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          )}

          {formType === 'investissement' && (
            <form onSubmit={handleInvestissementSubmit} className="space-y-4">
              <div>
                <Label>Titre *</Label>
                <Input value={investissementForm.titre} onChange={(e) => setInvestissementForm(prev => ({ ...prev, titre: e.target.value }))} required />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={investissementForm.description} onChange={(e) => setInvestissementForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Montant (FCFA) *</Label>
                  <Input type="number" value={investissementForm.montant} onChange={(e) => setInvestissementForm(prev => ({ ...prev, montant: Number(e.target.value) }))} required />
                </div>
                <div>
                  <Label>Service source</Label>
                  <Input value={investissementForm.source_service} onChange={(e) => setInvestissementForm(prev => ({ ...prev, source_service: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Justification (demande marché)</Label>
                <Textarea value={investissementForm.justification} onChange={(e) => setInvestissementForm(prev => ({ ...prev, justification: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Date prévue</Label>
                  <Input type="date" value={investissementForm.date_prevue} onChange={(e) => setInvestissementForm(prev => ({ ...prev, date_prevue: e.target.value }))} />
                </div>
                <div>
                  <Label>ROI estimé (%)</Label>
                  <Input type="number" value={investissementForm.retour_estime} onChange={(e) => setInvestissementForm(prev => ({ ...prev, retour_estime: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={investissementForm.statut} onValueChange={(v) => setInvestissementForm(prev => ({ ...prev, statut: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planifie">Planifié</SelectItem>
                      <SelectItem value="approuve">Approuvé</SelectItem>
                      <SelectItem value="realise">Réalisé</SelectItem>
                      <SelectItem value="annule">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={closeForm}>Annuler</Button>
                <Button type="submit">Enregistrer</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}