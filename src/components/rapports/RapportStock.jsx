import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, AlertTriangle, Package, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';

export default function RapportStock() {
  const [produits, setProduits] = useState([]);
  const [factures, setFactures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [produitsData, facturesData] = await Promise.all([
        base44.entities.ProduitCatalogue.list(),
        base44.entities.Facture.list('-created_date')
      ]);
      setProduits(produitsData);
      setFactures(facturesData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Produits en rupture ou stock bas
  const produitsRupture = produits.filter(p => 
    p.gestion_stock && p.stock_actuel <= 0
  );

  const produitsStockBas = produits.filter(p => 
    p.gestion_stock && p.stock_actuel > 0 && p.stock_actuel <= p.stock_minimum
  );

  // Rotation des stocks (calcul simplifié basé sur les ventes des 30 derniers jours)
  const rotationStock = () => {
    const last30Days = moment().subtract(30, 'days');
    const recentFactures = factures.filter(f => 
      moment(f.created_date).isAfter(last30Days)
    );

    const productSales = {};
    recentFactures.forEach(facture => {
      if (facture.lignes && Array.isArray(facture.lignes)) {
        facture.lignes.forEach(ligne => {
          const produitNom = ligne.description;
          if (!productSales[produitNom]) {
            productSales[produitNom] = 0;
          }
          productSales[produitNom] += ligne.quantite || 0;
        });
      }
    });

    return produits
      .filter(p => p.gestion_stock)
      .map(p => {
        const ventesMois = productSales[p.nom] || 0;
        const stockActuel = p.stock_actuel || 0;
        const rotationJours = ventesMois > 0 && stockActuel > 0 
          ? Math.round((stockActuel / ventesMois) * 30) 
          : 0;
        
        return {
          produit: p.nom,
          stock: stockActuel,
          ventesMois,
          rotationJours,
          categorie: p.categorie
        };
      })
      .filter(p => p.ventesMois > 0)
      .sort((a, b) => a.rotationJours - b.rotationJours);
  };

  // Valeur du stock
  const valeurStock = produits.reduce((sum, p) => {
    if (p.gestion_stock) {
      return sum + ((p.stock_actuel || 0) * (p.prix_unitaire || 0));
    }
    return sum;
  }, 0);

  const nbProduitsStock = produits.filter(p => p.gestion_stock).length;

  // Stock par catégorie
  const stockParCategorie = () => {
    const categoryStock = {};
    
    produits.forEach(p => {
      if (p.gestion_stock) {
        const cat = p.categorie || 'Autre';
        if (!categoryStock[cat]) {
          categoryStock[cat] = { quantite: 0, valeur: 0 };
        }
        categoryStock[cat].quantite += p.stock_actuel || 0;
        categoryStock[cat].valeur += (p.stock_actuel || 0) * (p.prix_unitaire || 0);
      }
    });

    return Object.entries(categoryStock)
      .map(([categorie, data]) => ({
        categorie,
        quantite: data.quantite,
        valeur: Math.round(data.valeur)
      }))
      .sort((a, b) => b.valeur - a.valeur);
  };

  const exportPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header with logo
    pdf.setFillColor(255, 185, 0);
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
    pdf.text('RAPPORT DE STOCK', pageWidth / 2, 25, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`Date: ${moment().format('DD/MM/YYYY')}`, 20, 55);
    
    // Stats
    let yPos = 70;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('STATISTIQUES GÉNÉRALES', 20, yPos);
    
    yPos += 10;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Valeur totale du stock: ${Math.round(valeurStock).toLocaleString()} FCFA`, 20, yPos);
    yPos += 7;
    pdf.text(`Nombre de produits suivis: ${nbProduitsStock}`, 20, yPos);
    yPos += 7;
    pdf.text(`Produits en rupture: ${produitsRupture.length}`, 20, yPos);
    yPos += 7;
    pdf.text(`Produits en stock bas: ${produitsStockBas.length}`, 20, yPos);
    
    // Alertes
    if (produitsRupture.length > 0 || produitsStockBas.length > 0) {
      yPos += 20;
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(231, 72, 86);
      pdf.text('⚠ ALERTES STOCK', 20, yPos);
      
      yPos += 10;
      pdf.setFontSize(10);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'normal');
      
      [...produitsRupture, ...produitsStockBas].slice(0, 10).forEach((p, index) => {
        const statut = p.stock_actuel <= 0 ? 'RUPTURE' : 'BAS';
        pdf.text(`${index + 1}. ${p.nom} - ${statut} (${p.stock_actuel || 0})`, 25, yPos);
        yPos += 7;
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
      });
    }
    
    // Footer
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    const lastY = pdf.internal.pageSize.getHeight() - 10;
    pdf.text('Imprimerie Ogooué - Moanda, Gabon', pageWidth / 2, lastY, { align: 'center' });
    
    pdf.save(`Rapport_Stock_${moment().format('YYYY-MM-DD')}.pdf`);
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
      {/* Export */}
      <div className="flex justify-end">
        <Button onClick={exportPDF} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exporter PDF
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Valeur stock</p>
                <p className="text-xl font-bold text-slate-900">{Math.round(valeurStock).toLocaleString()}</p>
                <p className="text-xs text-slate-400">FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Produits suivis</p>
                <p className="text-xl font-bold text-slate-900">{nbProduitsStock}</p>
                <p className="text-xs text-slate-400">En gestion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Rupture</p>
                <p className="text-xl font-bold text-rose-600">{produitsRupture.length}</p>
                <p className="text-xs text-slate-400">Produits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Stock bas</p>
                <p className="text-xl font-bold text-orange-600">{produitsStockBas.length}</p>
                <p className="text-xs text-slate-400">Produits</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      {(produitsRupture.length > 0 || produitsStockBas.length > 0) && (
        <Card className="border-0 shadow-lg bg-rose-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Alertes Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {produitsRupture.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-rose-200">
                  <div>
                    <p className="font-medium text-slate-900">{p.nom}</p>
                    <p className="text-sm text-slate-500">{p.categorie}</p>
                  </div>
                  <Badge className="bg-rose-600 text-white">RUPTURE</Badge>
                </div>
              ))}
              {produitsStockBas.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-slate-900">{p.nom}</p>
                    <p className="text-sm text-slate-500">{p.categorie}</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-orange-500 text-white">STOCK BAS</Badge>
                    <p className="text-xs text-slate-500 mt-1">{p.stock_actuel} / {p.stock_minimum}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock par catégorie */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Stock par catégorie (valeur)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stockParCategorie()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categorie" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} FCFA`} />
                <Bar dataKey="valeur" fill="#FFB900" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rotation des stocks */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Rotation stock (jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {rotationStock().slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.produit}</p>
                    <p className="text-xs text-slate-500">Ventes: {item.ventesMois}/mois | Stock: {item.stock}</p>
                  </div>
                  <Badge className={
                    item.rotationJours <= 7 ? 'bg-green-100 text-green-700' :
                    item.rotationJours <= 30 ? 'bg-amber-100 text-amber-700' :
                    'bg-rose-100 text-rose-700'
                  }>
                    {item.rotationJours}j
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}