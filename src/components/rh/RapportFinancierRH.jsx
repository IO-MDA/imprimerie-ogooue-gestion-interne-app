import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';
import { formatMontant } from '@/components/utils/formatMontant';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RapportFinancierRH({ selectedMonth }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState(null);

  const genererRapport = async () => {
    setIsGenerating(true);
    try {
      const [users, pointages, avances, chargesFixes] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Pointage.list('-date', 1000),
        base44.entities.Avance.list('-date_avance', 500),
        base44.entities.ChargeFixe.filter({ active: true })
      ]);

      // Données pour le mois sélectionné
      const pointagesMois = pointages.filter(p => 
        moment(p.date).format('YYYY-MM') === selectedMonth
      );

      const avancesMois = avances.filter(a => 
        a.mois_comptable === selectedMonth && (a.statut === 'validee' || a.statut === 'deduite')
      );

      const chargesSalaires = chargesFixes.filter(c => c.type === 'salaire');

      // Calcul par employé
      const employes = users.map(user => {
        const pointagesUser = pointagesMois.filter(p => p.employe_id === user.id);
        const heures = pointagesUser.reduce((sum, p) => sum + (p.duree_minutes || 0), 0) / 60;
        
        const avancesUser = avancesMois.filter(a => a.employe_id === user.id);
        const totalAvances = avancesUser.reduce((sum, a) => sum + a.montant, 0);
        
        const charge = chargesSalaires.find(c => c.beneficiaire === user.full_name);
        const salaire = charge?.montant_mensuel || 0;

        return {
          nom: user.full_name,
          email: user.email,
          role: user.role,
          heures,
          salaire,
          avances: totalAvances,
          reste: salaire - totalAvances
        };
      });

      // Tendances sur 6 mois
      const tendances = [];
      for (let i = 5; i >= 0; i--) {
        const mois = moment().subtract(i, 'months').format('YYYY-MM');
        const avancesMoisHistorique = avances.filter(a => 
          a.mois_comptable === mois && (a.statut === 'validee' || a.statut === 'deduite')
        );
        const totalAvancesMois = avancesMoisHistorique.reduce((sum, a) => sum + a.montant, 0);
        const totalSalairesMois = chargesSalaires.reduce((sum, c) => sum + c.montant_mensuel, 0);
        
        tendances.push({
          mois: moment(mois, 'YYYY-MM').format('MMM YY'),
          salaires: totalSalairesMois,
          avances: totalAvancesMois,
          charges: chargesFixes.filter(c => c.type !== 'salaire').reduce((sum, c) => sum + c.montant_mensuel, 0)
        });
      }

      setReportData({
        employes,
        tendances,
        totaux: {
          salaires: employes.reduce((sum, e) => sum + e.salaire, 0),
          avances: employes.reduce((sum, e) => sum + e.avances, 0),
          reste: employes.reduce((sum, e) => sum + e.reste, 0),
          heures: employes.reduce((sum, e) => sum + e.heures, 0)
        }
      });

      toast.success('Rapport généré avec succès');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération du rapport');
    } finally {
      setIsGenerating(false);
    }
  };

  const exporterPDF = () => {
    if (!reportData) return;

    const pdf = new jsPDF();
    
    // En-tête
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, 210, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.text('Rapport Financier RH', 105, 15, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Période: ${moment(selectedMonth, 'YYYY-MM').format('MMMM YYYY')}`, 105, 23, { align: 'center' });

    // Résumé
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.text('Résumé', 20, 45);
    
    pdf.setFontSize(10);
    let y = 55;
    pdf.text(`Masse salariale totale: ${formatMontant(reportData.totaux.salaires)} FCFA`, 20, y);
    y += 7;
    pdf.text(`Avances versées: ${formatMontant(reportData.totaux.avances)} FCFA`, 20, y);
    y += 7;
    pdf.text(`Reste à payer: ${formatMontant(reportData.totaux.reste)} FCFA`, 20, y);
    y += 7;
    pdf.text(`Heures totales: ${Math.round(reportData.totaux.heures)} heures`, 20, y);

    // Tableau par employé
    y += 15;
    pdf.setFontSize(14);
    pdf.text('Détail par employé', 20, y);
    
    y += 10;
    pdf.setFontSize(9);
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, y - 5, 170, 8, 'F');
    pdf.text('Employé', 25, y);
    pdf.text('Salaire', 90, y);
    pdf.text('Avances', 120, y);
    pdf.text('Reste', 150, y);

    y += 8;
    reportData.employes
      .filter(e => e.salaire > 0)
      .forEach(employe => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(employe.nom.substring(0, 25), 25, y);
        pdf.text(`${formatMontant(employe.salaire)} F`, 90, y);
        pdf.text(`${formatMontant(employe.avances)} F`, 120, y);
        pdf.text(`${formatMontant(employe.reste)} F`, 150, y);
        y += 7;
      });

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Généré le ${moment().format('DD/MM/YYYY à HH:mm')}`, 105, 285, { align: 'center' });

    pdf.save(`rapport-rh-${selectedMonth}.pdf`);
    toast.success('PDF exporté avec succès');
  };

  const exporterCSV = () => {
    if (!reportData) return;

    const headers = ['Employé', 'Email', 'Rôle', 'Heures', 'Salaire', 'Avances', 'Reste à payer'];
    const rows = reportData.employes
      .filter(e => e.salaire > 0)
      .map(e => [
        e.nom,
        e.email,
        e.role,
        Math.round(e.heures * 10) / 10,
        e.salaire,
        e.avances,
        e.reste
      ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rapport-rh-${selectedMonth}.csv`;
    link.click();
    toast.success('CSV exporté avec succès');
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rapport financier RH</CardTitle>
            <Button
              onClick={genererRapport}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              {isGenerating ? 'Génération...' : 'Générer le rapport'}
            </Button>
          </div>
        </CardHeader>

        {reportData && (
          <CardContent className="space-y-6">
            {/* Résumé */}
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Masse salariale</p>
                <p className="text-2xl font-bold text-blue-900">{formatMontant(reportData.totaux.salaires)} F</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Avances versées</p>
                <p className="text-2xl font-bold text-emerald-900">{formatMontant(reportData.totaux.avances)} F</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Reste à payer</p>
                <p className="text-2xl font-bold text-amber-900">{formatMontant(reportData.totaux.reste)} F</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-slate-600 mb-1">Heures totales</p>
                <p className="text-2xl font-bold text-purple-900">{Math.round(reportData.totaux.heures)}h</p>
              </div>
            </div>

            {/* Graphique des tendances */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Tendances sur 6 mois</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={reportData.tendances}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mois" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${formatMontant(value)} F`} />
                    <Legend />
                    <Line type="monotone" dataKey="salaires" stroke="#3b82f6" name="Salaires" strokeWidth={2} />
                    <Line type="monotone" dataKey="avances" stroke="#10b981" name="Avances" strokeWidth={2} />
                    <Line type="monotone" dataKey="charges" stroke="#f59e0b" name="Autres charges" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Graphique par employé */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Coûts par employé</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.employes.filter(e => e.salaire > 0).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nom" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(value) => `${formatMontant(value)} F`} />
                    <Legend />
                    <Bar dataKey="salaire" fill="#3b82f6" name="Salaire" />
                    <Bar dataKey="avances" fill="#10b981" name="Avances" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Actions d'export */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={exporterCSV}
                className="gap-2"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exporter en CSV
              </Button>
              <Button
                onClick={exporterPDF}
                className="bg-rose-600 hover:bg-rose-700 gap-2"
              >
                <Download className="w-4 h-4" />
                Exporter en PDF
              </Button>
            </div>

            {/* Tableau détaillé */}
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Détail par employé</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 font-medium text-slate-600">Employé</th>
                        <th className="text-left p-3 font-medium text-slate-600">Rôle</th>
                        <th className="text-right p-3 font-medium text-slate-600">Heures</th>
                        <th className="text-right p-3 font-medium text-slate-600">Salaire</th>
                        <th className="text-right p-3 font-medium text-slate-600">Avances</th>
                        <th className="text-right p-3 font-medium text-slate-600">Reste</th>
                        <th className="text-right p-3 font-medium text-slate-600">% Payé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.employes
                        .filter(e => e.salaire > 0)
                        .sort((a, b) => b.salaire - a.salaire)
                        .map(employe => (
                          <tr key={employe.email} className="border-t">
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-slate-900">{employe.nom}</p>
                                <p className="text-xs text-slate-500">{employe.email}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge className="bg-slate-100 text-slate-700">{employe.role}</Badge>
                            </td>
                            <td className="p-3 text-right">{Math.round(employe.heures * 10) / 10}h</td>
                            <td className="p-3 text-right font-medium">{formatMontant(employe.salaire)} F</td>
                            <td className="p-3 text-right text-emerald-600">{formatMontant(employe.avances)} F</td>
                            <td className="p-3 text-right text-amber-600">{formatMontant(employe.reste)} F</td>
                            <td className="p-3 text-right">
                              <Badge className={
                                employe.salaire > 0 && (employe.avances / employe.salaire * 100) >= 100 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }>
                                {employe.salaire > 0 ? Math.round(employe.avances / employe.salaire * 100) : 0}%
                              </Badge>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        )}
      </Card>
    </div>
  );
}