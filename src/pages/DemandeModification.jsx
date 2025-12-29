import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Send, 
  Calendar,
  User,
  FileText,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

export default function DemandeModification() {
  const [user, setUser] = useState(null);
  const [rapports, setRapports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    operateur: '',
    rapport_id: '',
    motif: ''
  });
  const [searchDate, setSearchDate] = useState('');
  const [filteredRapports, setFilteredRapports] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, operateur: user.email }));
    }
  }, [user]);

  useEffect(() => {
    if (searchDate) {
      const filtered = rapports.filter(r => r.date === searchDate);
      setFilteredRapports(filtered);
    } else {
      setFilteredRapports([]);
    }
  }, [searchDate, rapports]);

  const loadData = async () => {
    setIsLoading(true);
    const [rapportsData, userData] = await Promise.all([
      base44.entities.RapportJournalier.list('-date'),
      base44.auth.me()
    ]);
    setRapports(rapportsData);
    setUser(userData);
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.operateur) {
      toast.error('Veuillez sélectionner votre identifiant');
      return;
    }
    
    if (!formData.rapport_id) {
      toast.error('Veuillez sélectionner un rapport');
      return;
    }
    
    if (!formData.motif.trim()) {
      toast.error('Veuillez expliquer la raison de la modification');
      return;
    }

    const selectedRapport = rapports.find(r => r.id === formData.rapport_id);
    
    // Create modification request
    await base44.entities.DemandeModification.create({
      rapport_id: formData.rapport_id,
      demandeur: formData.operateur,
      demandeur_nom: user?.full_name || formData.operateur,
      motif: formData.motif
    });

    // Send email notifications to all users including admin
    try {
      const allUsers = await base44.entities.User.list();
      
      for (const targetUser of allUsers) {
        if (targetUser.email) {
          const isAdmin = targetUser.role === 'admin';
          await base44.integrations.Core.SendEmail({
            from_name: 'Imprimerie Ogooué',
            to: targetUser.email,
            subject: 'Demande de modification de rapport',
            body: `Bonjour ${targetUser.full_name || targetUser.email},

${user?.full_name || formData.operateur} a demandé la modification du rapport du ${moment(selectedRapport?.date).format('DD/MM/YYYY')}.

Identifiant du demandeur: ${formData.operateur}
Date du rapport: ${moment(selectedRapport?.date).format('DD/MM/YYYY')}

Motif de la demande:
${formData.motif}

${isAdmin ? 'En tant qu\'administrateur, vous pouvez approuver ou rejeter cette demande depuis la plateforme.' : 'Cette demande sera traitée par l\'administrateur.'}

Cordialement,
Imprimerie Ogooué`
          });
        }
      }
      
      toast.success('Demande envoyée et notifications email envoyées à tous les utilisateurs');
    } catch (e) {
      console.log('Email error:', e);
      toast.success('Demande envoyée');
    }

    // Reset form
    setFormData({
      operateur: user?.email || '',
      rapport_id: '',
      motif: ''
    });
    setSearchDate('');
    
    // Redirect to demandes page if admin
    if (user?.role === 'admin') {
      setTimeout(() => navigate(createPageUrl('DemandesModification')), 1500);
    }
  };

  const selectedRapport = rapports.find(r => r.id === formData.rapport_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Demande de modification</h1>
        <p className="text-slate-500">Demandez l'autorisation de modifier un rapport verrouillé</p>
      </div>

      {/* Form */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle>Formulaire de demande</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Identifiant */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-600" />
                Votre identifiant *
              </Label>
              <Select 
                value={formData.operateur} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, operateur: v }))}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Sélectionnez votre identifiant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user?.email || ''}>
                    {user?.full_name || user?.email || 'Utilisateur actuel'}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">Votre identifiant sera enregistré avec la demande</p>
            </div>

            {/* Date Search */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-blue-600" />
                Rechercher un rapport par date
              </Label>
              <Input 
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="bg-white"
              />
              <p className="text-xs text-slate-500 mt-1">Sélectionnez la date du rapport à modifier</p>
            </div>

            {/* Report Selection */}
            {searchDate && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Sélectionner le rapport *
                </Label>
                {filteredRapports.length === 0 ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
                    <p className="text-sm text-amber-700">Aucun rapport trouvé pour cette date</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredRapports.map(rapport => (
                      <button
                        key={rapport.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, rapport_id: rapport.id }))}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                          formData.rapport_id === rapport.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">
                              Rapport du {moment(rapport.date).format('DD MMMM YYYY')}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              Opérateur: {rapport.operateur_nom} • Statut: {rapport.statut}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Total: {(rapport.total_recettes || 0).toLocaleString()} FCFA
                            </p>
                          </div>
                          {rapport.verrouille && (
                            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">
                              Verrouillé
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Selected Report Summary */}
            {selectedRapport && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Rapport sélectionné</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-blue-600">Date</p>
                      <p className="font-medium text-blue-900">{moment(selectedRapport.date).format('DD/MM/YYYY')}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Opérateur</p>
                      <p className="font-medium text-blue-900">{selectedRapport.operateur_nom}</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Recettes</p>
                      <p className="font-medium text-emerald-700">{(selectedRapport.total_recettes || 0).toLocaleString()} FCFA</p>
                    </div>
                    <div>
                      <p className="text-blue-600">Dépenses</p>
                      <p className="font-medium text-rose-700">{(selectedRapport.total_depenses || 0).toLocaleString()} FCFA</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reason */}
            <div>
              <Label className="mb-2 block">
                Raison de la modification *
              </Label>
              <Textarea 
                value={formData.motif}
                onChange={(e) => setFormData(prev => ({ ...prev, motif: e.target.value }))}
                placeholder="Expliquez en détail pourquoi vous devez modifier ce rapport..."
                rows={6}
                className="bg-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Soyez précis sur les corrections à apporter. L'administrateur examinera votre demande.
              </p>
            </div>

            {/* Information */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <p className="text-sm text-slate-700">
                <strong>📧 Notification automatique:</strong> Votre demande sera envoyée par email à tous les utilisateurs 
                de la plateforme, y compris les administrateurs. Vous recevrez également une copie de la demande.
              </p>
              <p className="text-sm text-slate-700 mt-2">
                <strong>🔐 Approbation:</strong> Seul un administrateur peut approuver votre demande et débloquer 
                le rapport pour modification ou la rejeter.
              </p>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => navigate(createPageUrl('RapportsJournaliers'))}
              >
                Annuler
              </Button>
              <Button 
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={!formData.operateur || !formData.rapport_id || !formData.motif.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Envoyer la demande
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-900 mb-2">💡 Conseil</h4>
            <p className="text-sm text-blue-700">
              Assurez-vous que votre demande est justifiée. Les demandes non fondées pourront être rejetées.
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-emerald-900 mb-2">⏱️ Délai de traitement</h4>
            <p className="text-sm text-emerald-700">
              Votre demande sera traitée dans les meilleurs délais par un administrateur.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}