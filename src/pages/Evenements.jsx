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
import {
  Calendar,
  Plus,
  Bell,
  TrendingUp,
  Edit,
  Trash2,
  PartyPopper,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import EvenementCalendar from '@/components/evenements/EvenementCalendar';
import CampagneIA from '@/components/evenements/CampagneIA';

export default function Evenements() {
  const [evenements, setEvenements] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showCampagne, setShowCampagne] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    date: '',
    type: 'autre',
    description: '',
    opportunite_pub: '',
    recurrent_annuel: true
  });

  useEffect(() => {
    loadData();
    initializeDefaultEvents();
    checkUpcomingEvents();
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
        { nom: "Nouvel An", date: `${currentYear}-01-01`, type: "fete_nationale", description: "Célébration du Nouvel An", opportunite_pub: "Cartes de vœux, calendriers, flyers promotionnels" },
        { nom: "Fête du Travail", date: `${currentYear}-05-01`, type: "fete_nationale", description: "Journée internationale des travailleurs", opportunite_pub: "Affiches syndicales, bannières événementielles" },
        { nom: "Fête de l'Indépendance", date: `${currentYear}-08-17`, type: "fete_nationale", description: "Indépendance du Gabon", opportunite_pub: "Drapeaux, affiches patriotiques, programmes événementiels" },
        { nom: "Rentrée Scolaire", date: `${currentYear}-09-15`, type: "rentree_scolaire", description: "Début de l'année scolaire", opportunite_pub: "Fournitures scolaires, cahiers personnalisés, listes de classe" },
        { nom: "Noël", date: `${currentYear}-12-25`, type: "fete_religieuse", description: "Fête de Noël", opportunite_pub: "Cartes de vœux, calendriers de l'Avent, menus de fête" },
        { nom: "Saint-Valentin", date: `${currentYear}-02-14`, type: "commercial", description: "Fête des amoureux", opportunite_pub: "Cartes romantiques, bons cadeaux, packaging spécial" },
        { nom: "Fête des Mères", date: `${currentYear}-05-26`, type: "commercial", description: "Fête des Mères", opportunite_pub: "Cartes personnalisées, albums photo, certificats" },
        { nom: "Black Friday", date: `${currentYear}-11-29`, type: "commercial", description: "Journée de promotions", opportunite_pub: "Flyers promotionnels, catalogues, affiches publicitaires" }
      ];
      
      for (const event of defaultEvents) {
        await base44.entities.Evenement.create(event);
      }
      loadData();
    }
  };

  const checkUpcomingEvents = async () => {
    const events = await base44.entities.Evenement.list();
    const today = moment();
    
    for (const event of events) {
      const eventDate = moment(event.date);
      const daysUntil = eventDate.diff(today, 'days');
      
      // Notifier si événement dans 30 jours et notification pas encore envoyée
      if (daysUntil <= 30 && daysUntil > 0 && !event.notif_envoyee) {
        try {
          const allUsers = await base44.entities.User.list();
          const admins = allUsers.filter(u => u.role === 'admin');
          
          for (const admin of admins) {
            await base44.integrations.Core.SendEmail({
              from_name: 'Imprimerie Ogooué',
              to: admin.email,
              subject: `🔔 Événement à venir: ${event.nom}`,
              body: `Bonjour ${admin.full_name || admin.email},

L'événement "${event.nom}" approche dans ${daysUntil} jour(s) (${eventDate.format('DD/MM/YYYY')}).

Description: ${event.description || 'N/A'}

Opportunités publicitaires:
${event.opportunite_pub || 'À définir'}

C'est le moment idéal pour:
- Préparer des offres spéciales
- Contacter vos clients
- Lancer des campagnes de communication

Cordialement,
Imprimerie Ogooué`
            });
          }
          
          await base44.entities.Evenement.update(event.id, { notif_envoyee: true });
        } catch (e) {
          console.log('Notification error:', e);
        }
      }
      
      // Réinitialiser la notification après l'événement
      if (daysUntil < 0 && event.notif_envoyee) {
        await base44.entities.Evenement.update(event.id, { notif_envoyee: false });
      }
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
      date: '',
      type: 'autre',
      description: '',
      opportunite_pub: '',
      recurrent_annuel: true
    });
  };

  const getEventColor = (type) => {
    const colors = {
      fete_nationale: 'from-blue-500 to-indigo-600',
      fete_religieuse: 'from-purple-500 to-pink-600',
      rentree_scolaire: 'from-amber-500 to-orange-600',
      commercial: 'from-emerald-500 to-teal-600',
      culturel: 'from-violet-500 to-purple-600',
      autre: 'from-slate-500 to-slate-600'
    };
    return colors[type] || colors.autre;
  };

  const getEventIcon = (type) => {
    return <PartyPopper className="w-5 h-5 text-white" />;
  };

  const sortedEvents = [...evenements].sort((a, b) => {
    const dateA = moment(a.date);
    const dateB = moment(b.date);
    return dateA.diff(dateB);
  });

  const upcomingEvents = sortedEvents.filter(e => moment(e.date).isAfter(moment()));
  const pastEvents = sortedEvents.filter(e => moment(e.date).isBefore(moment()));

  const isAdmin = user?.role === 'admin';

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
          <p className="text-slate-500">Planifiez vos actions marketing et anticipez les opportunités</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => { setEditingEvent(null); resetForm(); setShowForm(true); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un événement
          </Button>
        )}
      </div>

      {/* Calendar View */}
      <EvenementCalendar 
        evenements={evenements}
        onSelectEvent={(event) => {
          setSelectedEvent(event);
          setShowCampagne(true);
        }}
        onAddEvent={() => { 
          setEditingEvent(null); 
          resetForm(); 
          setShowForm(true); 
        }}
      />

      {/* Alert for upcoming events */}
      {upcomingEvents.filter(e => moment(e.date).diff(moment(), 'days') <= 30).length > 0 && (
        <Card className="border-2 border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Événements à venir ce mois</p>
                <p className="text-sm text-amber-700 mt-1">
                  {upcomingEvents.filter(e => moment(e.date).diff(moment(), 'days') <= 30).length} événement(s) dans les 30 prochains jours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-blue-600" />
          Événements à venir
        </h2>
        <div className="grid gap-4">
          {upcomingEvents.length === 0 ? (
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun événement à venir</p>
              </CardContent>
            </Card>
          ) : (
            upcomingEvents.map(event => {
              const daysUntil = moment(event.date).diff(moment(), 'days');
              const isUrgent = daysUntil <= 30;
              
              return (
                <Card key={event.id} className={`border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow ${isUrgent ? 'border-l-4 border-l-amber-500' : ''}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getEventColor(event.type)} flex items-center justify-center flex-shrink-0`}>
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-slate-900">{event.nom}</h3>
                            <Badge variant="outline">{event.type.replace('_', ' ')}</Badge>
                            {isUrgent && (
                              <Badge className="bg-amber-100 text-amber-700">
                                <Bell className="w-3 h-3 mr-1" />
                                Dans {daysUntil}j
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-3">{event.description}</p>
                          
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg mb-2">
                            <p className="text-sm font-medium text-emerald-900 flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Opportunités publicitaires
                            </p>
                            <p className="text-sm text-emerald-700 mt-1">{event.opportunite_pub}</p>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {moment(event.date).format('DD MMMM YYYY')}
                            </span>
                            {event.recurrent_annuel && (
                              <Badge variant="outline" className="text-xs">Annuel</Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowCampagne(true);
                          }}
                          className="text-violet-600"
                        >
                          <Sparkles className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => { setEditingEvent(event); setFormData(event); setShowForm(true); }}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(event)} className="text-rose-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-slate-400" />
            Événements passés
          </h2>
          <div className="grid gap-4">
            {pastEvents.slice(0, 5).map(event => (
              <Card key={event.id} className="border-0 shadow-lg shadow-slate-200/50 opacity-60">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getEventColor(event.type)} flex items-center justify-center`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{event.nom}</p>
                        <p className="text-sm text-slate-500">{moment(event.date).format('DD/MM/YYYY')}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(event)} className="text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

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
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
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
            <DialogTitle>Campagne Marketing IA</DialogTitle>
          </DialogHeader>
          {selectedEvent && <CampagneIA event={selectedEvent} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}