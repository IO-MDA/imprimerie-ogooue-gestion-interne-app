import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';

const COLORS = ['#0078D4', '#00BCF2', '#00B294', '#FFB900', '#E74856'];

export default function RapportVentes() {
  const [factures, setFactures] = useState([]);
  const [devis, setDevis] = useState([]);
  const [produits, setProduits] = useState([]);
  const [periode, setPeriode] = useState('mois');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [facturesData, devisData, produitsData] = await Promise.all([
        base44.entities.Facture.list('-created_date'),
        base44.entities.Devis.list('-created_date'),
        base44.entities.ProduitCatalogue.list()
      ]);
      setFactures(facturesData);
      setDevis(devisData);
      setProduits(produitsData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrer par période
  const getFilteredFactures = () => {
    const now = moment();
    return factures.filter(f => {
      const date = moment(f.date_facture || f.created_date);
      if (periode === 'semaine') return date.isAfter(now.clone().subtract(7, 'days'));
      if (periode === 'mois') return date.isAfter(now.clone().subtract(30, 'days'));
      if (periode === 'trimestre') return date.isAfter(now.clone().subtract(90, 'days'));
      if (periode === 'annee') return date.isAfter(now.clone().subtract(365, 'days'));
      return true;
    });
  };

  const filteredFactures = getFilteredFactures();

  // CA par période
  const ventesParPeriode = () => {
    const data = {};
    filteredFactures.forEach(f => {
      const date = moment(f.date_facture || f.created_date);
      const key = periode === 'semaine' || periode === 'mois' 
        ? date.format('DD/MM')
        : periode === 'trimestre'
        ? `S${date.week()}`
        : date.format('MMM YYYY');
      
      if (!data[key]) data[key] = 0;
      data[key] += f.total || 0;
    });

    return Object.entries(data).map(([date, montant]) => ({
      date,
      montant: Math.round(montant)
    })).slice(-12);
  };

  // Ventes par produit
  const ventesParProduit = () => {
    const productSales = {};
    
    filteredFactures.forEach(facture => {
      if (facture.lignes && Array.isArray(facture.lignes)) {
        facture.lignes.forEach(ligne => {
          const produitNom = ligne.description || 'Autre';
          if (!productSales[produitNom]) {
            productSales[produitNom] = { quantite: 0, montant: 0 };
          }
          productSales[produitNom].quantite += ligne.quantite || 0;
          productSales[produitNom].montant += (ligne.quantite || 0) * (ligne.prix_unitaire || 0);
        });
      }
    });

    return Object.entries(productSales)
      .map(([produit, data]) => ({
        produit,
        quantite: data.quantite,
        montant: Math.round(data.montant)
      }))
      .sort((a, b) => b.montant - a.montant)
      .slice(0, 10);
  };

  // Ventes par catégorie
  const ventesParCategorie = () => {
    const categorySales = {};
    
    filteredFactures.forEach(facture => {
      if (facture.lignes && Array.isArray(facture.lignes)) {
        facture.lignes.forEach(ligne => {
          // Essayer de trouver la catégorie depuis les produits
          const produit = produits.find(p => p.nom === ligne.description);
          const categorie = produit?.categorie || 'Autre';
          
          if (!categorySales[categorie]) categorySales[categorie] = 0;
          categorySales[categorie] += (ligne.quantite || 0) * (ligne.prix_unitaire || 0);
        });
      }
    });

    return Object.entries(categorySales)
      .map(([categorie, montant]) => ({
        name: categorie,
        value: Math.round(montant)
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Stats générales
  const caTotal = filteredFactures.reduce((sum, f) => sum + (f.total || 0), 0);
  const nbFactures = filteredFactures.length;
  const panierMoyen = nbFactures > 0 ? caTotal / nbFactures : 0;
  const nbDevisEnAttente = devis.filter(d => d.statut === 'en_attente').length;

  const exportPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header with logo
    pdf.setFillColor(0, 120, 215);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Add logo
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/c22c6636f_LOGO-BON-FINAL1.png';
    try {
      pdf.addImage(logoUrl, 'PNG', pageWidth / 2 - 12.5, 8, 25, 25);
    } catch (e) {
      console.log('Logo loading error, continuing without logo');
    }
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RAPPORT DES VENTES', pageWidth / 2, 25, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`Période: ${periode}`, 20, 55);
    pdf.text(`Date: ${moment().format('DD/MM/YYYY')}`, 20, 62);
    
    // Stats
    let yPos = 75;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('STATISTIQUES GÉNÉRALES', 20, yPos);
    
    yPos += 10;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Chiffre d'affaires: ${caTotal.toLocaleString()} FCFA`, 20, yPos);
    yPos += 7;
    pdf.text(`Nombre de factures: ${nbFactures}`, 20, yPos);
    yPos += 7;
    pdf.text(`Panier moyen: ${Math.round(panierMoyen).toLocaleString()} FCFA`, 20, yPos);
    yPos += 7;
    pdf.text(`Devis en attente: ${nbDevisEnAttente}`, 20, yPos);
    
    // Top produits
    yPos += 20;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOP 5 PRODUITS', 20, yPos);
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    ventesParProduit().slice(0, 5).forEach((item, index) => {
      pdf.text(`${index + 1}. ${item.produit}`, 25, yPos);
      pdf.text(`${item.montant.toLocaleString()} FCFA`, pageWidth - 60, yPos, { align: 'right' });
      yPos += 7;
    });
    
    // Footer
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Imprimerie Ogooué - Moanda, Gabon', pageWidth / 2, 280, { align: 'center' });
    
    pdf.save(`Rapport_Ventes_${moment().format('YYYY-MM-DD')}.pdf`);
    toast.success('Rapport exporté en PDF');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-slate-400" />
              <Select value={periode} onValueChange={setPeriode}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semaine">7 derniers jours</SelectItem>
                  <SelectItem value="mois">30 derniers jours</SelectItem>
                  <SelectItem value="trimestre">3 derniers mois</SelectItem>
                  <SelectItem value="annee">12 derniers mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={exportPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Chiffre d'affaires</p>
                <p className="text-xl font-bold text-slate-900">{Math.round(caTotal).toLocaleString()}</p>
                <p className="text-xs text-slate-400">FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Nb Factures</p>
                <p className="text-xl font-bold text-slate-900">{nbFactures}</p>
                <p className="text-xs text-slate-400">Période</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Panier moyen</p>
                <p className="text-xl font-bold text-slate-900">{Math.round(panierMoyen).toLocaleString()}</p>
                <p className="text-xs text-slate-400">FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Devis en attente</p>
                <p className="text-xl font-bold text-slate-900">{nbDevisEnAttente}</p>
                <p className="text-xs text-slate-400">À traiter</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CA par période */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Évolution du CA</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ventesParPeriode()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} FCFA`} />
                <Line type="monotone" dataKey="montant" stroke="#0078D4" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Ventes par catégorie */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Répartition par catégorie</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ventesParCategorie()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ventesParCategorie().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value.toLocaleString()} FCFA`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top produits */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg">Top 10 Produits</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={ventesParProduit()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="produit" angle={-45} textAnchor="end" height={120} />
              <YAxis />
              <Tooltip formatter={(value) => `${value.toLocaleString()} FCFA`} />
              <Bar dataKey="montant" fill="#0078D4" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}