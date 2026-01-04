import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Plus,
  Bell,
  TrendingUp,
  Edit,
  Trash2,
  PartyPopper,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import CampagneIA from '@/components/evenements/CampagneIA';

export default function Evenements() {
  const [evenements, setEvenements] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCampagne, setShowCampagne] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(moment());
  const [selectedDay, setSelectedDay] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    date_debut: '',
    type: 'autre',
    description: '',
    opportunite_pub: '',
    recurrent_annuel: true
  });

  useEffect(() => {
    loadData();
    initializeDefaultEvents();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [eventsData, userData] = await Promise.all([
      base44.entities.Evenement.list(),
      base44.auth.me()
    ]);
    setEvenements(eventsData);
    setUser(userData);
    setIsLoading(false);
  };

  const initializeDefaultEvents = async () => {
    const existingEvents = await base44.entities.Evenement.list();
    if (existingEvents.length === 0) {
      const currentYear = moment().year();
      const defaultEvents = [
        { nom: "Nouvel An", date_debut: `${currentYear}-01-01`, type: "fete_nationale", description: "Célébration du Nouvel An", opportunite_pub: "Cartes de vœux, calendriers, flyers promotionnels", recurrent_annuel: true },
        { nom: "Fête du Travail", date_debut: `${currentYear}-05-01`, type: "fete_nationale", description: "Journée internationale des travailleurs", opportunite_pub: "Affiches syndicales, bannières événementielles", recurrent_annuel: true },
        { nom: "Fête de l'Indépendance", date_debut: `${currentYear}-08-17`, type: "fete_nationale", description: "Indépendance du Gabon", opportunite_pub: "Drapeaux, affiches patriotiques, programmes événementiels", recurrent_annuel: true },
        { nom: "Rentrée Scolaire", date_debut: `${currentYear}-09-15`, type: "rentree_scolaire", description: "Début de l'année scolaire", opportunite_pub: "Fournitures scolaires, cahiers personnalisés, listes de classe", recurrent_annuel: true },
        { nom: "Noël", date_debut: `${currentYear}-12-25`, type: "fete_religieuse", description: "Fête de Noël", opportunite_pub: "Cartes de vœux, calendriers de l'Avent, menus de fête", recurrent_annuel: true },
        { nom: "Saint-Valentin", date_debut: `${currentYear}-02-14`, type: "commercial", description: "Fête des amoureux", opportunite_pub: "Cartes romantiques, bons cadeaux, packaging spécial", recurrent_annuel: true },
        { nom: "Fête des Mères", date_debut: `${currentYear}-05-26`, type: "commercial", description: "Fête des Mères", opportunite_pub: "Cartes personnalisées, albums photo, certificats", recurrent_annuel: true },
        { nom: "Black Friday", date_debut: `${currentYear}-11-29`, type: "commercial", description: "Journée de promotions", opportunite_pub: "Flyers promotionnels, catalogues, affiches publicitaires", recurrent_annuel: true }
      ];
      
      for (const event of defaultEvents) {
        await base44.entities.Evenement.create(event);
      }
      loadData();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingEvent) {
      await base44.entities.Evenement.update(editingEvent.id, formData);
      toast.success('Événement mis à jour');
    } else {
      await base44.entities.Evenement.create(formData);
      toast.success('Événement créé');
    }

    setShowForm(false);
    setEditingEvent(null);
    resetForm();
    loadData();
  };

  const handleDelete = async (event) => {
    if (confirm(`Supprimer l'événement ${event.nom} ?`)) {
      await base44.entities.Evenement.delete(event.id);
      toast.success('Événement supprimé');
      loadData();
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      date_debut: '',
      type: 'autre',
      description: '',
      opportunite_pub: '',
      recurrent_annuel: true
    });
  };

  const getEventColor = (type) => {
    const colors = {
      fete_nationale: 'bg-blue-500',
      fete_religieuse: 'bg-purple-500',
      rentree_scolaire: 'bg-amber-500',
      commercial: 'bg-emerald-500',
      culturel: 'bg-violet-500',
      autre: 'bg-slate-500'
    };
    return colors[type] || colors.autre;
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const startOfMonth = currentMonth.clone().startOf('month');
    const endOfMonth = currentMonth.clone().endOf('month');
    const startDay = startOfMonth.clone().startOf('week');
    const endDay = endOfMonth.clone().endOf('week');

    const days = [];
    let day = startDay.clone();

    while (day.isSameOrBefore(endDay, 'day')) {
      days.push(day.clone());
      day.add(1, 'day');
    }

    return days;
  };

  const getEventsForDay = (day) => {
    return evenements.filter(evt => 
      moment(evt.date_debut).format('YYYY-MM-DD') === day.format('YYYY-MM-DD')
    );
  };

  const isAdmin = user?.role === 'admin';
  const upcomingEvents = evenements.filter(e => moment(e.date_debut).isAfter(moment())).sort((a, b) => moment(a.date_debut).diff(moment(b.date_debut)));

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
          <h1 className="text-2xl font-bold text-slate-900">Calendrier des Événements</h1>
          <p className="text-slate-500">Planifiez vos actions marketing et opportunités</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => { setEditingEvent(null); resetForm(); setShowForm(true); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        )}
      </div>

      {/* Alert */}
      {upcomingEvents.filter(e => moment(e.date_debut).diff(moment(), 'days') <= 30).length > 0 && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">
                  {upcomingEvents.filter(e => moment(e.date_debut).diff(moment(), 'days') <= 30).length} événement(s) dans les 30 prochains jours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mini Calendar */}
        <Card className="border-0 shadow-lg lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(currentMonth.clone().subtract(1, 'month'))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-bold text-slate-900">
                {currentMonth.format('MMMM YYYY')}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(currentMonth.clone().add(1, 'month'))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => (
                <div key={i} className="text-center text-xs font-medium text-slate-500 py-1">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {generateCalendarDays().map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isToday = day.isSame(moment(), 'day');
                const isCurrentMonth = day.month() === currentMonth.month();
                const isSelected = selectedDay?.isSame(day, 'day');

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedDay(day);
                      if (dayEvents.length === 1) {
                        setSelectedEvent(dayEvents[0]);
                        setShowCampagne(true);
                      }
                    }}
                    className={`aspect-square p-1 text-xs rounded-lg transition-all relative ${
                      isSelected ? 'bg-blue-500 text-white' :
                      isToday ? 'bg-blue-100 text-blue-700 font-bold' :
                      !isCurrentMonth ? 'text-slate-300' :
                      dayEvents.length > 0 ? 'bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200' :
                      'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {day.date()}
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-600 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Prochains événements
          </h2>
          
          {upcomingEvents.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun événement à venir</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {upcomingEvents.map(event => {
                const daysUntil = moment(event.date_debut).diff(moment(), 'days');
                const isUrgent = daysUntil <= 30;
                
                return (
                  <Card 
                    key={event.id} 
                    className={`border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer ${
                      isUrgent ? 'border-l-4 border-l-amber-500' : ''
                    }`}
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowCampagne(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl ${getEventColor(event.type)} flex items-center justify-center flex-shrink-0`}>
                          <PartyPopper className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-slate-900">{event.nom}</h3>
                            {isUrgent && (
                              <Badge className="bg-amber-100 text-amber-700">
                                <Bell className="w-3 h-3 mr-1" />
                                {daysUntil}j
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {event.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2 line-clamp-1">{event.description}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {moment(event.date_debut).format('DD MMM YYYY')}
                            </span>
                            {event.recurrent_annuel && (
                              <Badge variant="outline" className="text-xs">Annuel</Badge>
                            )}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={(e) => { 
                                e.stopPropagation();
                                setEditingEvent(event); 
                                setFormData(event); 
                                setShowForm(true); 
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-600"
                              onClick={(e) => { 
                                e.stopPropagation();
                                handleDelete(event);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom de l'événement *</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date_debut}
                  onChange={(e) => setFormData(prev => ({ ...prev, date_debut: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fete_nationale">Fête nationale</SelectItem>
                    <SelectItem value="fete_religieuse">Fête religieuse</SelectItem>
                    <SelectItem value="rentree_scolaire">Rentrée scolaire</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="culturel">Culturel</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <Label>Opportunités publicitaires</Label>
                <Textarea
                  value={formData.opportunite_pub}
                  onChange={(e) => setFormData(prev => ({ ...prev, opportunite_pub: e.target.value }))}
                  placeholder="Ex: Cartes de vœux, flyers, affiches..."
                  rows={3}
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recurrent"
                  checked={formData.recurrent_annuel}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurrent_annuel: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="recurrent" className="cursor-pointer">Événement annuel récurrent</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600">
                {editingEvent ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campagne IA Dialog */}
      <Dialog open={showCampagne} onOpenChange={setShowCampagne}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              Campagne Marketing IA - {selectedEvent?.nom}
            </DialogTitle>
          </DialogHeader>
          {selectedEvent && <CampagneIA event={selectedEvent} />}
        </DialogContent>
      </Dialog>

      {/* Selected Day Events */}
      {selectedDay && getEventsForDay(selectedDay).length > 0 && (
        <Card className="border-0 shadow-lg bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg">
              Événements du {selectedDay.format('DD MMMM YYYY')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {getEventsForDay(selectedDay).map(evt => (
              <div 
                key={evt.id} 
                className="p-3 bg-white rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setSelectedEvent(evt);
                  setShowCampagne(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getEventColor(evt.type)}`}></div>
                  <p className="font-medium text-slate-900">{evt.nom}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}