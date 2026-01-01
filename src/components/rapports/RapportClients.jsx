import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Users, TrendingUp, AlertCircle, Award } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';

export default function RapportClients() {
  const [clients, setClients] = useState([]);
  const [factures, setFactures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [clientsData, facturesData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.Facture.list('-created_date')
      ]);
      setClients(clientsData);
      setFactures(facturesData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Meilleurs clients par CA
  const meilleursClients = () => {
    const clientSales = {};
    
    factures.forEach(f => {
      const clientNom = f.client_nom || 'Client inconnu';
      if (!clientSales[clientNom]) {
        clientSales[clientNom] = { 
          ca: 0, 
          nbFactures: 0,
          dernierAchat: null 
        };
      }
      clientSales[clientNom].ca += f.total || 0;
      clientSales[clientNom].nbFactures += 1;
      
      const dateFacture = moment(f.date_facture || f.created_date);
      if (!clientSales[clientNom].dernierAchat || dateFacture.isAfter(clientSales[clientNom].dernierAchat)) {
        clientSales[clientNom].dernierAchat = dateFacture;
      }
    });

    return Object.entries(clientSales)
      .map(([nom, data]) => ({
        nom,
        ca: Math.round(data.ca),
        nbFactures: data.nbFactures,
        panierMoyen: Math.round(data.ca / data.nbFactures),
        dernierAchat: data.dernierAchat
      }))
      .sort((a, b) => b.ca - a.ca);
  };

  // Clients inactifs (pas d'achat depuis 90 jours)
  const clientsInactifs = () => {
    const now = moment();
    const seuil = now.clone().subtract(90, 'days');
    
    return meilleursClients().filter(c => 
      c.dernierAchat && c.dernierAchat.isBefore(seuil)
    );
  };

  // Nouveaux clients (premier achat dans les 30 derniers jours)
  const nouveauxClients = () => {
    const now = moment();
    const seuil = now.clone().subtract(30, 'days');
    
    const premierAchat = {};
    factures.forEach(f => {
      const clientNom = f.client_nom || 'Client inconnu';
      const dateFacture = moment(f.date_facture || f.created_date);
      
      if (!premierAchat[clientNom] || dateFacture.isBefore(premierAchat[clientNom])) {
        premierAchat[clientNom] = dateFacture;
      }
    });

    return Object.entries(premierAchat)
      .filter(([nom, date]) => date.isAfter(seuil))
      .map(([nom, date]) => ({ nom, date }));
  };

  // Répartition par type de client
  const repartitionTypeClients = () => {
    const types = {};
    clients.forEach(c => {
      const type = c.type || 'particulier';
      types[type] = (types[type] || 0) + 1;
    });
    
    return Object.entries(types).map(([type, count]) => ({
      type: type === 'particulier' ? 'Particuliers' : 'Entreprises',
      count
    }));
  };

  const topClients = meilleursClients().slice(0, 10);
  const inactifs = clientsInactifs();
  const nouveaux = nouveauxClients();

  const caTotal = factures.reduce((sum, f) => sum + (f.total || 0), 0);
  const nbClients = clients.length;
  const caMoyen = nbClients > 0 ? caTotal / nbClients : 0;

  const exportPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header with logo
    pdf.setFillColor(0, 188, 148);
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
    pdf.text('RAPPORT CLIENTS', pageWidth / 2, 25, { align: 'center' });
    
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
    pdf.text(`Nombre total de clients: ${nbClients}`, 20, yPos);
    yPos += 7;
    pdf.text(`CA moyen par client: ${Math.round(caMoyen).toLocaleString()} FCFA`, 20, yPos);
    yPos += 7;
    pdf.text(`Nouveaux clients (30j): ${nouveaux.length}`, 20, yPos);
    yPos += 7;
    pdf.text(`Clients inactifs (>90j): ${inactifs.length}`, 20, yPos);
    
    // Top clients
    yPos += 20;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOP 10 CLIENTS', 20, yPos);
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    topClients.forEach((client, index) => {
      pdf.text(`${index + 1}. ${client.nom}`, 25, yPos);
      pdf.text(`${client.ca.toLocaleString()} FCFA`, pageWidth - 60, yPos, { align: 'right' });
      yPos += 7;
    });
    
    // Footer
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Imprimerie Ogooué - Moanda, Gabon', pageWidth / 2, 280, { align: 'center' });
    
    pdf.save(`Rapport_Clients_${moment().format('YYYY-MM-DD')}.pdf`);
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
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total clients</p>
                <p className="text-xl font-bold text-slate-900">{nbClients}</p>
                <p className="text-xs text-slate-400">Actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">CA moyen / client</p>
                <p className="text-xl font-bold text-slate-900">{Math.round(caMoyen).toLocaleString()}</p>
                <p className="text-xs text-slate-400">FCFA</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Award className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Nouveaux (30j)</p>
                <p className="text-xl font-bold text-slate-900">{nouveaux.length}</p>
                <p className="text-xs text-slate-400">Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Inactifs (>90j)</p>
                <p className="text-xl font-bold text-orange-600">{inactifs.length}</p>
                <p className="text-xs text-slate-400">Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top clients */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Top 10 Meilleurs Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topClients}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nom" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => `${value.toLocaleString()} FCFA`} />
                <Bar dataKey="ca" fill="#00BCF2" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Détails top clients */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Détails Top Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {topClients.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-500 text-white">#{index + 1}</Badge>
                      <p className="font-medium text-slate-900">{client.nom}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {client.nbFactures} facture(s) • Panier moyen: {client.panierMoyen.toLocaleString()} FCFA
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{client.ca.toLocaleString()}</p>
                    <p className="text-xs text-slate-400">FCFA</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Clients inactifs */}
      {inactifs.length > 0 && (
        <Card className="border-0 shadow-lg bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Clients Inactifs (>90 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {inactifs.map((client, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-slate-900">{client.nom}</p>
                    <p className="text-sm text-slate-500">CA: {client.ca.toLocaleString()} FCFA</p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-orange-500 text-white">Inactif</Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      {client.dernierAchat.fromNow()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nouveaux clients */}
      {nouveaux.length > 0 && (
        <Card className="border-0 shadow-lg bg-emerald-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              Nouveaux Clients (30 derniers jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {nouveaux.map((client, index) => (
                <div key={index} className="p-3 bg-white rounded-lg border border-emerald-200">
                  <p className="font-medium text-slate-900">{client.nom}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {client.date.format('DD/MM/YYYY')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}