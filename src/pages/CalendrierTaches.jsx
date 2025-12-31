import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

export default function CalendrierTaches() {
  const [taches, setTaches] = useState([]);
  const [projets, setProjets] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(moment());
  const [selectedTache, setSelectedTache] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [tachesData, projetsData, userData] = await Promise.all([
      base44.entities.Tache.list(),
      base44.entities.Projet.list(),
      base44.auth.me()
    ]);
    setTaches(tachesData);
    setProjets(projetsData);
    setUser(userData);
    setIsLoading(false);
  };

  const getDaysInMonth = () => {
    const startOfMonth = currentDate.clone().startOf('month');
    const endOfMonth = currentDate.clone().endOf('month');
    const startDate = startOfMonth.clone().startOf('week');
    const endDate = endOfMonth.clone().endOf('week');

    const days = [];
    let day = startDate.clone();

    while (day.isBefore(endDate, 'day')) {
      days.push(day.clone());
      day.add(1, 'day');
    }

    return days;
  };

  const getTachesForDay = (date) => {
    return taches.filter(t => 
      moment(t.date_echeance).isSame(date, 'day') ||
      (moment(t.date_debut).isSameOrBefore(date, 'day') && 
       moment(t.date_echeance).isSameOrAfter(date, 'day'))
    );
  };

  const getUrgenceColor = (dateEcheance, statut) => {
    if (statut === 'terminee' || statut === 'validee') return 'bg-emerald-500';
    
    const today = moment();
    const echeance = moment(dateEcheance);
    const diffDays = echeance.diff(today, 'days');

    if (diffDays < 0) return 'bg-rose-500';
    if (diffDays === 0) return 'bg-orange-500';
    if (diffDays <= 2) return 'bg-amber-500';
    if (diffDays <= 7) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getPriorityIcon = (priorite) => {
    const icons = {
      urgente: '🔴',
      haute: '🟠',
      normale: '🟡',
      basse: '🟢'
    };
    return icons[priorite] || '⚪';
  };

  const days = getDaysInMonth();
  const isCurrentMonth = currentDate.isSame(moment(), 'month');

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Calendrier des tâches</h1>
        <p className="text-slate-500">Vue d'ensemble de toutes les tâches planifiées</p>
      </div>

      {/* Legend */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-slate-700">Code couleur:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-sm text-slate-600">En retard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-sm text-slate-600">Aujourd'hui</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className="text-sm text-slate-600">Dans 2 jours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-sm text-slate-600">Cette semaine</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-600">À venir</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-slate-600">Terminée</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">
              {currentDate.format('MMMM YYYY')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(currentDate.clone().subtract(1, 'month'))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {!isCurrentMonth && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(moment())}
                >
                  Aujourd'hui
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentDate(currentDate.clone().add(1, 'month'))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-b">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, i) => (
              <div key={i} className="p-3 text-center text-sm font-medium text-slate-600 border-r last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day, index) => {
              const dayTaches = getTachesForDay(day);
              const isToday = day.isSame(moment(), 'day');
              const isCurrentMonthDay = day.isSame(currentDate, 'month');

              return (
                <div
                  key={index}
                  className={`min-h-32 p-2 border-r border-b last:border-r-0 ${
                    !isCurrentMonthDay ? 'bg-slate-50' : 'bg-white'
                  } ${isToday ? 'bg-blue-50' : ''}`}
                >
                  <div className={`text-sm font-medium mb-2 ${
                    isToday ? 'text-blue-600' : isCurrentMonthDay ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {day.format('D')}
                  </div>

                  <div className="space-y-1">
                    {dayTaches.slice(0, 3).map(tache => (
                      <button
                        key={tache.id}
                        onClick={() => { setSelectedTache(tache); setShowDetails(true); }}
                        className="w-full text-left"
                      >
                        <div className={`text-xs p-1.5 rounded truncate flex items-center gap-1 ${getUrgenceColor(tache.date_echeance, tache.statut)} bg-opacity-20 hover:bg-opacity-30 transition-colors`}>
                          <div className={`w-2 h-2 rounded-full ${getUrgenceColor(tache.date_echeance, tache.statut)} flex-shrink-0`} />
                          <span className="truncate text-slate-900 font-medium">
                            {tache.projet_nom ? `📁 ` : ''}{tache.titre}
                          </span>
                        </div>
                      </button>
                    ))}
                    {dayTaches.length > 3 && (
                      <div className="text-xs text-slate-500 text-center py-1">
                        +{dayTaches.length - 3} autre{dayTaches.length - 3 > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la tâche</DialogTitle>
          </DialogHeader>
          {selectedTache && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{getPriorityIcon(selectedTache.priorite)}</span>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedTache.titre}</h3>
                  <div className={`w-3 h-3 rounded-full ${getUrgenceColor(selectedTache.date_echeance, selectedTache.statut)}`} />
                </div>
                {selectedTache.description && (
                  <p className="text-slate-600">{selectedTache.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Assigné à</p>
                  <p className="font-medium">{selectedTache.assigne_a_nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Créé par</p>
                  <p className="font-medium">{selectedTache.createur_nom}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Priorité</p>
                  <Badge>{selectedTache.priorite}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Statut</p>
                  <Badge>{selectedTache.statut}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date début</p>
                  <p className="font-medium">{moment(selectedTache.date_debut).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date échéance</p>
                  <p className="font-medium">{moment(selectedTache.date_echeance).format('DD/MM/YYYY')}</p>
                </div>
              </div>

              {selectedTache.statut === 'terminee' || selectedTache.statut === 'validee' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-sm font-medium text-emerald-900">✅ Tâche terminée</p>
                  {selectedTache.commentaire_validation && (
                    <p className="text-sm text-emerald-700 mt-2">{selectedTache.commentaire_validation}</p>
                  )}
                  {selectedTache.preuve_fichier_url && (
                    <a 
                      href={selectedTache.preuve_fichier_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm mt-2"
                    >
                      Voir la pièce jointe
                    </a>
                  )}
                </div>
              ) : (
                <div className={`p-4 border rounded-lg ${
                  moment(selectedTache.date_echeance).isBefore(moment(), 'day') 
                    ? 'bg-rose-50 border-rose-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <p className="text-sm font-medium">
                    {moment(selectedTache.date_echeance).isBefore(moment(), 'day') 
                      ? `⚠️ En retard de ${moment().diff(moment(selectedTache.date_echeance), 'days')} jour(s)`
                      : `📅 Échéance: ${moment(selectedTache.date_echeance).format('DD MMMM YYYY')}`
                    }
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}