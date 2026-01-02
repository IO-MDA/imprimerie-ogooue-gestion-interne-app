import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar, User, Download, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import jsPDF from 'jspdf';

export default function Pointage() {
  const [pointages, setPointages] = useState([]);
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('aujourd-hui');
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));

  useEffect(() => {
    loadData();
    handlePointageAutomatique();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Vérifier si c'est un client (bloqué)
      const clients = await base44.entities.Client.filter({ user_id: userData.id });
      if (clients.length > 0) {
        toast.error('Accès réservé aux employés');
        window.location.href = '/PortailClient';
        return;
      }
      
      // Charger les pointages selon le rôle
      let pointagesData;
      if (userData.role === 'admin' || userData.role === 'manager') {
        pointagesData = await base44.entities.Pointage.list('-date');
      } else {
        // Opérateur : voir uniquement ses propres pointages
        pointagesData = await base44.entities.Pointage.filter({ employe_id: userData.id }, '-date');
      }
      
      const usersData = await base44.entities.User.list();
      
      setPointages(pointagesData);
      setUsers(usersData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePointageAutomatique = async () => {
    // Vérifie et crée un pointage automatique pour éviter anomalies
    try {
      const userData = await base44.auth.me();
      if (!userData || userData.role === 'admin') return;
      
      const clients = await base44.entities.Client.filter({ user_id: userData.id });
      if (clients.length > 0) return;

      const today = moment().format('YYYY-MM-DD');
      const pointagesData = await base44.entities.Pointage.filter({ employe_id: userData.id });
      
      const pointageToday = pointagesData.find(p => p.date === today);
      
      // Détecter anomalie : pointage en cours depuis plus de 12h
      if (pointageToday && pointageToday.statut === 'en_cours') {
        const heureEntree = moment(pointageToday.heure_entree, 'HH:mm');
        const now = moment();
        const heuresEcoules = now.diff(heureEntree, 'hours');
        
        if (heuresEcoules > 12) {
          await base44.entities.Pointage.update(pointageToday.id, {
            statut: 'anomalie',
            commentaire: 'Sortie non enregistrée - durée excessive détectée'
          });
        }
      }
    } catch (e) {
      console.error('Erreur vérification pointage:', e);
    }
  };

  const handleEntree = async () => {
    try {
      const today = moment().format('YYYY-MM-DD');
      await base44.entities.Pointage.create({
        employe_id: user.id,
        employe_nom: user.full_name,
        employe_email: user.email,
        date: today,
        heure_entree: moment().format('HH:mm'),
        statut: 'en_cours'
      });
      toast.success('Pointage d\'entrée enregistré');
      loadData();
    } catch (e) {
      toast.error('Erreur lors du pointage d\'entrée');
    }
  };

  const handleSortie = async (pointageId) => {
    try {
      const pointage = pointages.find(p => p.id === pointageId);
      const heureEntree = moment(pointage.heure_entree, 'HH:mm');
      const heureSortie = moment();
      const dureeMinutes = heureSortie.diff(heureEntree, 'minutes');

      await base44.entities.Pointage.update(pointageId, {
        heure_sortie: heureSortie.format('HH:mm'),
        duree_minutes: dureeMinutes,
        statut: 'termine'
      });
      toast.success('Pointage de sortie enregistré');
      loadData();
    } catch (e) {
      toast.error('Erreur lors du pointage de sortie');
    }
  };

  const exportPDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/c22c6636f_LOGO-BON-FINAL1.png';
    try {
      pdf.addImage(logoUrl, 'PNG', pageWidth / 2 - 12.5, 8, 25, 25);
    } catch (e) {
      console.log('Logo non chargé');
    }
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RAPPORT DE POINTAGE', pageWidth / 2, 25, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`Période: ${selectedMonth}`, 20, 55);
    
    let y = 70;
    pdf.setFontSize(10);
    
    const pointagesMois = pointages.filter(p => 
      moment(p.date).format('YYYY-MM') === selectedMonth &&
      (user.role === 'admin' || user.role === 'manager' || p.employe_id === user.id)
    );

    pointagesMois.forEach(p => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      
      const duree = p.duree_minutes ? `${Math.floor(p.duree_minutes / 60)}h${p.duree_minutes % 60}min` : '-';
      pdf.text(`${moment(p.date).format('DD/MM')} | ${p.employe_nom}`, 20, y);
      pdf.text(`${p.heure_entree} → ${p.heure_sortie || '-'}`, 100, y);
      pdf.text(duree, 150, y);
      y += 7;
    });
    
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Imprimerie OGOOUE - Moanda, Gabon', pageWidth / 2, 280, { align: 'center' });
    
    pdf.save(`Pointage_${selectedMonth}.pdf`);
    toast.success('Rapport exporté');
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isOperateur = user?.role === 'user';

  const today = moment().format('YYYY-MM-DD');
  const thisWeek = moment().startOf('week');
  const thisMonth = moment().startOf('month');

  // Filtrage selon le rôle (admin/manager voient tout, opérateur voit ses propres)
  const filteredPointages = pointages.filter(p => {
    // Filtre par période
    let matchPeriod = true;
    if (activeTab === 'aujourd-hui') matchPeriod = p.date === today;
    else if (activeTab === 'semaine') matchPeriod = moment(p.date).isSameOrAfter(thisWeek);
    else if (activeTab === 'mois') matchPeriod = moment(p.date).format('YYYY-MM') === selectedMonth;
    
    return matchPeriod;
  });

  const pointageEnCours = pointages.find(p => 
    p.employe_id === user?.id && p.date === today && p.statut === 'en_cours'
  );

  const totalHeures = filteredPointages.reduce((sum, p) => sum + (p.duree_minutes || 0), 0) / 60;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pointage</h1>
          <p className="text-slate-500">Suivi des présences et horaires</p>
        </div>
        {(isAdmin || isManager) && (
          <Button onClick={exportPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
        )}
      </div>

      {/* Bouton de pointage pour employé */}
      {isOperateur && (
        <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardContent className="p-6">
            {pointageEnCours ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Clock className="w-7 h-7 text-white animate-pulse" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">Pointage en cours</p>
                    <p className="text-blue-100">Entrée: {pointageEnCours.heure_entree}</p>
                    <p className="text-xs text-blue-200 mt-1">
                      Depuis {moment(pointageEnCours.heure_entree, 'HH:mm').fromNow()}
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={() => handleSortie(pointageEnCours.id)} 
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Pointer la sortie
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">Prêt à pointer</p>
                    <p className="text-blue-100">Cliquez pour enregistrer votre arrivée</p>
                  </div>
                </div>
                <Button 
                  onClick={handleEntree}
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Pointer l'entrée
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vue admin/manager du pointage en cours */}
      {!isOperateur && pointageEnCours && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Pointage en cours</p>
                  <p className="text-sm text-slate-600">Entrée: {pointageEnCours.heure_entree}</p>
                  <p className="text-xs text-slate-500">{pointageEnCours.employe_nom}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total heures</p>
                <p className="text-xl font-bold text-slate-900">{totalHeures.toFixed(1)}h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pointages</p>
                <p className="text-xl font-bold text-slate-900">{filteredPointages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Période</p>
                <p className="text-xl font-bold text-slate-900">{activeTab}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="aujourd-hui">Aujourd'hui</TabsTrigger>
          <TabsTrigger value="semaine">Cette semaine</TabsTrigger>
          <TabsTrigger value="mois">Ce mois</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {activeTab === 'mois' && (
            <div className="mb-4">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="max-w-xs"
              />
            </div>
          )}

          <div className="grid gap-3">
            {filteredPointages.map(pointage => (
              <Card key={pointage.id} className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{pointage.employe_nom}</p>
                        <p className="text-sm text-slate-500">{moment(pointage.date).format('DD/MM/YYYY')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Entrée</p>
                        <p className="font-medium">{pointage.heure_entree}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Sortie</p>
                        <p className="font-medium">{pointage.heure_sortie || '-'}</p>
                      </div>
                      <div className="text-right min-w-[80px]">
                        <p className="text-sm text-slate-500">Durée</p>
                        <p className="font-medium">
                          {pointage.duree_minutes 
                            ? `${Math.floor(pointage.duree_minutes / 60)}h${pointage.duree_minutes % 60}min`
                            : '-'}
                        </p>
                      </div>
                      <Badge className={pointage.statut === 'termine' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                        {pointage.statut === 'termine' ? 'Terminé' : 'En cours'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredPointages.length === 0 && (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-16 text-center">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucun pointage pour cette période</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}