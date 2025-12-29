import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  FileText, 
  Calendar,
  Filter,
  Edit,
  Eye,
  Lock,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import RapportForm from '@/components/rapports/RapportForm';
import moment from 'moment';
import { toast } from 'sonner';

const SERVICES = [
  "PHOTOCOPIE",
  "IMPRESSION & SAISIE", 
  "PHOTO ID",
  "SCAN & PLASTIFICATION",
  "VENTE ARTICLES",
  "IMPRIMERIE"
];

export default function RapportsJournaliers() {
  const [rapports, setRapports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRapport, setEditingRapport] = useState(null);
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [user, setUser] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    service: 'all',
    statut: 'all',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [rapportsData, userData] = await Promise.all([
      base44.entities.RapportJournalier.list('-date', 200),
      base44.auth.me()
    ]);
    setRapports(rapportsData);
    setUser(userData);
    setIsLoading(false);
  };

  const isAdmin = user?.role === 'admin';

  const handleSave = async (data) => {
    if (editingRapport) {
      await base44.entities.RapportJournalier.update(editingRapport.id, data);
      toast.success('Rapport mis à jour');
    } else {
      await base44.entities.RapportJournalier.create(data);
      toast.success('Rapport créé');
    }
    setShowForm(false);
    setEditingRapport(null);
    loadData();
  };

  const handleEdit = (rapport) => {
    if (rapport.verrouille && !isAdmin) {
      toast.error('Ce rapport est verrouillé. Demandez une autorisation de modification.');
      return;
    }
    setEditingRapport(rapport);
    setShowForm(true);
  };

  const handleValidate = async (rapport) => {
    await base44.entities.RapportJournalier.update(rapport.id, { statut: 'valide', verrouille: true });
    toast.success('Rapport validé');
    loadData();
  };

  const requestModification = async (rapport) => {
    await base44.entities.DemandeModification.create({
      rapport_id: rapport.id,
      demandeur: user.email,
      demandeur_nom: user.full_name || user.email,
      motif: 'Demande de modification du rapport du ' + moment(rapport.date).format('DD/MM/YYYY')
    });
    toast.success('Demande de modification envoyée');
  };

  const filteredRapports = rapports.filter(r => {
    if (filters.service !== 'all' && r.service !== filters.service) return false;
    if (filters.statut !== 'all' && r.statut !== filters.statut) return false;
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return r.service?.toLowerCase().includes(search) || 
             r.operateur_nom?.toLowerCase().includes(search);
    }
    return true;
  });

  const getStatusBadge = (statut) => {
    const config = {
      brouillon: { label: 'Brouillon', class: 'bg-slate-100 text-slate-700' },
      soumis: { label: 'Soumis', class: 'bg-blue-100 text-blue-700' },
      valide: { label: 'Validé', class: 'bg-emerald-100 text-emerald-700' },
      modifiable: { label: 'Modifiable', class: 'bg-amber-100 text-amber-700' }
    };
    const { label, class: className } = config[statut] || config.brouillon;
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapports journaliers</h1>
          <p className="text-slate-500">Gérez les rapports quotidiens de chaque service</p>
        </div>
        <Button 
          onClick={() => { setEditingRapport(null); setShowForm(true); }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau rapport
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Rechercher..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.service} onValueChange={(v) => setFilters(prev => ({ ...prev, service: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les services</SelectItem>
                {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.statut} onValueChange={(v) => setFilters(prev => ({ ...prev, statut: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="soumis">Soumis</SelectItem>
                <SelectItem value="valide">Validé</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              placeholder="Date début"
            />
            <Input 
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              placeholder="Date fin"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredRapports.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun rapport trouvé</p>
            <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">
              Créer un rapport
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRapports.map(rapport => (
            <Card key={rapport.id} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{rapport.service}</h3>
                        {getStatusBadge(rapport.statut)}
                        {rapport.verrouille && <Lock className="w-4 h-4 text-slate-400" />}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {moment(rapport.date).format('DD MMMM YYYY')} • {rapport.operateur_nom}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Recettes</p>
                      <p className="font-bold text-emerald-600">{(rapport.recettes || 0).toLocaleString()} FCFA</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Dépenses</p>
                      <p className="font-bold text-rose-500">{(rapport.depenses || 0).toLocaleString()} FCFA</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Bénéfice</p>
                      <p className={`font-bold ${(rapport.recettes - rapport.depenses) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {((rapport.recettes || 0) - (rapport.depenses || 0)).toLocaleString()} FCFA
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedRapport(rapport)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(!rapport.verrouille || isAdmin) && (
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(rapport)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {rapport.verrouille && !isAdmin && (
                        <Button variant="ghost" size="sm" onClick={() => requestModification(rapport)}>
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Demander modif.
                        </Button>
                      )}
                      {isAdmin && rapport.statut === 'soumis' && (
                        <Button variant="ghost" size="icon" onClick={() => handleValidate(rapport)} className="text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRapport ? 'Modifier le rapport' : 'Nouveau rapport journalier'}
            </DialogTitle>
          </DialogHeader>
          <RapportForm 
            rapport={editingRapport}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingRapport(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!selectedRapport} onOpenChange={() => setSelectedRapport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du rapport</DialogTitle>
          </DialogHeader>
          {selectedRapport && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{moment(selectedRapport.date).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Service</p>
                  <p className="font-medium">{selectedRapport.service}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Opérateur</p>
                  <p className="font-medium">{selectedRapport.operateur_nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Statut</p>
                  {getStatusBadge(selectedRapport.statut)}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="text-center">
                  <p className="text-sm text-slate-500">Recettes</p>
                  <p className="text-xl font-bold text-emerald-600">{(selectedRapport.recettes || 0).toLocaleString()} FCFA</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500">Dépenses</p>
                  <p className="text-xl font-bold text-rose-500">{(selectedRapport.depenses || 0).toLocaleString()} FCFA</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500">Bénéfice</p>
                  <p className="text-xl font-bold text-blue-600">
                    {((selectedRapport.recettes || 0) - (selectedRapport.depenses || 0)).toLocaleString()} FCFA
                  </p>
                </div>
              </div>

              {selectedRapport.details_recettes?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Détail des recettes</h4>
                  <div className="space-y-2">
                    {selectedRapport.details_recettes.map((item, i) => (
                      <div key={i} className="flex justify-between p-2 bg-emerald-50 rounded">
                        <span>{item.libelle}</span>
                        <span className="font-medium">{item.quantite}x {item.montant} = {(item.quantite * item.montant).toLocaleString()} FCFA</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRapport.details_depenses?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Détail des dépenses</h4>
                  <div className="space-y-2">
                    {selectedRapport.details_depenses.map((item, i) => (
                      <div key={i} className="flex justify-between p-2 bg-rose-50 rounded">
                        <span>{item.libelle}</span>
                        <span className="font-medium">{item.montant.toLocaleString()} FCFA</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedRapport.observations && (
                <div>
                  <h4 className="font-medium mb-2">Observations</h4>
                  <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{selectedRapport.observations}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}