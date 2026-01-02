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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Users, User, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import moment from 'moment';

export default function Objectifs() {
  const [objectifs, setObjectifs] = useState([]);
  const [rapports, setRapports] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingObjectif, setEditingObjectif] = useState(null);
  const [activeTab, setActiveTab] = useState('global');
  
  const [formData, setFormData] = useState({
    type: 'mensuel',
    categorie: 'global',
    periode: moment().format('YYYY-MM'),
    objectif_recettes: '',
    objectif_benefice: '',
    objectif_commandes: '',
    equipe_departement: '',
    responsable_id: '',
    responsable_nom: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [objectifsData, rapportsData, usersData, userData] = await Promise.all([
        base44.entities.Objectif.list('-created_date'),
        base44.entities.RapportJournalier.list('-date', 365),
        base44.entities.User.list(),
        base44.auth.me()
      ]);
      
      // Calculate real data without updating database
      const objectifsWithData = objectifsData.map(objectif => {
        const filteredRapports = rapportsData.filter(r => {
          if (objectif.type === 'mensuel') {
            return moment(r.date).format('YYYY-MM') === objectif.periode;
          } else {
            return moment(r.date).format('YYYY') === objectif.periode;
          }
        });

        const recettes = filteredRapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
        const benefice = filteredRapports.reduce((sum, r) => sum + ((r.total_recettes || 0) - (r.total_depenses || 0)), 0);
        
        let statut = 'en_cours';
        if (objectif.objectif_recettes && recettes >= objectif.objectif_recettes) {
          statut = 'atteint';
        } else if (moment().isAfter(moment(objectif.periode, 'YYYY-MM').endOf('month'))) {
          statut = 'echoue';
        } else if (recettes < objectif.objectif_recettes * 0.5 && moment().date() > 15) {
          statut = 'en_retard';
        }

        return {
          ...objectif,
          recettes_reelles: recettes,
          benefice_reel: benefice,
          statut
        };
      });
      
      setObjectifs(objectifsWithData);
      setRapports(rapportsData);
      setUsers(usersData);
      setUser(userData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndNotify = async () => {
    const objectifsEnRetard = objectifs.filter(o => 
      o.statut === 'en_retard' && !o.notification_envoyee
    );

    for (const obj of objectifsEnRetard) {
      await base44.integrations.Core.SendEmail({
        to: 'admin@imprimerieogooue.com',
        subject: `⚠️ Alerte objectif en retard - ${obj.equipe_departement || 'Global'}`,
        body: `L'objectif ${obj.type} de ${obj.periode} est en retard significatif.\n\nObjectif: ${obj.objectif_recettes?.toLocaleString()} FCFA\nRéalisé: ${obj.recettes_reelles?.toLocaleString()} FCFA\nProgression: ${((obj.recettes_reelles / obj.objectif_recettes) * 100).toFixed(1)}%`
      });
      
      await base44.entities.Objectif.update(obj.id, { notification_envoyee: true });
    }
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        objectif_recettes: parseFloat(formData.objectif_recettes) || 0,
        objectif_benefice: parseFloat(formData.objectif_benefice) || 0,
        objectif_commandes: parseFloat(formData.objectif_commandes) || 0,
        date_debut: moment(formData.periode).startOf(formData.type === 'mensuel' ? 'month' : 'year').format('YYYY-MM-DD'),
        date_fin: moment(formData.periode).endOf(formData.type === 'mensuel' ? 'month' : 'year').format('YYYY-MM-DD')
      };

      if (editingObjectif) {
        await base44.entities.Objectif.update(editingObjectif.id, data);
        toast.success('Objectif mis à jour');
      } else {
        await base44.entities.Objectif.create(data);
        toast.success('Objectif créé');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'mensuel',
      categorie: 'global',
      periode: moment().format('YYYY-MM'),
      objectif_recettes: '',
      objectif_benefice: '',
      objectif_commandes: '',
      equipe_departement: '',
      responsable_id: '',
      responsable_nom: '',
      notes: ''
    });
    setEditingObjectif(null);
  };

  const handleEdit = (obj) => {
    setFormData({
      type: obj.type,
      categorie: obj.categorie,
      periode: obj.periode,
      objectif_recettes: obj.objectif_recettes || '',
      objectif_benefice: obj.objectif_benefice || '',
      objectif_commandes: obj.objectif_commandes || '',
      equipe_departement: obj.equipe_departement || '',
      responsable_id: obj.responsable_id || '',
      responsable_nom: obj.responsable_nom || '',
      notes: obj.notes || ''
    });
    setEditingObjectif(obj);
    setShowForm(true);
  };

  const filteredObjectifs = objectifs.filter(o => o.categorie === activeTab);

  const getProgressionData = (objectif) => {
    const progression = objectif.objectif_recettes > 0 
      ? (objectif.recettes_reelles / objectif.objectif_recettes * 100) 
      : 0;
    
    return [
      { name: 'Réalisé', value: objectif.recettes_reelles || 0 },
      { name: 'Restant', value: Math.max(0, (objectif.objectif_recettes || 0) - (objectif.recettes_reelles || 0)) }
    ];
  };

  const getEvolutionData = (objectif) => {
    const periode = objectif.periode;
    const filteredRapports = rapports.filter(r => {
      if (objectif.type === 'mensuel') {
        return moment(r.date).format('YYYY-MM') === periode;
      } else {
        return moment(r.date).format('YYYY') === periode;
      }
    }).sort((a, b) => moment(a.date).diff(moment(b.date)));

    let cumul = 0;
    return filteredRapports.map(r => {
      cumul += r.total_recettes || 0;
      return {
        date: moment(r.date).format('DD/MM'),
        recettes: cumul,
        objectif: objectif.objectif_recettes || 0
      };
    });
  };

  const getStatusBadge = (statut) => {
    const configs = {
      en_cours: { label: 'En cours', class: 'bg-blue-100 text-blue-700' },
      atteint: { label: 'Atteint ✓', class: 'bg-emerald-100 text-emerald-700' },
      echoue: { label: 'Échoué', class: 'bg-rose-100 text-rose-700' },
      en_retard: { label: 'En retard ⚠️', class: 'bg-amber-100 text-amber-700' }
    };
    const config = configs[statut] || configs.en_cours;
    return <Badge className={config.class}>{config.label}</Badge>;
  };

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
          <h1 className="text-2xl font-bold text-slate-900">Objectifs</h1>
          <p className="text-slate-500">Définissez et suivez vos objectifs de performance</p>
        </div>
        {(isAdmin || isManager) && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nouvel objectif
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="global">
            <Target className="w-4 h-4 mr-2" />
            Globaux
          </TabsTrigger>
          <TabsTrigger value="equipe">
            <Users className="w-4 h-4 mr-2" />
            Équipes
          </TabsTrigger>
          <TabsTrigger value="individuel">
            <User className="w-4 h-4 mr-2" />
            Individuels
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6 space-y-6">
          {filteredObjectifs.map(objectif => {
            const progression = objectif.objectif_recettes > 0 
              ? (objectif.recettes_reelles / objectif.objectif_recettes * 100) 
              : 0;

            return (
              <Card key={objectif.id} className="border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        {objectif.equipe_departement || 'Objectif global'}
                        {getStatusBadge(objectif.statut)}
                      </CardTitle>
                      <p className="text-sm text-slate-500 mt-1">
                        {objectif.type === 'mensuel' ? moment(objectif.periode).format('MMMM YYYY') : objectif.periode}
                        {objectif.responsable_nom && ` • Responsable: ${objectif.responsable_nom}`}
                      </p>
                    </div>
                    {(isAdmin || isManager) && (
                      <Button variant="outline" size="sm" onClick={() => handleEdit(objectif)}>
                        Modifier
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 mb-1">Objectif recettes</p>
                      <p className="text-2xl font-bold text-blue-900">{(objectif.objectif_recettes || 0).toLocaleString()} F</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-lg">
                      <p className="text-sm text-emerald-600 mb-1">Recettes réelles</p>
                      <p className="text-2xl font-bold text-emerald-900">{(objectif.recettes_reelles || 0).toLocaleString()} F</p>
                    </div>
                    <div className="p-4 bg-violet-50 rounded-lg">
                      <p className="text-sm text-violet-600 mb-1">Progression</p>
                      <p className="text-2xl font-bold text-violet-900">{progression.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Progression vers l'objectif</span>
                      <span className="font-medium">{progression.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          progression >= 100 ? 'bg-emerald-500' : 
                          progression >= 75 ? 'bg-blue-500' : 
                          progression >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(progression, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Évolution cumulative</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={getEvolutionData(objectif)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="recettes" stroke="#3b82f6" name="Recettes" strokeWidth={2} />
                          <Line type="monotone" dataKey="objectif" stroke="#10b981" name="Objectif" strokeDasharray="5 5" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Répartition</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={getProgressionData(objectif)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {objectif.notes && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-600">{objectif.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {filteredObjectifs.length === 0 && (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun objectif {activeTab}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingObjectif ? 'Modifier' : 'Nouvel'} objectif</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensuel">Mensuel</SelectItem>
                    <SelectItem value="annuel">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select value={formData.categorie} onValueChange={(v) => setFormData({...formData, categorie: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="equipe">Équipe/Département</SelectItem>
                    <SelectItem value="individuel">Individuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Période</Label>
              <Input
                type={formData.type === 'mensuel' ? 'month' : 'number'}
                value={formData.periode}
                onChange={(e) => setFormData({...formData, periode: e.target.value})}
                placeholder={formData.type === 'mensuel' ? '2026-01' : '2026'}
              />
            </div>

            {(formData.categorie === 'equipe' || formData.categorie === 'individuel') && (
              <>
                <div>
                  <Label>{formData.categorie === 'equipe' ? 'Équipe/Département' : 'Nom'}</Label>
                  <Input
                    value={formData.equipe_departement}
                    onChange={(e) => setFormData({...formData, equipe_departement: e.target.value})}
                    placeholder={formData.categorie === 'equipe' ? 'Service Production' : 'Nom de la personne'}
                  />
                </div>
                {formData.categorie === 'equipe' && (
                  <div>
                    <Label>Responsable</Label>
                    <Select onValueChange={(v) => {
                      const user = users.find(u => u.id === v);
                      setFormData({...formData, responsable_id: v, responsable_nom: user?.full_name || ''});
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un responsable" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Objectif recettes (FCFA)</Label>
                <Input
                  type="number"
                  value={formData.objectif_recettes}
                  onChange={(e) => setFormData({...formData, objectif_recettes: e.target.value})}
                />
              </div>
              <div>
                <Label>Objectif bénéfice (FCFA)</Label>
                <Input
                  type="number"
                  value={formData.objectif_benefice}
                  onChange={(e) => setFormData({...formData, objectif_benefice: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label>Objectif nombre de commandes</Label>
              <Input
                type="number"
                value={formData.objectif_commandes}
                onChange={(e) => setFormData({...formData, objectif_commandes: e.target.value})}
              />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Annuler
              </Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                {editingObjectif ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </RoleProtection>
  );
}