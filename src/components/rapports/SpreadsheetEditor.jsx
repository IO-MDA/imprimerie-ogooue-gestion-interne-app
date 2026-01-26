import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Send, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import SpreadsheetGrid from './SpreadsheetGrid';
import { formatMontant } from '@/components/utils/formatMontant.jsx';

const INITIAL_ROWS_COUNT = 30;

export default function SpreadsheetEditor({ report, onClose, onSave }) {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    date: report?.date || moment().format('YYYY-MM-DD'),
    operateur_id: report?.operateur_id || '',
    operateur_nom: report?.operateur_nom || '',
    cash_caisse: report?.cash_caisse || ''
  });
  const [rows, setRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (rows.length > 0) {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
      const timeout = setTimeout(() => {
        if (report?.id) {
          autoSave();
        }
      }, 3000);
      setAutoSaveTimeout(timeout);
    }
  }, [rows, formData.cash_caisse]);

  const loadData = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const usersData = await base44.entities.User.list();
      setUsers(usersData);

      if (report?.id) {
        const rowsData = await base44.entities.DailyReportRow.filter({ report_id: report.id });
        const sortedRows = rowsData.sort((a, b) => a.row_index - b.row_index);
        
        if (sortedRows.length > 0) {
          setRows(sortedRows.map(r => ({
            id: r.id,
            copies: r.copies || 0,
            marchandises: r.marchandises || 0,
            scan: r.scan || 0,
            tirage_saisies: r.tirage_saisies || 0,
            badges_plastification: r.badges_plastification || 0,
            demi_photos: r.demi_photos || 0,
            maintenance: r.maintenance || 0,
            imprimerie: r.imprimerie || 0,
            sorties: r.sorties || 0,
            description: r.description || ''
          })));
        } else {
          initializeEmptyRows();
        }

        setFormData({
          date: report.date,
          operateur_id: report.operateur_id,
          operateur_nom: report.operateur_nom,
          cash_caisse: report.cash_caisse || ''
        });
      } else {
        // Nouveau rapport - utiliser l'utilisateur connecté comme opérateur
        setFormData({
          date: moment().format('YYYY-MM-DD'),
          operateur_id: userData.id,
          operateur_nom: userData.full_name || userData.email,
          cash_caisse: ''
        });
        initializeEmptyRows();
      }
    } catch (e) {
      toast.error('Erreur de chargement');
    }
  };

  const initializeEmptyRows = () => {
    const emptyRows = Array.from({ length: INITIAL_ROWS_COUNT }, () => ({
      copies: 0,
      marchandises: 0,
      scan: 0,
      tirage_saisies: 0,
      badges_plastification: 0,
      demi_photos: 0,
      maintenance: 0,
      imprimerie: 0,
      sorties: 0,
      description: ''
    }));
    setRows(emptyRows);
  };

  const calculateTotals = () => {
    const totalEntrees = rows.reduce((sum, row) => {
      return sum + (row.copies || 0) + (row.marchandises || 0) + (row.scan || 0) + 
             (row.tirage_saisies || 0) + (row.badges_plastification || 0) + 
             (row.demi_photos || 0) + (row.maintenance || 0) + (row.imprimerie || 0);
    }, 0);

    const totalSorties = rows.reduce((sum, row) => sum + (row.sorties || 0), 0);
    const caisseJournee = totalEntrees - totalSorties;
    
    const cashCaisse = parseFloat(formData.cash_caisse) || 0;
    const ecart = cashCaisse > 0 ? cashCaisse - caisseJournee : null;

    return { totalEntrees, totalSorties, caisseJournee, ecart };
  };

  const autoSave = async () => {
    if (!report?.id || report?.statut !== 'brouillon') return;

    try {
      const { totalEntrees, totalSorties, caisseJournee, ecart } = calculateTotals();
      
      await base44.entities.DailyReport.update(report.id, {
        cash_caisse: parseFloat(formData.cash_caisse) || null,
        total_entrees: totalEntrees,
        total_sorties: totalSorties,
        caisse_journee: caisseJournee,
        ecart: ecart
      });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.id) {
          await base44.entities.DailyReportRow.update(row.id, {
            copies: row.copies || 0,
            marchandises: row.marchandises || 0,
            scan: row.scan || 0,
            tirage_saisies: row.tirage_saisies || 0,
            badges_plastification: row.badges_plastification || 0,
            demi_photos: row.demi_photos || 0,
            maintenance: row.maintenance || 0,
            imprimerie: row.imprimerie || 0,
            sorties: row.sorties || 0,
            description: row.description || ''
          });
        }
      }
    } catch (e) {
      console.error('Auto-save error:', e);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.date || !formData.operateur_id) {
      toast.error('Date et opérateur requis');
      return;
    }

    setIsSaving(true);
    try {
      const { totalEntrees, totalSorties, caisseJournee, ecart } = calculateTotals();

      let reportId = report?.id;

      if (!reportId) {
        const newReport = await base44.entities.DailyReport.create({
          date: formData.date,
          operateur_id: formData.operateur_id,
          operateur_nom: formData.operateur_nom,
          statut: 'brouillon',
          cash_caisse: parseFloat(formData.cash_caisse) || null,
          total_entrees: totalEntrees,
          total_sorties: totalSorties,
          caisse_journee: caisseJournee,
          ecart: ecart
        });
        reportId = newReport.id;
      } else {
        await base44.entities.DailyReport.update(reportId, {
          date: formData.date,
          operateur_id: formData.operateur_id,
          operateur_nom: formData.operateur_nom,
          cash_caisse: parseFloat(formData.cash_caisse) || null,
          total_entrees: totalEntrees,
          total_sorties: totalSorties,
          caisse_journee: caisseJournee,
          ecart: ecart
        });
      }

      const existingRows = await base44.entities.DailyReportRow.filter({ report_id: reportId });
      for (const existingRow of existingRows) {
        await base44.entities.DailyReportRow.delete(existingRow.id);
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const hasData = row.copies || row.marchandises || row.scan || row.tirage_saisies || 
                       row.badges_plastification || row.demi_photos || row.maintenance || 
                       row.imprimerie || row.sorties || row.description;

        if (hasData) {
          await base44.entities.DailyReportRow.create({
            report_id: reportId,
            row_index: i,
            copies: row.copies || 0,
            marchandises: row.marchandises || 0,
            scan: row.scan || 0,
            tirage_saisies: row.tirage_saisies || 0,
            badges_plastification: row.badges_plastification || 0,
            demi_photos: row.demi_photos || 0,
            maintenance: row.maintenance || 0,
            imprimerie: row.imprimerie || 0,
            sorties: row.sorties || 0,
            description: row.description || ''
          });
        }
      }

      toast.success('Brouillon enregistré');
      onSave();
      onClose();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.date || !formData.operateur_id) {
      toast.error('Date et opérateur requis');
      return;
    }

    setIsSaving(true);
    try {
      const { totalEntrees, totalSorties, caisseJournee, ecart } = calculateTotals();

      let reportId = report?.id;

      if (!reportId) {
        const newReport = await base44.entities.DailyReport.create({
          date: formData.date,
          operateur_id: formData.operateur_id,
          operateur_nom: formData.operateur_nom,
          statut: 'soumis',
          cash_caisse: parseFloat(formData.cash_caisse) || null,
          total_entrees: totalEntrees,
          total_sorties: totalSorties,
          caisse_journee: caisseJournee,
          ecart: ecart
        });
        reportId = newReport.id;
      } else {
        await base44.entities.DailyReport.update(reportId, {
          statut: 'soumis',
          cash_caisse: parseFloat(formData.cash_caisse) || null,
          total_entrees: totalEntrees,
          total_sorties: totalSorties,
          caisse_journee: caisseJournee,
          ecart: ecart
        });
      }

      const existingRows = await base44.entities.DailyReportRow.filter({ report_id: reportId });
      for (const existingRow of existingRows) {
        await base44.entities.DailyReportRow.delete(existingRow.id);
      }

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const hasData = row.copies || row.marchandises || row.scan || row.tirage_saisies || 
                       row.badges_plastification || row.demi_photos || row.maintenance || 
                       row.imprimerie || row.sorties || row.description;

        if (hasData) {
          await base44.entities.DailyReportRow.create({
            report_id: reportId,
            row_index: i,
            copies: row.copies || 0,
            marchandises: row.marchandises || 0,
            scan: row.scan || 0,
            tirage_saisies: row.tirage_saisies || 0,
            badges_plastification: row.badges_plastification || 0,
            demi_photos: row.demi_photos || 0,
            maintenance: row.maintenance || 0,
            imprimerie: row.imprimerie || 0,
            sorties: row.sorties || 0,
            description: row.description || ''
          });
        }
      }

      toast.success('Rapport soumis avec succès');
      onSave();
      onClose();
    } catch (e) {
      toast.error('Erreur lors de la soumission');
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRowsChange = (newRows) => {
    setRows(newRows);
    if (newRows.length > 0 && newRows[newRows.length - 1].copies !== 0) {
      setRows([...newRows, {
        copies: 0,
        marchandises: 0,
        scan: 0,
        tirage_saisies: 0,
        badges_plastification: 0,
        demi_photos: 0,
        maintenance: 0,
        imprimerie: 0,
        sorties: 0,
        description: ''
      }]);
    }
  };

  const { totalEntrees, totalSorties, caisseJournee, ecart } = calculateTotals();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  
  // Logique d'édition :
  // - Tout le monde peut créer un nouveau rapport
  // - Tous les employés peuvent éditer les brouillons (pas seulement le leur)
  // - Seuls les rapports soumis ou verrouillés ne peuvent pas être édités par les employés
  // - Les admins peuvent tout éditer sauf les verrouillés
  const canEdit = !report || 
                  (report.statut === 'brouillon') || 
                  (isAdmin && report.statut !== 'verrouille');

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardTitle className="text-center text-xl">
            Rapport journalier : {moment(formData.date).format('DD/MM/YYYY')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label>Opérateur *</Label>
              {isAdmin ? (
                <Select 
                  value={formData.operateur_id} 
                  onValueChange={(v) => {
                    const selectedUser = users.find(u => u.id === v);
                    setFormData({ 
                      ...formData, 
                      operateur_id: v,
                      operateur_nom: selectedUser?.full_name || selectedUser?.email || ''
                    });
                  }}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input 
                  value={formData.operateur_nom} 
                  disabled 
                  className="bg-slate-100"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
            <div>
              <Label className="text-xs text-slate-500">CAISSE JOURNÉE (calculé)</Label>
              <p className="text-2xl font-bold text-blue-600">
                {formatMontant(caisseJournee)} F
              </p>
            </div>
            <div>
              <Label className="text-xs">CASH CAISSE (saisie manuelle)</Label>
              <Input
                type="number"
                value={formData.cash_caisse}
                onChange={(e) => setFormData({ ...formData, cash_caisse: e.target.value })}
                placeholder="Montant réel en caisse"
                disabled={!canEdit}
              />
            </div>
            {formData.cash_caisse && (
              <div>
                <Label className="text-xs text-slate-500">ÉCART</Label>
                <p className={`text-2xl font-bold ${ecart >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {ecart !== null ? `${formatMontant(ecart)} F` : '-'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SpreadsheetGrid 
        rows={rows} 
        onChange={handleRowsChange}
        readOnly={!canEdit}
      />

      <Card className="border-0 shadow-lg bg-gradient-to-r from-slate-50 to-slate-100">
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4">Résumé de la journée</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-slate-500">Total Recettes</p>
              <p className="text-2xl font-bold text-emerald-600">{formatMontant(totalEntrees)} F</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-slate-500">Total Dépenses</p>
              <p className="text-2xl font-bold text-red-600">{formatMontant(totalSorties)} F</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-slate-500">Bénéfice net</p>
              <p className="text-2xl font-bold text-blue-600">{formatMontant(caisseJournee)} F</p>
            </div>
            {formData.cash_caisse && ecart !== null && (
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-slate-500">Écart caisse</p>
                <p className={`text-2xl font-bold ${ecart >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatMontant(ecart)} F
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
          <Button 
            onClick={handleSaveDraft}
            disabled={isSaving}
            variant="outline"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer brouillon
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-blue-600"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Soumettre
          </Button>
        </div>
      )}
    </div>
  );
}