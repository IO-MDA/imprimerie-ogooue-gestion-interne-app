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
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  UserPlus,
  Eye,
  Edit,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function Prospection() {
  const [prospects, setProspects] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    nom_entreprise: '',
    secteur_activite: '',
    adresse: '',
    telephone: '',
    email: '',
    responsable: '',
    statut: 'nouveau',
    notes: ''
  });

  useEffect(() => {
    loadData();
    initializeDefaultProspects();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [prospectsData, userData] = await Promise.all([
      base44.entities.Prospect.list('-created_date'),
      base44.auth.me()
    ]);
    setProspects(prospectsData);
    setUser(userData);
    setIsLoading(false);
  };

  const initializeDefaultProspects = async () => {
    const existingProspects = await base44.entities.Prospect.list();
    if (existingProspects.length === 0) {
      const defaultProspects = [
        { nom_entreprise: "COMILOG", secteur_activite: "Mines et extraction", adresse: "Zone industrielle, Moanda", telephone: "+241 01 XX XX XX", email: "contact@comilog.ga", responsable: "Directeur Administratif", statut: "nouveau" },
        { nom_entreprise: "Hôtel Le Diplomat", secteur_activite: "Hôtellerie", adresse: "Centre-ville, Moanda", telephone: "+241 02 XX XX XX", email: "hotel.diplomat@moanda.ga", responsable: "Gérant", statut: "nouveau" },
        { nom_entreprise: "Pharmacie Centrale Moanda", secteur_activite: "Santé et pharmacie", adresse: "Avenue principale, Moanda", telephone: "+241 03 XX XX XX", email: "pharma.moanda@gmail.com", responsable: "Pharmacien titulaire", statut: "nouveau" },
        { nom_entreprise: "École Internationale de Moanda", secteur_activite: "Éducation", adresse: "Quartier résidentiel, Moanda", telephone: "+241 04 XX XX XX", email: "ecole.intl.moanda@edu.ga", responsable: "Directeur", statut: "nouveau" },
        { nom_entreprise: "Super Marché Winner", secteur_activite: "Commerce et distribution", adresse: "Centre commercial, Moanda", telephone: "+241 05 XX XX XX", email: "winner.moanda@commerce.ga", responsable: "Manager", statut: "nouveau" }
      ];
      
      for (const prospect of defaultProspects) {
        await base44.entities.Prospect.create(prospect);
      }
      loadData();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (editingProspect) {
      await base44.entities.Prospect.update(editingProspect.id, formData);
      toast.success('Prospect mis à jour');
    } else {
      await base44.entities.Prospect.create(formData);
      toast.success('Prospect ajouté');
    }

    setShowForm(false);
    setEditingProspect(null);
    resetForm();
    loadData();
  };

  const generateMessage = async (prospect) => {
    setSelectedProspect(prospect);
    setIsGenerating(true);
    setShowMessage(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Génère un message professionnel de partenariat pour l'entreprise suivante:
        
Nom: ${prospect.nom_entreprise}
Secteur: ${prospect.secteur_activite}
Responsable: ${prospect.responsable || 'Cher(e) responsable'}

Le message doit:
- Être professionnel et courtois
- Présenter Imprimerie Ogooué (imprimerie basée à Libreville, Gabon)
- Proposer nos services (impression, photocopie, cartes de visite, dépliants, affiches, etc.)
- Mentionner une offre spéciale pour les entreprises de Moanda
- Inclure un appel à l'action
- Être en français
- Faire environ 150 mots

Format: Message direct prêt à envoyer.`,
        add_context_from_internet: false
      });

      const message = typeof result === 'string' ? result : result.response || result.text || '';
      setGeneratedMessage(message);
      
      await base44.entities.Prospect.update(prospect.id, {
        message_genere: message,
        dernier_contact: new Date().toISOString().split('T')[0]
      });
    } catch (e) {
      toast.error('Erreur lors de la génération du message');
      console.error(e);
    }
    
    setIsGenerating(false);
  };

  const convertToClient = async (prospect) => {
    if (confirm(`Ajouter ${prospect.nom_entreprise} au portefeuille client ?`)) {
      await base44.entities.Client.create({
        nom: prospect.nom_entreprise,
        email: prospect.email,
        telephone: prospect.telephone,
        adresse: prospect.adresse,
        type: 'entreprise',
        notes: `Secteur: ${prospect.secteur_activite}\nResponsable: ${prospect.responsable}\n${prospect.notes || ''}`
      });

      await base44.entities.Prospect.update(prospect.id, {
        statut: 'converti'
      });

      toast.success(`${prospect.nom_entreprise} ajouté aux clients !`);
      loadData();
    }
  };

  const sendEmail = async () => {
    if (!selectedProspect.email) {
      toast.error('Aucune adresse email disponible');
      return;
    }

    try {
      await base44.integrations.Core.SendEmail({
        from_name: 'Imprimerie Ogooué',
        to: selectedProspect.email,
        subject: `Partenariat - Imprimerie Ogooué`,
        body: generatedMessage
      });

      await base44.entities.Prospect.update(selectedProspect.id, {
        statut: 'contacte',
        dernier_contact: new Date().toISOString().split('T')[0]
      });

      toast.success('Email envoyé avec succès !');
      setShowMessage(false);
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'envoi de l\'email');
    }
  };

  const resetForm = () => {
    setFormData({
      nom_entreprise: '',
      secteur_activite: '',
      adresse: '',
      telephone: '',
      email: '',
      responsable: '',
      statut: 'nouveau',
      notes: ''
    });
  };

  const filteredProspects = prospects.filter(p => {
    const matchSearch = p.nom_entreprise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       p.secteur_activite?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'all' || p.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const getStatutBadge = (statut) => {
    const config = {
      nouveau: { label: 'Nouveau', class: 'bg-blue-100 text-blue-700' },
      contacte: { label: 'Contacté', class: 'bg-amber-100 text-amber-700' },
      interesse: { label: 'Intéressé', class: 'bg-purple-100 text-purple-700' },
      negocie: { label: 'En négociation', class: 'bg-indigo-100 text-indigo-700' },
      converti: { label: 'Client', class: 'bg-emerald-100 text-emerald-700' },
      non_interesse: { label: 'Non intéressé', class: 'bg-slate-100 text-slate-700' }
    };
    const { label, class: className } = config[statut] || config.nouveau;
    return <Badge className={className}>{label}</Badge>;
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
          <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Accès Restreint</h2>
          <p className="text-slate-600">Seuls les administrateurs peuvent accéder à la prospection.</p>
        </div>
      </div>
    );
  }

  const statsData = {
    total: prospects.length,
    nouveau: prospects.filter(p => p.statut === 'nouveau').length,
    contacte: prospects.filter(p => p.statut === 'contacte').length,
    converti: prospects.filter(p => p.statut === 'converti').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Prospection - Entreprises de Moanda</h1>
          <p className="text-slate-500">Gérez vos prospects et développez votre portefeuille client</p>
        </div>
        <Button
          onClick={() => { setEditingProspect(null); resetForm(); setShowForm(true); }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un prospect
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg shadow-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total prospects</p>
                <p className="text-3xl font-bold text-blue-900">{statsData.total}</p>
              </div>
              <Building2 className="w-10 h-10 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-amber-200/50 bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Nouveaux</p>
                <p className="text-3xl font-bold text-amber-900">{statsData.nouveau}</p>
              </div>
              <Clock className="w-10 h-10 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-purple-200/50 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Contactés</p>
                <p className="text-3xl font-bold text-purple-900">{statsData.contacte}</p>
              </div>
              <Mail className="w-10 h-10 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Convertis</p>
                <p className="text-3xl font-bold text-emerald-900">{statsData.converti}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-emerald-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher une entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="nouveau">Nouveau</SelectItem>
                <SelectItem value="contacte">Contacté</SelectItem>
                <SelectItem value="interesse">Intéressé</SelectItem>
                <SelectItem value="negocie">En négociation</SelectItem>
                <SelectItem value="converti">Converti</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Prospects List */}
      <div className="grid gap-4">
        {filteredProspects.length === 0 ? (
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardContent className="py-16 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucun prospect trouvé</p>
            </CardContent>
          </Card>
        ) : (
          filteredProspects.map(prospect => (
            <Card key={prospect.id} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                        {prospect.nom_entreprise?.[0]}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{prospect.nom_entreprise}</h3>
                        <p className="text-sm text-slate-500">{prospect.secteur_activite}</p>
                      </div>
                      {getStatutBadge(prospect.statut)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {prospect.responsable && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          {prospect.responsable}
                        </div>
                      )}
                      {prospect.telephone && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Phone className="w-4 h-4" />
                          {prospect.telephone}
                        </div>
                      )}
                      {prospect.email && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="w-4 h-4" />
                          {prospect.email}
                        </div>
                      )}
                      {prospect.adresse && (
                        <div className="flex items-center gap-2 text-slate-600 md:col-span-3">
                          <MapPin className="w-4 h-4" />
                          {prospect.adresse}
                        </div>
                      )}
                    </div>

                    {prospect.dernier_contact && (
                      <p className="text-xs text-slate-400 mt-2">
                        Dernier contact: {moment(prospect.dernier_contact).format('DD/MM/YYYY')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => generateMessage(prospect)}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      size="sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Générer message
                    </Button>
                    {prospect.statut !== 'converti' && (
                      <Button
                        onClick={() => convertToClient(prospect)}
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        size="sm"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Ajouter client
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditingProspect(prospect); setFormData(prospect); setShowForm(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingProspect ? 'Modifier le prospect' : 'Nouveau prospect'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom de l'entreprise *</Label>
                <Input
                  value={formData.nom_entreprise}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom_entreprise: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Secteur d'activité</Label>
                <Input
                  value={formData.secteur_activite}
                  onChange={(e) => setFormData(prev => ({ ...prev, secteur_activite: e.target.value }))}
                />
              </div>
              <div>
                <Label>Responsable</Label>
                <Input
                  value={formData.responsable}
                  onChange={(e) => setFormData(prev => ({ ...prev, responsable: e.target.value }))}
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={formData.telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="col-span-2">
                <Label>Adresse à Moanda</Label>
                <Input
                  value={formData.adresse}
                  onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                />
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={formData.statut} onValueChange={(v) => setFormData(prev => ({ ...prev, statut: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nouveau">Nouveau</SelectItem>
                    <SelectItem value="contacte">Contacté</SelectItem>
                    <SelectItem value="interesse">Intéressé</SelectItem>
                    <SelectItem value="negocie">En négociation</SelectItem>
                    <SelectItem value="non_interesse">Non intéressé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600">
                {editingProspect ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Message Dialog */}
      <Dialog open={showMessage} onOpenChange={setShowMessage}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Message de partenariat généré</DialogTitle>
          </DialogHeader>
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Sparkles className="w-12 h-12 text-purple-600 animate-pulse mb-4" />
              <p className="text-slate-600">Génération du message en cours...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedProspect && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="font-medium text-blue-900">{selectedProspect.nom_entreprise}</p>
                  <p className="text-sm text-blue-700">{selectedProspect.email}</p>
                </div>
              )}

              <div>
                <Label>Message personnalisé</Label>
                <Textarea
                  value={generatedMessage}
                  onChange={(e) => setGeneratedMessage(e.target.value)}
                  rows={12}
                  className="mt-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowMessage(false)}>
                  Fermer
                </Button>
                <Button
                  onClick={sendEmail}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer par email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}