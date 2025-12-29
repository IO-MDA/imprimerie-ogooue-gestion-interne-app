import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Search, 
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function DemandesModification() {
  const [demandes, setDemandes] = useState([]);
  const [rapports, setRapports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [reponse, setReponse] = useState('');
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [demandesData, rapportsData, userData] = await Promise.all([
      base44.entities.DemandeModification.list('-created_date'),
      base44.entities.RapportJournalier.list(),
      base44.auth.me()
    ]);
    setDemandes(demandesData);
    setRapports(rapportsData);
    setUser(userData);
    setIsLoading(false);
  };

  const getRapport = (rapportId) => {
    return rapports.find(r => r.id === rapportId);
  };

  const handleApprove = async (demande) => {
    const rapport = getRapport(demande.rapport_id);
    if (rapport) {
      await base44.entities.RapportJournalier.update(rapport.id, { 
        verrouille: false,
        statut: 'modifiable'
      });
    }
    
    await base44.entities.DemandeModification.update(demande.id, {
      statut: 'approuvee',
      reponse_admin: reponse || 'Demande approuvée - Le rapport est maintenant modifiable',
      traite_par: user?.email,
      date_traitement: new Date().toISOString()
    });

    // Send email notification to requester and all users
    try {
      const allUsers = await base44.entities.User.list();
      
      for (const targetUser of allUsers) {
        if (targetUser.email) {
          const isRequester = targetUser.email === demande.demandeur;
          await base44.integrations.Core.SendEmail({
            from_name: 'Imprimerie Ogooué',
            to: targetUser.email,
            subject: isRequester ? 'Demande de modification approuvée' : 'Notification: Demande de modification approuvée',
            body: `Bonjour ${targetUser.full_name || targetUser.email},

${isRequester ? 'Bonne nouvelle! Votre' : 'La'} demande de modification du rapport du ${moment(rapport?.date).format('DD/MM/YYYY')} a été approuvée par ${user?.full_name || user?.email}.

${isRequester ? 'Vous pouvez maintenant modifier ce rapport.' : ''}

Réponse de l'administrateur:
${reponse || 'Demande approuvée - Le rapport est maintenant modifiable'}

Cordialement,
Imprimerie Ogooué`
          });
        }
      }
    } catch (e) {
      console.log('Email notification error:', e);
    }

    toast.success('Demande approuvée - Notifications envoyées');
    setSelectedDemande(null);
    setReponse('');
    loadData();
  };

  const handleReject = async (demande) => {
    const rapport = getRapport(demande.rapport_id);
    
    await base44.entities.DemandeModification.update(demande.id, {
      statut: 'refusee',
      reponse_admin: reponse || 'Demande refusée',
      traite_par: user?.email,
      date_traitement: new Date().toISOString()
    });

    // Send email notification to requester and all users
    try {
      const allUsers = await base44.entities.User.list();
      
      for (const targetUser of allUsers) {
        if (targetUser.email) {
          const isRequester = targetUser.email === demande.demandeur;
          await base44.integrations.Core.SendEmail({
            from_name: 'Imprimerie Ogooué',
            to: targetUser.email,
            subject: isRequester ? 'Demande de modification refusée' : 'Notification: Demande de modification refusée',
            body: `Bonjour ${targetUser.full_name || targetUser.email},

${isRequester ? 'Votre' : 'La'} demande de modification du rapport du ${moment(rapport?.date).format('DD/MM/YYYY')} a été refusée par ${user?.full_name || user?.email}.

Raison du refus:
${reponse || 'Demande refusée'}

${isRequester ? 'Pour toute question, veuillez contacter l\'administrateur.' : ''}

Cordialement,
Imprimerie Ogooué`
          });
        }
      }
    } catch (e) {
      console.log('Email notification error:', e);
    }

    toast.success('Demande refusée - Notifications envoyées');
    setSelectedDemande(null);
    setReponse('');
    loadData();
  };

  const filteredDemandes = demandes.filter(d => {
    if (filter === 'all') return true;
    return d.statut === filter;
  });

  const pendingCount = demandes.filter(d => d.statut === 'en_attente').length;

  const getStatusBadge = (statut) => {
    const config = {
      en_attente: { label: 'En attente', class: 'bg-amber-100 text-amber-700', icon: Clock },
      approuvee: { label: 'Approuvée', class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
      refusee: { label: 'Refusée', class: 'bg-rose-100 text-rose-700', icon: XCircle }
    };
    const { label, class: className, icon: Icon } = config[statut] || config.en_attente;
    return (
      <Badge className={`${className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Demandes de modification</h1>
          <p className="text-slate-500">Gérez les demandes de modification des rapports</p>
        </div>
        {pendingCount > 0 && (
          <Badge className="bg-amber-100 text-amber-700 text-sm px-3 py-1">
            {pendingCount} demande(s) en attente
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-blue-600' : ''}
          size="sm"
        >
          Toutes ({demandes.length})
        </Button>
        <Button 
          variant={filter === 'en_attente' ? 'default' : 'outline'}
          onClick={() => setFilter('en_attente')}
          className={filter === 'en_attente' ? 'bg-amber-600' : ''}
          size="sm"
        >
          En attente ({demandes.filter(d => d.statut === 'en_attente').length})
        </Button>
        <Button 
          variant={filter === 'approuvee' ? 'default' : 'outline'}
          onClick={() => setFilter('approuvee')}
          className={filter === 'approuvee' ? 'bg-emerald-600' : ''}
          size="sm"
        >
          Approuvées ({demandes.filter(d => d.statut === 'approuvee').length})
        </Button>
        <Button 
          variant={filter === 'refusee' ? 'default' : 'outline'}
          onClick={() => setFilter('refusee')}
          className={filter === 'refusee' ? 'bg-rose-600' : ''}
          size="sm"
        >
          Refusées ({demandes.filter(d => d.statut === 'refusee').length})
        </Button>
      </div>

      {/* Demandes List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredDemandes.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="py-16 text-center">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucune demande de modification</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDemandes.map(demande => {
            const rapport = getRapport(demande.rapport_id);
            return (
              <Card 
                key={demande.id} 
                className={`border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all cursor-pointer ${
                  demande.statut === 'en_attente' ? 'border-l-4 border-l-amber-500' : ''
                }`}
                onClick={() => setSelectedDemande(demande)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <FileCheck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900">
                            Demande de {demande.demandeur_nom}
                          </h3>
                          {getStatusBadge(demande.statut)}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {moment(demande.created_date).format('DD/MM/YYYY à HH:mm')}
                        </p>
                        {rapport && (
                          <p className="text-sm text-blue-600 mt-1">
                            <FileText className="w-3 h-3 inline mr-1" />
                            Rapport: {rapport.service} du {moment(rapport.date).format('DD/MM/YYYY')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500 mb-2">{demande.motif}</p>
                      {demande.statut === 'en_attente' && (
                        <div className="flex gap-2 justify-end">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={(e) => { e.stopPropagation(); setSelectedDemande(demande); }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={(e) => { e.stopPropagation(); handleApprove(demande); }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approuver
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedDemande} onOpenChange={() => { setSelectedDemande(null); setReponse(''); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails de la demande</DialogTitle>
          </DialogHeader>
          {selectedDemande && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">Demandeur</p>
                  <p className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    {selectedDemande.demandeur_nom}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Date de demande</p>
                  <p className="font-medium">
                    {moment(selectedDemande.created_date).format('DD/MM/YYYY HH:mm')}
                  </p>
                </div>
              </div>

              {getRapport(selectedDemande.rapport_id) && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-600 font-medium">Rapport concerné</p>
                  <p className="mt-1">
                    {getRapport(selectedDemande.rapport_id)?.service} - {moment(getRapport(selectedDemande.rapport_id)?.date).format('DD/MM/YYYY')}
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    Recettes: {(getRapport(selectedDemande.rapport_id)?.recettes || 0).toLocaleString()} FCFA | 
                    Dépenses: {(getRapport(selectedDemande.rapport_id)?.depenses || 0).toLocaleString()} FCFA
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-slate-500">Motif de la demande</p>
                <p className="p-3 bg-slate-50 rounded-lg mt-1">{selectedDemande.motif}</p>
              </div>

              <div>
                <p className="text-sm text-slate-500">Statut</p>
                <div className="mt-1">{getStatusBadge(selectedDemande.statut)}</div>
              </div>

              {selectedDemande.statut !== 'en_attente' && selectedDemande.reponse_admin && (
                <div>
                  <p className="text-sm text-slate-500">Réponse de l'administrateur</p>
                  <p className="p-3 bg-slate-50 rounded-lg mt-1">{selectedDemande.reponse_admin}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Par {selectedDemande.traite_par} le {moment(selectedDemande.date_traitement).format('DD/MM/YYYY à HH:mm')}
                  </p>
                </div>
              )}

              {selectedDemande.statut === 'en_attente' && (
                <>
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Votre réponse (optionnel)</p>
                    <Textarea 
                      value={reponse}
                      onChange={(e) => setReponse(e.target.value)}
                      placeholder="Commentaire pour l'opérateur..."
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button 
                      variant="outline"
                      className="text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={() => handleReject(selectedDemande)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Refuser
                    </Button>
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleApprove(selectedDemande)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approuver
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}