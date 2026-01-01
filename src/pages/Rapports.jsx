import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  LineChart, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Download,
  Users,
  Package,
  DollarSign,
  AlertTriangle,
  Calendar,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';

export default function Rapports() {
  const [rapportsJournaliers, setRapportsJournaliers] = useState([]);
  const [produits, setProduits] = useState([]);
  const [clients, setClients] = useState([]);
  const [factures, setFactures] = useState([]);
  const [devis, setDevis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Filters
  const [periode, setPeriode] = useState('mois'); // semaine, mois, trimestre, annee
  const [dateDebut, setDateDebut] = useState(moment().startOf('month').format('YYYY-MM-DD'));
  const [dateFin, setDateFin] = useState(moment().endOf('month').format('YYYY-MM-DD'));

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    updateDates();
  }, [periode]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [rapports, produitsData, clientsData, facturesData, devisData, userData] = await Promise.all([
        base44.entities.RapportJournalier.list('-date'),
        base44.entities.ProduitCatalogue.list(),
        base44.entities.Client.list(),
        base44.entities.Facture.list('-date_facture'),
        base44.entities.Devis.list('-date_devis'),
        base44.auth.me()
      ]);
      setRapportsJournaliers(rapports);
      setProduits(produitsData);
      setClients(clientsData);
      setFactures(facturesData);
      setDevis(devisData);
      setUser(userData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateDates = () => {
    const now = moment();
    switch (periode) {
      case 'semaine':
        setDateDebut(now.clone().startOf('week').format('YYYY-MM-DD'));
        setDateFin(now.clone().endOf('week').format('YYYY-MM-DD'));
        break;
      case 'mois':
        setDateDebut(now.clone().startOf('month').format('YYYY-MM-DD'));
        setDateFin(now.clone().endOf('month').format('YYYY-MM-DD'));
        break;
      case 'trimestre':
        setDateDebut(now.clone().startOf('quarter').format('YYYY-MM-DD'));
        setDateFin(now.clone().endOf('quarter').format('YYYY-MM-DD'));
        break;
      case 'annee':
        setDateDebut(now.clone().startOf('year').format('YYYY-MM-DD'));
        setDateFin(now.clone().endOf('year').format('YYYY-MM-DD'));
        break;
    }
  };

  // === ANALYSES VENTES ===
  const rapportsFiltres = rapportsJournaliers.filter(r => {
    const date = moment(r.date);
    return date.isBetween(dateDebut, dateFin, 'day', '[]');
  });

  const totalRecettes = rapportsFiltres.reduce((sum, r) => sum + (r.total_recettes || 0), 0);
  const totalDepenses = rapportsFiltres.reduce((sum, r) => sum + (r.total_depenses || 0), 0);
  const benefice = totalRecettes - totalDepenses;

  // Ventes par service
  const ventesParService = {};
  rapportsFiltres.forEach(rapport => {
    rapport.services_data?.forEach(service => {
      if (!ventesParService[service.service]) {
        ventesParService[service.service] = { recettes: 0, count: 0 };
      }
      ventesParService[service.service].recettes += service.recettes || 0;
      ventesParService[service.service].count += 1;
    });
  });

  const topServices = Object.entries(ventesParService)
    .sort((a, b) => b[1].recettes - a[1].recettes)
    .slice(0, 5);

  // Factures par période
  const facturesFiltrees = factures.filter(f => {
    const date = moment(f.date_facture);
    return date.isBetween(dateDebut, dateFin, 'day', '[]');
  });

  const montantFactures = facturesFiltrees.reduce((sum, f) => sum + (f.total || 0), 0);
  const facturesPayees = facturesFiltrees.filter(f => f.statut_paiement === 'payee').length;
  const facturesEnAttente = facturesFiltrees.filter(f => f.statut_paiement === 'en_attente').length;

  // === ANALYSES STOCK ===
  const produitsStockBas = produits.filter(p => 
    p.gestion_stock && p.stock_actuel <= p.stock_minimum
  );

  const produitsRupture = produits.filter(p => 
    p.gestion_stock && p.stock_actuel === 0
  );

  const valeurStock = produits.reduce((sum, p) => {
    if (p.gestion_stock) {
      return sum + ((p.stock_actuel || 0) * (p.prix_unitaire || 0));
    }
    return sum;
  }, 0);

  // === ANALYSES CLIENTS ===
  const facturesParClient = {};
  facturesFiltrees.forEach(f => {
    if (!facturesParClient[f.client_nom]) {
      facturesParClient[f.client_nom] = { count: 0, total: 0 };
    }
    facturesParClient[f.client_nom].count += 1;
    facturesParClient[f.client_nom].total += f.total || 0;
  });

  const meilleursClients = Object.entries(facturesParClient)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  const clientsActifs = clients.filter(c => {
    return facturesFiltrees.some(f => f.client_nom === c.nom);
  });

  const clientsInactifs = clients.filter(c => {
    return !facturesFiltrees.some(f => f.client_nom === c.nom);
  });

  // Export PDF
  const exporterRapport = (type) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    pdf.setFillColor(0, 120, 215);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('IMPRIMERIE OGOOUÉ', pageWidth / 2, 20, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(`Rapport ${type}`, pageWidth / 2, 30, { align: 'center' });

    yPos = 50;
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.text(`Période: ${moment(dateDebut).format('DD/MM/YYYY')} - ${moment(dateFin).format('DD/MM/YYYY')}`, 20, yPos);
    yPos += 10;

    if (type === 'Ventes') {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SYNTHÈSE FINANCIÈRE', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total recettes: ${totalRecettes.toLocaleString()} FCFA`, 20, yPos);
      yPos += 7;
      pdf.text(`Total dépenses: ${totalDepenses.toLocaleString()} FCFA`, 20, yPos);
      yPos += 7;
      pdf.text(`Bénéfice: ${benefice.toLocaleString()} FCFA`, 20, yPos);
      yPos += 7;
      pdf.text(`Nombre de factures: ${facturesFiltrees.length}`, 20, yPos);
      yPos += 15;

      pdf.setFont('helvetica', 'bold');
      pdf.text('TOP 5 SERVICES', 20, yPos);
      yPos += 10;
      pdf.setFont('helvetica', 'normal');
      topServices.forEach(([service, data], index) => {
        pdf.text(`${index + 1}. ${service}: ${data.recettes.toLocaleString()} FCFA`, 25, yPos);
        yPos += 7;
      });

    } else if (type === 'Stock') {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ÉTAT DU STOCK', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Valeur totale du stock: ${valeurStock.toLocaleString()} FCFA`, 20, yPos);
      yPos += 7;
      pdf.text(`Produits en rupture: ${produitsRupture.length}`, 20, yPos);
      yPos += 7;
      pdf.text(`Produits stock bas: ${produitsStockBas.length}`, 20, yPos);
      yPos += 15;

      if (produitsStockBas.length > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('ALERTES STOCK BAS', 20, yPos);
        yPos += 10;
        pdf.setFont('helvetica', 'normal');
        produitsStockBas.slice(0, 15).forEach(p => {
          pdf.text(`• ${p.nom}: ${p.stock_actuel} ${p.unite || 'unité'}(s)`, 25, yPos);
          yPos += 7;
          if (yPos > 270) {
            pdf.addPage();
            yPos = 20;
          }
        });
      }

    } else if (type === 'Clients') {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ANALYSE CLIENTS', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total clients: ${clients.length}`, 20, yPos);
      yPos += 7;
      pdf.text(`Clients actifs (période): ${clientsActifs.length}`, 20, yPos);
      yPos += 7;
      pdf.text(`Clients inactifs: ${clientsInactifs.length}`, 20, yPos);
      yPos += 15;

      pdf.setFont('helvetica', 'bold');
      pdf.text('TOP 10 MEILLEURS CLIENTS', 20, yPos);
      yPos += 10;
      pdf.setFont('helvetica', 'normal');
      meilleursClients.forEach(([nom, data], index) => {
        pdf.text(`${index + 1}. ${nom}`, 25, yPos);
        pdf.text(`${data.total.toLocaleString()} FCFA (${data.count} factures)`, 100, yPos);
        yPos += 7;
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
      });
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.text(`Page ${i}/${pageCount}`, pageWidth / 2, 290, { align: 'center' });
    }

    pdf.save(`Rapport_${type}_${moment().format('YYYY-MM-DD')}.pdf`);
    toast.success('Rapport exporté avec succès');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart className="w-7 h-7 text-blue-600" />
            Rapports & Analyses
          </h1>
          <p className="text-slate-500">Vue d'ensemble des performances et analyses détaillées</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Période:</span>
            </div>
            <Select value={periode} onValueChange={setPeriode}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semaine">Cette semaine</SelectItem>
                <SelectItem value="mois">Ce mois</SelectItem>
                <SelectItem value="trimestre">Ce trimestre</SelectItem>
                <SelectItem value="annee">Cette année</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>{moment(dateDebut).format('DD/MM/YYYY')}</span>
              <span>→</span>
              <span>{moment(dateFin).format('DD/MM/YYYY')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="ventes" className="w-full">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="ventes" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Ventes
          </TabsTrigger>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clients
          </TabsTrigger>
        </TabsList>

        {/* VENTES */}
        <TabsContent value="ventes" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => exporterRapport('Ventes')}>
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Recettes</p>
                    <p className="text-2xl font-bold text-green-600">{totalRecettes.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">FCFA</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Dépenses</p>
                    <p className="text-2xl font-bold text-rose-600">{totalDepenses.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">FCFA</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-rose-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Bénéfice</p>
                    <p className={`text-2xl font-bold ${benefice >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {benefice.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">FCFA</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Factures</p>
                    <p className="text-2xl font-bold text-slate-900">{facturesFiltrees.length}</p>
                    <p className="text-xs text-green-600">{facturesPayees} payées</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Services */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Top 5 Services par recettes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topServices.map(([service, data], index) => (
                  <div key={service} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{service}</p>
                        <p className="text-sm text-slate-500">{data.count} jours d'activité</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{data.recettes.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">FCFA</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statut factures */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Statut des factures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700 mb-1">Payées</p>
                  <p className="text-3xl font-bold text-green-600">{facturesPayees}</p>
                </div>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700 mb-1">En attente</p>
                  <p className="text-3xl font-bold text-amber-600">{facturesEnAttente}</p>
                </div>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700 mb-1">Montant total</p>
                  <p className="text-2xl font-bold text-blue-600">{montantFactures.toLocaleString()} F</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* STOCK */}
        <TabsContent value="stock" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => exporterRapport('Stock')}>
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Produits gérés</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {produits.filter(p => p.gestion_stock).length}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Valeur stock</p>
                    <p className="text-2xl font-bold text-blue-600">{valeurStock.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">FCFA</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Stock bas</p>
                    <p className="text-2xl font-bold text-amber-600">{produitsStockBas.length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Rupture</p>
                    <p className="text-2xl font-bold text-rose-600">{produitsRupture.length}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-rose-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alertes Stock Bas */}
          {produitsStockBas.length > 0 && (
            <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900">
                  <AlertTriangle className="w-5 h-5" />
                  Produits en stock bas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {produitsStockBas.map(produit => (
                    <div key={produit.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{produit.nom}</p>
                        <p className="text-sm text-slate-500">{produit.categorie}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-amber-600 text-white">
                          {produit.stock_actuel} {produit.unite || 'unité'}(s)
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">Min: {produit.stock_minimum}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Produits en rupture */}
          {produitsRupture.length > 0 && (
            <Card className="border-0 shadow-lg border-l-4 border-l-rose-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rose-900">
                  <AlertTriangle className="w-5 h-5" />
                  Produits en rupture de stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {produitsRupture.map(produit => (
                    <div key={produit.id} className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{produit.nom}</p>
                        <p className="text-sm text-slate-500">{produit.categorie}</p>
                      </div>
                      <Badge className="bg-rose-600 text-white">Rupture</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CLIENTS */}
        <TabsContent value="clients" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => exporterRapport('Clients')}>
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Total clients</p>
                    <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Clients actifs</p>
                    <p className="text-2xl font-bold text-green-600">{clientsActifs.length}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Clients inactifs</p>
                    <p className="text-2xl font-bold text-slate-500">{clientsInactifs.length}</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Revenus moyens</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {clientsActifs.length > 0 ? Math.round(montantFactures / clientsActifs.length).toLocaleString() : 0}
                    </p>
                    <p className="text-xs text-slate-400">FCFA / client</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Clients */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Top 10 Meilleurs Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {meilleursClients.map(([nom, data], index) => (
                  <div key={nom} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{nom}</p>
                        <p className="text-sm text-slate-500">{data.count} facture{data.count > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">{data.total.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">FCFA</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Clients inactifs */}
          {clientsInactifs.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Clients inactifs (aucune facture sur la période)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {clientsInactifs.slice(0, 12).map(client => (
                    <div key={client.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <p className="font-medium text-slate-900">{client.nom}</p>
                      <p className="text-sm text-slate-500">{client.email || client.telephone}</p>
                    </div>
                  ))}
                </div>
                {clientsInactifs.length > 12 && (
                  <p className="text-sm text-slate-500 mt-3 text-center">
                    et {clientsInactifs.length - 12} autre(s) client(s) inactif(s)
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}