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
  AlertCircle,
  Trash2
} from 'lucide-react';
import RapportForm from '@/components/rapports/RapportForm';
import SpreadsheetEditor from '@/components/rapports/SpreadsheetEditor';
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
  const [dailyReports, setDailyReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [editingRapport, setEditingRapport] = useState(null);
  const [editingDailyReport, setEditingDailyReport] = useState(null);
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [user, setUser] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rapportToDelete, setRapportToDelete] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
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
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      // Tous les employés voient tous les rapports
      const [rapportsData, dailyReportsData] = await Promise.all([
        base44.entities.RapportJournalier.list('-date', 200),
        base44.entities.DailyReport.list('-date', 200)
      ]);

      setRapports(rapportsData);
      setDailyReports(dailyReportsData);
    } catch (e) {
      console.error('Error loading data:', e);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isEmployee = user?.role === 'user';

  const handleSave = async (data) => {
    // Check if report is empty (no data in any service)
    const hasData = data.services_data?.some(s => 
      (s.details_recettes?.length > 0) || (s.details_depenses?.length > 0)
    );

    if (!hasData && data.statut === 'soumis') {
      toast.error('Impossible de soumettre un rapport vide');
      return;
    }

    if (editingRapport) {
      await base44.entities.RapportJournalier.update(editingRapport.id, data);
      toast.success('Rapport mis à jour');
    } else {
      // Check if a report already exists for this date
      const existingRapports = await base44.entities.RapportJournalier.filter({ date: data.date });
      
      if (existingRapports.length > 0) {
        // Merge reports from same date
        const existingRapport = existingRapports[0];
        const mergedServicesData = [...existingRapport.services_data];
        
        // Merge new data with existing
        data.services_data.forEach(newServiceData => {
          const existingServiceIndex = mergedServicesData.findIndex(s => s.service === newServiceData.service);
          if (existingServiceIndex >= 0) {
            // Merge details
            mergedServicesData[existingServiceIndex].details_recettes = [
              ...(mergedServicesData[existingServiceIndex].details_recettes || []),
              ...(newServiceData.details_recettes || [])
            ];
            mergedServicesData[existingServiceIndex].details_depenses = [
              ...(mergedServicesData[existingServiceIndex].details_depenses || []),
              ...(newServiceData.details_depenses || [])
            ];
            // Recalculate totals
            mergedServicesData[existingServiceIndex].recettes = 
              mergedServicesData[existingServiceIndex].details_recettes.reduce((sum, item) => 
                sum + (item.montant * (item.quantite || 1)), 0);
            mergedServicesData[existingServiceIndex].depenses = 
              mergedServicesData[existingServiceIndex].details_depenses.reduce((sum, item) => 
                sum + item.montant, 0);
          }
        });

        const totalRecettes = mergedServicesData.reduce((sum, s) => sum + (s.recettes || 0), 0);
        const totalDepenses = mergedServicesData.reduce((sum, s) => sum + (s.depenses || 0), 0);

        await base44.entities.RapportJournalier.update(existingRapport.id, {
          ...data,
          services_data: mergedServicesData,
          total_recettes: totalRecettes,
          total_depenses: totalDepenses,
          observations: (existingRapport.observations || '') + '\n' + (data.observations || '')
        });
        toast.success('Rapport fusionné avec le rapport existant du ' + data.date);
      } else {
        await base44.entities.RapportJournalier.create(data);
        toast.success('Rapport créé');
      }
    }
    
    setShowForm(false);
    setEditingRapport(null);
    loadData();
    
    // Clean up empty reports
    await cleanupEmptyReports();
  };

  const cleanupEmptyReports = async () => {
    const allRapports = await base44.entities.RapportJournalier.list();
    for (const rapport of allRapports) {
      const hasData = rapport.services_data?.some(s => 
        (s.details_recettes?.length > 0) || (s.details_depenses?.length > 0) ||
        (s.recettes > 0) || (s.depenses > 0)
      );
      if (!hasData) {
        await base44.entities.RapportJournalier.delete(rapport.id);
      }
    }
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
    
    // Send email notification to all users
    try {
      const allUsers = await base44.entities.User.list();
      for (const targetUser of allUsers) {
        if (targetUser.email) {
          await base44.integrations.Core.SendEmail({
            from_name: 'Imprimerie Ogooué',
            to: targetUser.email,
            subject: 'Nouvelle demande de modification de rapport',
            body: `Bonjour,\n\n${user.full_name || user.email} a demandé la modification du rapport du ${moment(rapport.date).format('DD/MM/YYYY')}.\n\nMotif: Demande de modification du rapport\n\nVeuillez consulter la plateforme pour traiter cette demande.\n\nCordialement,\nImprimerie Ogooué`
          });
        }
      }
    } catch (e) {
      console.log('Email notification error:', e);
    }
    
    toast.success('Demande de modification envoyée et notifications email envoyées');
  };

  const handleDeleteRapport = async () => {
    if (!deleteReason.trim()) {
      toast.error('Veuillez indiquer la raison de la suppression');
      return;
    }

    // Save deletion record
    await base44.entities.SuppressionRapport.create({
      rapport_id: rapportToDelete.id,
      rapport_date: rapportToDelete.date,
      rapport_data: rapportToDelete,
      supprime_par: user.email,
      supprime_par_nom: user.full_name || user.email,
      raison: deleteReason
    });

    // Delete the report
    await base44.entities.RapportJournalier.delete(rapportToDelete.id);
    
    toast.success('Rapport supprimé');
    setShowDeleteDialog(false);
    setRapportToDelete(null);
    setDeleteReason('');
    loadData();
  };

  const filteredRapports = rapports.filter(r => {
    if (filters.service !== 'all') {
      // Check if any service in services_data matches
      const hasService = r.services_data?.some(s => s.service === filters.service && (s.recettes > 0 || s.depenses > 0));
      if (!hasService) return false;
    }
    if (filters.statut !== 'all' && r.statut !== filters.statut) return false;
    if (filters.dateFrom && r.date < filters.dateFrom) return false;
    if (filters.dateTo && r.date > filters.dateTo) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      return r.operateur_nom?.toLowerCase().includes(search) ||
             moment(r.date).format('DD/MM/YYYY').includes(search);
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
          <p className="text-slate-500">
            {isEmployee ? 'Saisissez votre rapport journalier en mode tableur' : 'Gérez les rapports quotidiens en mode tableur'}
          </p>
        </div>
        <Button 
          onClick={() => { setEditingDailyReport(null); setShowSpreadsheet(true); }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau rapport (Mode Tableur)
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
      ) : dailyReports.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun rapport trouvé</p>
            <Button onClick={() => setShowSpreadsheet(true)} variant="outline" className="mt-4">
              Créer un rapport
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {dailyReports.map(rapport => (
            <Card key={rapport.id} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">Rapport du {moment(rapport.date).format('DD MMMM YYYY')}</h3>
                        {getStatusBadge(rapport.statut)}
                        {rapport.statut === 'verrouille' && <Lock className="w-4 h-4 text-slate-400" />}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Opérateur: {rapport.operateur_nom}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Mode tableur Excel
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Total Entrées</p>
                      <p className="font-bold text-emerald-600">{(rapport.total_entrees || 0).toLocaleString()} XAF</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Total Sorties</p>
                      <p className="font-bold text-rose-500">{(rapport.total_sorties || 0).toLocaleString()} XAF</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Caisse Journée</p>
                      <p className={`font-bold ${(rapport.caisse_journee) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {(rapport.caisse_journee || 0).toLocaleString()} XAF
                      </p>
                    </div>
                    {rapport.ecart !== null && rapport.ecart !== undefined && (
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Écart</p>
                        <p className={`font-bold ${rapport.ecart >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {rapport.ecart.toLocaleString()} XAF
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedRapport(rapport)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {rapport.statut === 'brouillon' && (
                        <Button variant="ghost" size="icon" onClick={() => { setEditingDailyReport(rapport); setShowSpreadsheet(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && rapport.statut === 'soumis' && (
                        <Button variant="ghost" size="icon" onClick={async () => {
                          await base44.entities.DailyReport.update(rapport.id, { statut: 'verrouille' });
                          toast.success('Rapport verrouillé');
                          loadData();
                        }} className="text-emerald-600">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={async () => { 
                            if (confirm('Supprimer ce rapport ?')) {
                              const rows = await base44.entities.DailyReportRow.filter({ report_id: rapport.id });
                              for (const row of rows) {
                                await base44.entities.DailyReportRow.delete(row.id);
                              }
                              await base44.entities.DailyReport.delete(rapport.id);
                              toast.success('Rapport supprimé');
                              loadData();
                            }
                          }}
                          className="text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Spreadsheet Editor Dialog */}
      <Dialog open={showSpreadsheet} onOpenChange={setShowSpreadsheet}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDailyReport ? 'Modifier le rapport' : 'Nouveau rapport journalier - Mode Tableur'}
            </DialogTitle>
          </DialogHeader>
          <SpreadsheetEditor 
            report={editingDailyReport}
            onSave={loadData}
            onClose={() => { setShowSpreadsheet(false); setEditingDailyReport(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Form Dialog (ancien mode - optionnel) */}
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
                  <p className="text-sm text-slate-500">Statut</p>
                  {getStatusBadge(selectedRapport.statut)}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Opérateur</p>
                  <p className="font-medium">{selectedRapport.operateur_nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Services actifs</p>
                  <p className="font-medium">{selectedRapport.services_data?.filter(s => s.recettes > 0 || s.depenses > 0).length || 0}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="text-center">
                  <p className="text-sm text-slate-500">Total Recettes</p>
                  <p className="text-xl font-bold text-emerald-600">{(selectedRapport.total_recettes || 0).toLocaleString()} FCFA</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500">Total Dépenses</p>
                  <p className="text-xl font-bold text-rose-500">{(selectedRapport.total_depenses || 0).toLocaleString()} FCFA</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500">Bénéfice</p>
                  <p className="text-xl font-bold text-blue-600">
                    {((selectedRapport.total_recettes || 0) - (selectedRapport.total_depenses || 0)).toLocaleString()} FCFA
                  </p>
                </div>
              </div>

              {/* Tableau par service */}
              <div>
                <h4 className="font-medium mb-3">Détail par service</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-slate-600">Service</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-600">Recettes</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-600">Dépenses</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-600">Bénéfice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRapport.services_data?.filter(s => s.recettes > 0 || s.depenses > 0).map((serviceData, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-3 font-medium">{serviceData.service}</td>
                          <td className="p-3 text-right text-emerald-600">{(serviceData.recettes || 0).toLocaleString()} FCFA</td>
                          <td className="p-3 text-right text-rose-600">{(serviceData.depenses || 0).toLocaleString()} FCFA</td>
                          <td className={`p-3 text-right font-bold ${(serviceData.recettes - serviceData.depenses) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {((serviceData.recettes || 0) - (serviceData.depenses || 0)).toLocaleString()} FCFA
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Détails des recettes et dépenses */}
              {selectedRapport.services_data?.some(s => s.details_recettes?.length > 0 || s.details_depenses?.length > 0) && (
                <div>
                  <h4 className="font-medium mb-3">Détails des transactions</h4>
                  <div className="space-y-4">
                    {selectedRapport.services_data.map((serviceData, sIndex) => {
                      if ((serviceData.details_recettes?.length || 0) === 0 && (serviceData.details_depenses?.length || 0) === 0) return null;
                      return (
                        <div key={sIndex} className="border rounded-lg p-4">
                          <h5 className="font-medium mb-2 text-blue-600">{serviceData.service}</h5>
                          
                          {serviceData.details_recettes?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-emerald-700 mb-1">Recettes:</p>
                              <div className="space-y-1">
                                {serviceData.details_recettes.map((item, i) => (
                                  <div key={i} className="flex justify-between text-sm p-2 bg-emerald-50 rounded">
                                    <span>{item.libelle}</span>
                                    <span className="font-medium">{item.quantite}x {item.montant} = {(item.quantite * item.montant).toLocaleString()} FCFA</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {serviceData.details_depenses?.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-rose-700 mb-1">Dépenses:</p>
                              <div className="space-y-1">
                                {serviceData.details_depenses.map((item, i) => (
                                  <div key={i} className="flex justify-between text-sm p-2 bg-rose-50 rounded">
                                    <span>{item.libelle}</span>
                                    <span className="font-medium">{item.montant.toLocaleString()} FCFA</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Supprimer le rapport</DialogTitle>
          </DialogHeader>
          {rapportToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">⚠️ Attention</p>
                <p className="text-sm text-amber-700 mt-1">
                  Vous êtes sur le point de supprimer le rapport du {moment(rapportToDelete.date).format('DD/MM/YYYY')}.
                  Cette action est irréversible.
                </p>
              </div>
              
              <div>
                <Label>Raison de la suppression *</Label>
                <Textarea 
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Expliquez pourquoi ce rapport doit être supprimé..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => { setShowDeleteDialog(false); setDeleteReason(''); }}>
                  Annuler
                </Button>
                <Button 
                  className="bg-rose-600 hover:bg-rose-700"
                  onClick={handleDeleteRapport}
                  disabled={!deleteReason.trim()}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Confirmer la suppression
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}