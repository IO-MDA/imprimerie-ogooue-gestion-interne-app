import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Award,
  Target,
  BarChart3,
  Calendar,
  FileText
} from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Bilans() {
  const [rapports, setRapports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [periode, setPeriode] = useState('semaine');
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [selectedYear, setSelectedYear] = useState(moment().format('YYYY'));
  const [compareYear, setCompareYear] = useState(moment().subtract(1, 'year').format('YYYY'));
  const [showComparison, setShowComparison] = useState(false);
  const [exportPeriod, setExportPeriod] = useState({
    debut: moment().startOf('month').format('YYYY-MM-DD'),
    fin: moment().endOf('month').format('YYYY-MM-DD')
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [data, userData] = await Promise.all([
      base44.entities.RapportJournalier.list('-date', 500),
      base44.auth.me()
    ]);
    setRapports(data);
    setUser(userData);
    setIsLoading(false);
  };

  // Filter rapports based on period
  const getFilteredRapports = () => {
    const now = moment();
    switch (periode) {
      case 'semaine':
        return rapports.filter(r => moment(r.date).isSame(now, 'week'));
      case 'mois':
        return rapports.filter(r => moment(r.date).format('YYYY-MM') === selectedMonth);
      case 'annee':
        return rapports.filter(r => moment(r.date).format('YYYY') === selectedYear);
      default:
        return rapports;
    }
  };

  const filteredRapports = getFilteredRapports();
  const totalRecettes = filteredRapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
  const totalDepenses = filteredRapports.reduce((sum, r) => sum + (r.total_depenses || 0), 0);
  const benefice = totalRecettes - totalDepenses;
  const margeNette = totalRecettes > 0 ? ((benefice / totalRecettes) * 100).toFixed(1) : 0;

  // Service breakdown
  const serviceData = {};
  filteredRapports.forEach(r => {
    r.services_data?.forEach(serviceInfo => {
      if (!serviceData[serviceInfo.service]) {
        serviceData[serviceInfo.service] = { recettes: 0, depenses: 0, count: 0 };
      }
      serviceData[serviceInfo.service].recettes += serviceInfo.recettes || 0;
      serviceData[serviceInfo.service].depenses += serviceInfo.depenses || 0;
      if (serviceInfo.recettes > 0 || serviceInfo.depenses > 0) {
        serviceData[serviceInfo.service].count++;
      }
    });
  });

  const serviceChartData = Object.entries(serviceData)
    .map(([name, data]) => ({
      name: name?.split(' ')[0] || 'N/A',
      fullName: name,
      recettes: data.recettes,
      depenses: data.depenses,
      benefice: data.recettes - data.depenses,
      count: data.count
    }))
    .sort((a, b) => b.recettes - a.recettes);

  const pieData = serviceChartData.map(s => ({
    name: s.name,
    value: s.recettes
  }));

  // Daily trend
  const getDailyTrend = () => {
    const days = periode === 'semaine' ? 7 : periode === 'mois' ? moment(selectedMonth).daysInMonth() : 12;
    const data = [];
    
    if (periode === 'annee') {
      for (let i = 0; i < 12; i++) {
        const month = moment(selectedYear + '-01-01').add(i, 'months');
        const monthRapports = rapports.filter(r => moment(r.date).format('YYYY-MM') === month.format('YYYY-MM'));
        data.push({
          label: month.format('MMM'),
          recettes: monthRapports.reduce((s, r) => s + (r.total_recettes || 0), 0),
          depenses: monthRapports.reduce((s, r) => s + (r.total_depenses || 0), 0)
        });
      }
    } else {
      const startDate = periode === 'semaine' ? moment().startOf('week') : moment(selectedMonth + '-01');
      for (let i = 0; i < days; i++) {
        const date = startDate.clone().add(i, 'days');
        const dayRapports = filteredRapports.filter(r => r.date === date.format('YYYY-MM-DD'));
        data.push({
          label: date.format(periode === 'semaine' ? 'ddd' : 'DD'),
          recettes: dayRapports.reduce((s, r) => s + (r.total_recettes || 0), 0),
          depenses: dayRapports.reduce((s, r) => s + (r.total_depenses || 0), 0)
        });
      }
    }
    return data;
  };

  // Find areas for improvement
  const getRecommendations = () => {
    const recommendations = [];
    
    // Find lowest performing service
    if (serviceChartData.length > 0) {
      const lowestService = serviceChartData[serviceChartData.length - 1];
      if (lowestService.recettes < totalRecettes * 0.1) {
        recommendations.push({
          type: 'warning',
          title: 'Service à faible rendement',
          message: `Le service "${lowestService.fullName}" génère seulement ${((lowestService.recettes / totalRecettes) * 100).toFixed(1)}% des recettes. Envisagez des actions promotionnelles.`
        });
      }
    }

    // Check for high expense ratio
    serviceChartData.forEach(s => {
      if (s.recettes > 0 && (s.depenses / s.recettes) > 0.5) {
        recommendations.push({
          type: 'warning',
          title: 'Ratio dépenses élevé',
          message: `Le service "${s.fullName}" a un ratio dépenses/recettes de ${((s.depenses / s.recettes) * 100).toFixed(0)}%. Analysez les coûts.`
        });
      }
    });

    // Highlight top performer
    if (serviceChartData.length > 0) {
      const topService = serviceChartData[0];
      recommendations.push({
        type: 'success',
        title: 'Meilleur service',
        message: `"${topService.fullName}" est votre service le plus rentable avec ${topService.recettes.toLocaleString()} FCFA de recettes.`
      });
    }

    // Check overall margin
    if (margeNette < 20) {
      recommendations.push({
        type: 'warning',
        title: 'Marge nette faible',
        message: `Votre marge nette est de ${margeNette}%. Objectif recommandé: 25-30% minimum.`
      });
    } else if (margeNette >= 30) {
      recommendations.push({
        type: 'success',
        title: 'Excellente marge',
        message: `Félicitations! Votre marge nette de ${margeNette}% est excellente.`
      });
    }

    return recommendations;
  };

  const recommendations = getRecommendations();
  const dailyTrend = getDailyTrend();

  // Generate months for selector
  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = moment().subtract(i, 'months');
    months.push({ value: m.format('YYYY-MM'), label: m.format('MMMM YYYY') });
  }

  const years = [];
  for (let i = 0; i < 5; i++) {
    const y = moment().subtract(i, 'years').format('YYYY');
    years.push({ value: y, label: y });
  }

  const exportToPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const html2canvas = (await import('html2canvas')).default;

    const exportRapports = rapports.filter(r => 
      r.date >= exportPeriod.debut && r.date <= exportPeriod.fin
    );

    const totalRecettes = exportRapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
    const totalDepenses = exportRapports.reduce((sum, r) => sum + (r.total_depenses || 0), 0);
    const benefice = totalRecettes - totalDepenses;

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Header
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.text('Imprimerie Ogooué', 20, 20);
    pdf.setFontSize(14);
    pdf.text('Bilan Financier', 20, 32);

    // Period
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`Période: ${moment(exportPeriod.debut).format('DD/MM/YYYY')} - ${moment(exportPeriod.fin).format('DD/MM/YYYY')}`, 20, 50);
    pdf.text(`Date d'édition: ${moment().format('DD/MM/YYYY')}`, 20, 57);

    // Summary
    pdf.setFontSize(16);
    pdf.text('Résumé Financier', 20, 70);
    
    pdf.setFontSize(12);
    pdf.setTextColor(16, 185, 129);
    pdf.text(`Total Recettes: ${totalRecettes.toLocaleString()} FCFA`, 20, 82);
    pdf.setTextColor(239, 68, 68);
    pdf.text(`Total Dépenses: ${totalDepenses.toLocaleString()} FCFA`, 20, 92);
    pdf.setTextColor(benefice >= 0 ? 16 : 239, benefice >= 0 ? 185 : 68, benefice >= 0 ? 129 : 68);
    pdf.text(`Bénéfice Net: ${benefice.toLocaleString()} FCFA`, 20, 102);

    // Service breakdown
    const serviceData = {};
    exportRapports.forEach(r => {
      r.services_data?.forEach(serviceInfo => {
        if (!serviceData[serviceInfo.service]) {
          serviceData[serviceInfo.service] = { recettes: 0, depenses: 0 };
        }
        serviceData[serviceInfo.service].recettes += serviceInfo.recettes || 0;
        serviceData[serviceInfo.service].depenses += serviceInfo.depenses || 0;
      });
    });

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.text('Détail par Service', 20, 115);
    
    let yPos = 125;
    pdf.setFontSize(10);
    Object.entries(serviceData).forEach(([service, data]) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(`${service}:`, 20, yPos);
      pdf.text(`${data.recettes.toLocaleString()} FCFA`, 120, yPos);
      yPos += 7;
    });

    // Footer
    const pages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Page ${i} sur ${pages}`, pageWidth - 30, pageHeight - 10);
    }

    pdf.save(`Bilan_${moment(exportPeriod.debut).format('YYYY-MM-DD')}_${moment(exportPeriod.fin).format('YYYY-MM-DD')}.pdf`);
  };

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
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Accès Restreint</h2>
          <p className="text-slate-600">Seuls les administrateurs peuvent accéder aux bilans et analyses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bilans & Analyses</h1>
          <p className="text-slate-500">Analysez les performances et identifiez les améliorations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={periode} onValueChange={setPeriode}>
            <TabsList>
              <TabsTrigger value="semaine">Semaine</TabsTrigger>
              <TabsTrigger value="mois">Mois</TabsTrigger>
              <TabsTrigger value="annee">Année</TabsTrigger>
            </TabsList>
          </Tabs>
          {periode === 'mois' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {periode === 'annee' && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            onClick={() => setShowComparison(!showComparison)}
          >
            Comparer années
          </Button>
        </div>
      </div>

      {/* Export Section */}
      <Card className="border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <Label className="text-sm font-medium mb-2 block">Période d'export PDF</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={exportPeriod.debut}
                  onChange={(e) => setExportPeriod(prev => ({ ...prev, debut: e.target.value }))}
                  className="bg-white"
                />
                <Input
                  type="date"
                  value={exportPeriod.fin}
                  onChange={(e) => setExportPeriod(prev => ({ ...prev, fin: e.target.value }))}
                  className="bg-white"
                />
              </div>
            </div>
            <Button
              onClick={exportToPDF}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mt-6"
            >
              <FileText className="w-4 h-4 mr-2" />
              Exporter en PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Year Comparison */}
      {showComparison && periode === 'annee' && (
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Comparaison annuelle</CardTitle>
              <Select value={compareYear} onValueChange={setCompareYear}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Comparer avec" />
                </SelectTrigger>
                <SelectContent>
                  {years.filter(y => y.value !== selectedYear).map(y => (
                    <SelectItem key={y.value} value={y.value}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const year1Rapports = rapports.filter(r => moment(r.date).format('YYYY') === selectedYear);
              const year2Rapports = rapports.filter(r => moment(r.date).format('YYYY') === compareYear);
              
              const year1Total = year1Rapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
              const year2Total = year2Rapports.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
              const year1Depenses = year1Rapports.reduce((sum, r) => sum + (r.total_depenses || 0), 0);
              const year2Depenses = year2Rapports.reduce((sum, r) => sum + (r.total_depenses || 0), 0);
              
              const diffRecettes = year1Total - year2Total;
              const diffPct = year2Total > 0 ? ((diffRecettes / year2Total) * 100).toFixed(1) : 0;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <p className="text-sm text-blue-600 font-medium">{selectedYear} - Recettes</p>
                        <p className="text-2xl font-bold text-blue-900">{year1Total.toLocaleString()} FCFA</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-slate-200">
                      <CardContent className="p-4">
                        <p className="text-sm text-slate-600 font-medium">{compareYear} - Recettes</p>
                        <p className="text-2xl font-bold text-slate-900">{year2Total.toLocaleString()} FCFA</p>
                      </CardContent>
                    </Card>
                    <Card className={`${diffRecettes >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                      <CardContent className="p-4">
                        <p className="text-sm font-medium">Différence</p>
                        <p className={`text-2xl font-bold ${diffRecettes >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                          {diffRecettes >= 0 ? '+' : ''}{diffPct}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: selectedYear, recettes: year1Total, depenses: year1Depenses },
                        { name: compareYear, recettes: year2Total, depenses: year2Depenses }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value.toLocaleString()} FCFA`, '']} />
                        <Legend />
                        <Bar dataKey="recettes" name="Recettes" fill="#3b82f6" />
                        <Bar dataKey="depenses" name="Dépenses" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Recettes</p>
                <p className="text-2xl font-bold text-slate-900">{totalRecettes.toLocaleString()} FCFA</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Dépenses</p>
                <p className="text-2xl font-bold text-slate-900">{totalDepenses.toLocaleString()} FCFA</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Bénéfice Net</p>
                <p className={`text-2xl font-bold ${benefice >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {benefice.toLocaleString()} FCFA
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${benefice >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                <Target className={`w-6 h-6 ${benefice >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Marge Nette</p>
                <p className={`text-2xl font-bold ${margeNette >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {margeNette}%
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${margeNette >= 20 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                <BarChart3 className={`w-6 h-6 ${margeNette >= 20 ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <CardTitle>Évolution {periode === 'semaine' ? 'hebdomadaire' : periode === 'mois' ? 'mensuelle' : 'annuelle'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${value.toLocaleString()} FCFA`, '']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="recettes" name="Recettes" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                  <Line type="monotone" dataKey="depenses" name="Dépenses" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <CardTitle>Répartition par service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value.toLocaleString()} FCFA`, 'Recettes']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle>Performance par service</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceChartData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: 'none', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value.toLocaleString()} FCFA`, '']}
                />
                <Legend />
                <Bar dataKey="recettes" name="Recettes" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="benefice" name="Bénéfice" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Recommandations & Points d'amélioration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.map((rec, i) => (
            <div 
              key={i} 
              className={`p-4 rounded-xl flex items-start gap-4 ${
                rec.type === 'success' ? 'bg-emerald-50' : 'bg-amber-50'
              }`}
            >
              {rec.type === 'success' ? (
                <Award className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              )}
              <div>
                <p className={`font-medium ${rec.type === 'success' ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {rec.title}
                </p>
                <p className={`text-sm mt-1 ${rec.type === 'success' ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {rec.message}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}