import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar, User, Download, CheckCircle, XCircle, Plus, Edit, Trash2, AlertTriangle, TrendingUp, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPointage, setEditingPointage] = useState(null);
  const [formData, setFormData] = useState({
    employe_id: '',
    date: moment().format('YYYY-MM-DD'),
    heure_entree: '',
    heure_sortie: '',
    commentaire: ''
  });
  const [filterEmployee, setFilterEmployee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    debut: moment().startOf('month').format('YYYY-MM-DD'),
    fin: moment().endOf('month').format('YYYY-MM-DD')
  });
  const [lastPointageInfo, setLastPointageInfo] = useState(null);

  useEffect(() => {
    loadData();
    handlePointageAutomatique();
    checkAnomaliesAndNotify();
  }, []);

  useEffect(() => {
    // Vérifier les anomalies toutes les 30 minutes
    const interval = setInterval(() => {
      checkAnomaliesAndNotify();
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [pointages]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      // Ne pas bloquer les admins/managers même s'ils ont un profil client de test
      const clients = await base44.entities.Client.filter({ user_id: userData.id });
      const isRealClient = userData.role === 'user' && clients.length > 0;
      
      if (isRealClient) {
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
      const isRealClient = userData.role === 'user' && clients.length > 0;
      if (isRealClient) return;

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
      const heureActuelle = moment().format('HH:mm');
      
      // Vérifier si pointage existe déjà pour aujourd'hui
      const pointageExistant = pointages.find(p => 
        p.employe_id === user.id && p.date === today
      );
      
      if (pointageExistant) {
        toast.error('Vous avez déjà pointé votre entrée aujourd\'hui');
        return;
      }
      
      await base44.entities.Pointage.create({
        employe_id: user.id,
        employe_nom: user.full_name || user.email,
        employe_email: user.email,
        date: today,
        heure_entree: heureActuelle,
        statut: 'en_cours',
        source: 'manuel'
      });
      
      setLastPointageInfo({ type: 'entree', heure: heureActuelle });
      toast.success(`✅ Entrée enregistrée à ${heureActuelle}`);
      await loadData();
    } catch (e) {
      console.error('Erreur pointage entrée:', e);
      toast.error('Erreur lors du pointage d\'entrée');
    }
  };

  const handleSortie = async (pointageId) => {
    try {
      const pointage = pointages.find(p => p.id === pointageId);
      const heureEntree = moment(pointage.heure_entree, 'HH:mm');
      const heureSortie = moment();
      const heureSortieStr = heureSortie.format('HH:mm');
      const dureeMinutes = heureSortie.diff(heureEntree, 'minutes');

      await base44.entities.Pointage.update(pointageId, {
        heure_sortie: heureSortieStr,
        duree_minutes: dureeMinutes,
        statut: 'termine'
      });
      
      const dureeHeures = Math.floor(dureeMinutes / 60);
      const dureeMin = dureeMinutes % 60;
      
      setLastPointageInfo({ type: 'sortie', heure: heureSortieStr, duree: `${dureeHeures}h${dureeMin}min` });
      toast.success(`✅ Sortie enregistrée à ${heureSortieStr} (Durée: ${dureeHeures}h${dureeMin}min)`);
      loadData();
    } catch (e) {
      console.error('Erreur sortie:', e);
      toast.error('Erreur lors du pointage de sortie');
    }
  };

  const handleAddPointage = async () => {
    if (!formData.employe_id || !formData.date || !formData.heure_entree) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const selectedUser = users.find(u => u.id === formData.employe_id);
      const heureEntree = moment(formData.heure_entree, 'HH:mm');
      const heureSortie = formData.heure_sortie ? moment(formData.heure_sortie, 'HH:mm') : null;
      
      let dureeMinutes = null;
      let statut = 'en_cours';
      
      if (heureSortie) {
        dureeMinutes = heureSortie.diff(heureEntree, 'minutes');
        statut = 'termine';
      }

      await base44.entities.Pointage.create({
        employe_id: formData.employe_id,
        employe_nom: selectedUser.full_name || selectedUser.email,
        employe_email: selectedUser.email,
        date: formData.date,
        heure_entree: formData.heure_entree,
        heure_sortie: formData.heure_sortie || null,
        duree_minutes: dureeMinutes,
        statut: statut,
        commentaire: formData.commentaire,
        source: 'manuel'
      });

      toast.success('Pointage ajouté avec succès');
      setShowAddDialog(false);
      setFormData({
        employe_id: '',
        date: moment().format('YYYY-MM-DD'),
        heure_entree: '',
        heure_sortie: '',
        commentaire: ''
      });
      loadData();
    } catch (e) {
      console.error('Erreur ajout pointage:', e);
      toast.error('Erreur lors de l\'ajout du pointage');
    }
  };

  const handleEditPointage = async () => {
    if (!formData.heure_entree) {
      toast.error('L\'heure d\'entrée est obligatoire');
      return;
    }

    try {
      const heureEntree = moment(formData.heure_entree, 'HH:mm');
      const heureSortie = formData.heure_sortie ? moment(formData.heure_sortie, 'HH:mm') : null;
      
      let dureeMinutes = null;
      let statut = editingPointage.statut;
      
      if (heureSortie) {
        dureeMinutes = heureSortie.diff(heureEntree, 'minutes');
        statut = 'termine';
      }

      await base44.entities.Pointage.update(editingPointage.id, {
        heure_entree: formData.heure_entree,
        heure_sortie: formData.heure_sortie || null,
        duree_minutes: dureeMinutes,
        statut: statut,
        commentaire: formData.commentaire
      });

      toast.success('Pointage modifié avec succès');
      setShowEditDialog(false);
      setEditingPointage(null);
      loadData();
    } catch (e) {
      console.error('Erreur modification pointage:', e);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleDeletePointage = async (pointageId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce pointage ?')) return;

    try {
      await base44.entities.Pointage.delete(pointageId);
      toast.success('Pointage supprimé');
      loadData();
    } catch (e) {
      console.error('Erreur suppression pointage:', e);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditDialog = (pointage) => {
    setEditingPointage(pointage);
    setFormData({
      employe_id: pointage.employe_id,
      date: pointage.date,
      heure_entree: pointage.heure_entree,
      heure_sortie: pointage.heure_sortie || '',
      commentaire: pointage.commentaire || ''
    });
    setShowEditDialog(true);
  };

  const checkAnomaliesAndNotify = async () => {
    try {
      const userData = await base44.auth.me();
      if (!userData || (userData.role !== 'admin' && userData.role !== 'manager')) return;

      const today = moment().format('YYYY-MM-DD');
      const pointagesEnCours = pointages.filter(p => 
        p.statut === 'en_cours' && p.date === today
      );

      for (const pointage of pointagesEnCours) {
        const heureEntree = moment(pointage.heure_entree, 'HH:mm');
        const now = moment();
        const heuresEcoules = now.diff(heureEntree, 'hours');

        if (heuresEcoules > 10) {
          // Créer une notification pour les managers
          const managers = users.filter(u => u.role === 'manager' || u.role === 'admin');
          
          for (const manager of managers) {
            await base44.entities.Notification.create({
              destinataire_id: manager.id,
              destinataire_nom: manager.full_name || manager.email,
              destinataire_email: manager.email,
              type: 'systeme',
              titre: '⚠️ Anomalie pointage détectée',
              message: `Le pointage de ${pointage.employe_nom} est en cours depuis ${heuresEcoules}h (entrée: ${pointage.heure_entree})`,
              reference_id: pointage.id,
              reference_type: 'Pointage',
              priorite: 'haute'
            });
          }

          // Marquer comme anomalie
          await base44.entities.Pointage.update(pointage.id, {
            statut: 'anomalie',
            commentaire: (pointage.commentaire || '') + ` [AUTO] Durée excessive détectée: ${heuresEcoules}h`
          });
        }
      }
    } catch (e) {
      console.error('Erreur vérification anomalies:', e);
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

  // Filtrage selon le rôle et les filtres actifs
  const filteredPointages = pointages.filter(p => {
    // Filtre par période
    let matchPeriod = true;
    if (activeTab === 'aujourd-hui') matchPeriod = p.date === today;
    else if (activeTab === 'semaine') matchPeriod = moment(p.date).isSameOrAfter(thisWeek);
    else if (activeTab === 'mois') matchPeriod = moment(p.date).format('YYYY-MM') === selectedMonth;
    else if (activeTab === 'rapports') {
      const datePointage = moment(p.date);
      matchPeriod = datePointage.isBetween(dateRange.debut, dateRange.fin, 'day', '[]');
    }
    
    // Filtre par employé
    if (filterEmployee !== 'all' && p.employe_id !== filterEmployee) return false;
    
    // Filtre par statut
    if (filterStatus !== 'all' && p.statut !== filterStatus) return false;
    
    return matchPeriod;
  });

  // Calculs pour rapports
  const calculateStats = () => {
    const stats = {
      totalHeures: 0,
      retards: 0,
      heuresSupp: 0,
      anomalies: 0,
      moyenneJournaliere: 0
    };

    const HEURE_DEBUT_NORMALE = '08:00';
    const DUREE_NORMALE_MINUTES = 8 * 60;

    filteredPointages.forEach(p => {
      if (p.duree_minutes) {
        stats.totalHeures += p.duree_minutes / 60;
        
        // Heures supplémentaires (plus de 8h)
        if (p.duree_minutes > DUREE_NORMALE_MINUTES) {
          stats.heuresSupp += (p.duree_minutes - DUREE_NORMALE_MINUTES) / 60;
        }
      }

      // Retards (arrivée après 8h00)
      if (p.heure_entree > HEURE_DEBUT_NORMALE) {
        stats.retards++;
      }

      // Anomalies
      if (p.statut === 'anomalie') {
        stats.anomalies++;
      }
    });

    if (filteredPointages.length > 0) {
      stats.moyenneJournaliere = stats.totalHeures / filteredPointages.length;
    }

    return stats;
  };

  const stats = calculateStats();

  const pointageEnCours = pointages.find(p => 
    p.employe_id === user?.id && p.date === today && p.statut === 'en_cours'
  );

  const totalHeures = stats.totalHeures;

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
        <div className="flex gap-2">
          {isAdmin && (
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          )}
          {(isAdmin || isManager) && (
            <Button onClick={exportPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exporter PDF
            </Button>
          )}
        </div>
      </div>

      {/* Bouton de pointage pour employé */}
      {isOperateur && (
        <div className="space-y-4">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Clock className={`w-7 h-7 text-white ${pointageEnCours ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      {pointageEnCours ? 'Pointage en cours' : 'Prêt à pointer'}
                    </p>
                    <p className="text-blue-100">
                      {pointageEnCours 
                        ? `Cliquez pour enregistrer votre départ`
                        : 'Cliquez pour enregistrer votre arrivée'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Button 
                    onClick={handleEntree}
                    size="lg"
                    disabled={!!pointageEnCours}
                    className={`flex-1 sm:flex-none ${
                      pointageEnCours 
                        ? 'bg-white/40 text-white cursor-not-allowed' 
                        : 'bg-white text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Pointer l'entrée
                  </Button>
                  <Button 
                    onClick={() => handleSortie(pointageEnCours.id)}
                    size="lg"
                    disabled={!pointageEnCours}
                    className={`flex-1 sm:flex-none ${
                      !pointageEnCours 
                        ? 'bg-white/40 text-white cursor-not-allowed' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    <XCircle className="w-5 h-5 mr-2" />
                    Pointer la sortie
                  </Button>
                </div>
              </div>

              {/* Affichage dernier pointage */}
              {lastPointageInfo && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-sm text-blue-100 font-medium">
                    {lastPointageInfo.type === 'entree' 
                      ? `✅ Dernière entrée: ${lastPointageInfo.heure}`
                      : `✅ Dernière sortie: ${lastPointageInfo.heure} ${lastPointageInfo.duree ? `(${lastPointageInfo.duree})` : ''}`
                    }
                  </p>
                </div>
              )}

              {pointageEnCours && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-100">
                      📍 Entrée enregistrée à <span className="font-bold text-white">{pointageEnCours.heure_entree}</span>
                    </p>
                    <p className="text-xs text-blue-200">
                      {moment(pointageEnCours.heure_entree, 'HH:mm').fromNow()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historique du jour */}
          {!pointageEnCours && pointages.filter(p => p.employe_id === user?.id && p.date === today && p.statut === 'termine').length > 0 && (
            <Card className="border-0 shadow-lg bg-gradient-to-r from-emerald-50 to-green-50">
              <CardContent className="p-4">
                {pointages.filter(p => p.employe_id === user?.id && p.date === today && p.statut === 'termine').map(p => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Pointage du jour terminé</p>
                      <p className="text-xs text-slate-600">
                        {p.heure_entree} → {p.heure_sortie} 
                        <span className="ml-2 font-medium text-emerald-600">
                          ({Math.floor(p.duree_minutes / 60)}h{p.duree_minutes % 60}min)
                        </span>
                      </p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
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
          {(isAdmin || isManager) && (
            <TabsTrigger value="rapports">Rapports détaillés</TabsTrigger>
          )}
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

          {activeTab === 'rapports' && (
            <div className="space-y-6 mb-6">
              {/* Filtres avancés */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-900">Filtres</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Employé</Label>
                      <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les employés</SelectItem>
                          {users.filter(u => u.role !== 'admin' || u.id === user?.id).map(u => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.full_name || u.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Statut</Label>
                      <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="termine">Terminé</SelectItem>
                          <SelectItem value="en_cours">En cours</SelectItem>
                          <SelectItem value="anomalie">Anomalie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Date début</Label>
                      <Input
                        type="date"
                        value={dateRange.debut}
                        onChange={(e) => setDateRange({...dateRange, debut: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Date fin</Label>
                      <Input
                        type="date"
                        value={dateRange.fin}
                        onChange={(e) => setDateRange({...dateRange, fin: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistiques avancées */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total heures</p>
                        <p className="text-xl font-bold text-slate-900">{stats.totalHeures.toFixed(1)}h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Retards</p>
                        <p className="text-xl font-bold text-amber-600">{stats.retards}</p>
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
                        <p className="text-xs text-slate-500">Heures supp.</p>
                        <p className="text-xl font-bold text-emerald-600">{stats.heuresSupp.toFixed(1)}h</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Anomalies</p>
                        <p className="text-xl font-bold text-red-600">{stats.anomalies}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {stats.moyenneJournaliere > 0 && (
                <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-slate-600">
                      Moyenne journalière: <span className="font-bold text-blue-600">{stats.moyenneJournaliere.toFixed(1)}h</span>
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="grid gap-3">
            {filteredPointages.map(pointage => {
              const isLate = pointage.heure_entree > '08:00';
              const isOvertime = pointage.duree_minutes > 8 * 60;

              return (
                <Card key={pointage.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          pointage.statut === 'anomalie' ? 'bg-red-100' : 'bg-slate-100'
                        }`}>
                          {pointage.statut === 'anomalie' ? (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          ) : (
                            <User className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{pointage.employe_nom}</p>
                          <p className="text-sm text-slate-500">{moment(pointage.date).format('DD/MM/YYYY')}</p>
                          {pointage.commentaire && (
                            <p className="text-xs text-slate-400 mt-1 max-w-xs truncate">
                              💬 {pointage.commentaire}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Entrée</p>
                          <p className={`font-medium ${isLate ? 'text-amber-600' : ''}`}>
                            {pointage.heure_entree}
                            {isLate && <span className="text-xs ml-1">⚠️</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Sortie</p>
                          <p className="font-medium">{pointage.heure_sortie || '-'}</p>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-sm text-slate-500">Durée</p>
                          <p className={`font-medium ${isOvertime ? 'text-emerald-600' : ''}`}>
                            {pointage.duree_minutes 
                              ? `${Math.floor(pointage.duree_minutes / 60)}h${pointage.duree_minutes % 60}min`
                              : '-'}
                            {isOvertime && <span className="text-xs ml-1">📈</span>}
                          </p>
                        </div>
                        <Badge className={
                          pointage.statut === 'termine' ? 'bg-emerald-100 text-emerald-700' : 
                          pointage.statut === 'anomalie' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }>
                          {pointage.statut === 'termine' ? 'Terminé' : 
                           pointage.statut === 'anomalie' ? 'Anomalie' : 'En cours'}
                        </Badge>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(pointage)}
                              className="h-8 w-8"
                            >
                              <Edit className="w-4 h-4 text-slate-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePointage(pointage.id)}
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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

      {/* Dialog Ajouter Pointage */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un pointage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employé *</Label>
              <Select value={formData.employe_id} onValueChange={(v) => setFormData({...formData, employe_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un employé" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role !== 'admin' || u.id === user?.id).map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <Label>Heure d'entrée *</Label>
              <Input
                type="time"
                value={formData.heure_entree}
                onChange={(e) => setFormData({...formData, heure_entree: e.target.value})}
              />
            </div>
            <div>
              <Label>Heure de sortie</Label>
              <Input
                type="time"
                value={formData.heure_sortie}
                onChange={(e) => setFormData({...formData, heure_sortie: e.target.value})}
              />
            </div>
            <div>
              <Label>Commentaire</Label>
              <Input
                value={formData.commentaire}
                onChange={(e) => setFormData({...formData, commentaire: e.target.value})}
                placeholder="Note optionnelle"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddPointage} className="bg-blue-600">
                Ajouter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Modifier Pointage */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le pointage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Employé:</span> {editingPointage?.employe_nom}
              </p>
              <p className="text-sm text-slate-600">
                <span className="font-medium">Date:</span> {moment(formData.date).format('DD/MM/YYYY')}
              </p>
            </div>
            <div>
              <Label>Heure d'entrée *</Label>
              <Input
                type="time"
                value={formData.heure_entree}
                onChange={(e) => setFormData({...formData, heure_entree: e.target.value})}
              />
            </div>
            <div>
              <Label>Heure de sortie</Label>
              <Input
                type="time"
                value={formData.heure_sortie}
                onChange={(e) => setFormData({...formData, heure_sortie: e.target.value})}
              />
            </div>
            <div>
              <Label>Commentaire</Label>
              <Input
                value={formData.commentaire}
                onChange={(e) => setFormData({...formData, commentaire: e.target.value})}
                placeholder="Note optionnelle"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleEditPointage} className="bg-blue-600">
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}