import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings,
  Users,
  Shield,
  Trash2,
  Edit,
  UserPlus,
  Building2,
  Mail,
  Share2,
  Facebook,
  Instagram,
  MessageCircle,
  Twitter
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import moment from 'moment';

export default function Parametres() {
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteNom, setInviteNom] = useState('');
  const [user, setUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'user'
  });
  const [reseaux, setReseaux] = useState([]);
  const [showSocialForm, setShowSocialForm] = useState(false);
  const [socialForm, setSocialForm] = useState({
    plateforme: 'facebook',
    nom_compte: '',
    url: ''
  });
  const [whatsappNumber, setWhatsappNumber] = useState('241604464634');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [usersData, servicesData, reseauxData, userData, clientsData] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Service.list(),
      base44.entities.ReseauSocial.list(),
      base44.auth.me(),
      base44.entities.Client.list()
    ]);
    
    // Enrichir les utilisateurs avec les infos clients
    const enrichedUsers = usersData.map(u => {
      const clientProfile = clientsData.find(c => c.user_id === u.id);
      return {
        ...u,
        isClient: !!clientProfile,
        clientProfile
      };
    });
    
    setUsers(enrichedUsers);
    setServices(servicesData);
    setReseaux(reseauxData);
    setUser(userData);
    setIsLoading(false);
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast.error('Veuillez entrer une adresse email');
      return;
    }

    if (inviteRole === 'client' && !inviteNom) {
      toast.error('Veuillez entrer le nom du client');
      return;
    }
    
    try {
      if (inviteRole === 'client') {
        // Invitation client via fonction dédiée
        toast.info('Envoi de l\'invitation...');
        const response = await base44.functions.invoke('inviterClient', {
          email: inviteEmail,
          nom: inviteNom
        });
        
        if (response.data.success) {
          toast.success(`Invitation client envoyée à ${inviteEmail}`);
          setShowInvite(false);
          setInviteEmail('');
          setInviteNom('');
          setInviteRole('user');
          loadData();
        } else {
          toast.error(response.data.error || 'Erreur lors de l\'invitation');
        }
      } else {
        // Invitation employé (admin, manager, user)
        toast.info('Envoi de l\'invitation...');
        await base44.users.inviteUser(inviteEmail, inviteRole);
        toast.success(`Invitation employé envoyée à ${inviteEmail}`);
        setShowInvite(false);
        setInviteEmail('');
        setInviteNom('');
        setInviteRole('user');
        loadData();
      }
    } catch (e) {
      toast.error(e.message || 'Erreur lors de l\'invitation');
      console.error('Erreur invitation:', e);
    }
  };

  const initializeServices = async () => {
    const defaultServices = [
      { nom: 'PHOTOCOPIE', description: 'Service de photocopie', icone: 'Copy', couleur: 'blue' },
      { nom: 'IMPRESSION & SAISIE', description: 'Impression et saisie de documents', icone: 'Printer', couleur: 'indigo' },
      { nom: 'PHOTO ID', description: 'Photos d\'identité', icone: 'Camera', couleur: 'violet' },
      { nom: 'SCAN & PLASTIFICATION', description: 'Numérisation et plastification', icone: 'Scan', couleur: 'emerald' },
      { nom: 'VENTE ARTICLES', description: 'Vente d\'articles de papeterie', icone: 'ShoppingBag', couleur: 'amber' },
      { nom: 'IMPRIMERIE', description: 'Travaux d\'imprimerie', icone: 'Book', couleur: 'rose' }
    ];

    for (const service of defaultServices) {
      const exists = services.find(s => s.nom === service.nom);
      if (!exists) {
        await base44.entities.Service.create(service);
      }
    }
    
    toast.success('Services initialisés');
    loadData();
  };

  const handleAddSocial = async () => {
    if (!socialForm.nom_compte || !socialForm.url) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    await base44.entities.ReseauSocial.create({
      ...socialForm,
      connecte: true,
      derniere_synchro: new Date().toISOString()
    });

    toast.success('Réseau social ajouté');
    setShowSocialForm(false);
    setSocialForm({ plateforme: 'facebook', nom_compte: '', url: '' });
    loadData();
  };

  const handleConnectWhatsApp = async () => {
    const whatsappExists = reseaux.find(r => r.plateforme === 'whatsapp');
    
    if (whatsappExists) {
      toast.info('WhatsApp Business déjà connecté');
      return;
    }

    await base44.entities.ReseauSocial.create({
      plateforme: 'whatsapp',
      nom_compte: 'Imprimerie Ogooué Moanda',
      url: 'https://wa.me/message/7WVKSVB3RHOUA1',
      connecte: true,
      derniere_synchro: new Date().toISOString()
    });

    toast.success('WhatsApp Business connecté');
    loadData();
  };

  const handleRemoveSocial = async (reseau) => {
    if (confirm(`Êtes-vous sûr de vouloir déconnecter ${reseau.plateforme} ?`)) {
      await base44.entities.ReseauSocial.delete(reseau.id);
      toast.success('Réseau social déconnecté');
      loadData();
    }
  };

  const handleEditUser = (u) => {
    setEditingUser(u);
    setEditForm({
      full_name: u.full_name || '',
      role: u.role
    });
    setShowEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      await base44.entities.User.update(editingUser.id, {
        full_name: editForm.full_name,
        role: editForm.role
      });
      toast.success('Utilisateur modifié avec succès');
      setShowEditDialog(false);
      setEditingUser(null);
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la modification');
      console.error(e);
    }
  };

  const handleDeleteUser = async (u) => {
    if (u.id === user?.id) {
      toast.error('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer ${u.full_name || u.email} ?`)) {
      try {
        await base44.entities.User.delete(u.id);
        toast.success('Utilisateur supprimé');
        loadData();
      } catch (e) {
        toast.error('Erreur lors de la suppression');
        console.error(e);
      }
    }
  };

  const getSocialIcon = (plateforme) => {
    const icons = {
      facebook: <Facebook className="w-5 h-5" />,
      instagram: <Instagram className="w-5 h-5" />,
      whatsapp: <MessageCircle className="w-5 h-5" />,
      twitter: <Twitter className="w-5 h-5" />
    };
    return icons[plateforme] || <Share2 className="w-5 h-5" />;
  };

  const getSocialColor = (plateforme) => {
    const colors = {
      facebook: 'from-blue-500 to-blue-600',
      instagram: 'from-pink-500 to-purple-600',
      whatsapp: 'from-green-500 to-green-600',
      twitter: 'from-sky-500 to-blue-500'
    };
    return colors[plateforme] || 'from-slate-500 to-slate-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-slate-500">Configuration de l'application</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Réseaux sociaux
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Général
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Gestion des utilisateurs</h2>
              <p className="text-sm text-slate-500">Invitez des employés ou des clients</p>
            </div>
            <Button onClick={() => setShowInvite(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              <UserPlus className="w-4 h-4 mr-2" />
              Inviter
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid gap-4">
              {users.map(u => (
                <Card key={u.id} className="border-0 shadow-lg shadow-slate-200/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold ${
                          u.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}>
                          {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{u.full_name || u.email}</p>
                          <p className="text-sm text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {u.isClient ? (
                          <Badge className="bg-green-100 text-green-700">
                            <Shield className="w-3 h-3 mr-1" />
                            Client
                          </Badge>
                        ) : (
                          <Badge className={
                            u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 
                            u.role === 'manager' ? 'bg-blue-100 text-blue-700' : 
                            'bg-slate-100 text-slate-700'
                          }>
                            <Shield className="w-3 h-3 mr-1" />
                            {u.role === 'admin' ? 'Administrateur' : u.role === 'manager' ? 'Manager' : 'Employé'}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(u)}
                          className="text-slate-600 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.id === user?.id}
                          className="text-slate-600 hover:text-red-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Services de l'imprimerie</h2>
            <Button onClick={initializeServices} variant="outline">
              Initialiser les services par défaut
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map(service => (
              <Card key={service.id} className="border-0 shadow-lg shadow-slate-200/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-${service.couleur || 'blue'}-100 flex items-center justify-center`}>
                      <Building2 className={`w-5 h-5 text-${service.couleur || 'blue'}-600`} />
                    </div>
                    <div>
                      <p className="font-medium">{service.nom}</p>
                      <p className="text-sm text-slate-500">{service.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {services.length === 0 && (
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">Aucun service configuré</p>
                <Button onClick={initializeServices}>
                  Initialiser les services
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Social Networks Tab */}
        <TabsContent value="social" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Réseaux sociaux de l'imprimerie</h2>
              <p className="text-sm text-slate-500">Connectez vos réseaux sociaux pour recevoir les messages directement sur l'application</p>
            </div>
            <Button onClick={() => setShowSocialForm(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              Ajouter un réseau
            </Button>
          </div>

          {/* WhatsApp Business Quick Connect */}
          <Card className="border-0 shadow-lg shadow-green-200/50 bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white shadow-lg">
                    <MessageCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-slate-900">WhatsApp Business</p>
                    <p className="text-sm text-slate-600">Imprimerie Ogooué Moanda</p>
                    <p className="text-xs text-slate-500 mt-1">+241 060 44 46 34</p>
                  </div>
                </div>
                <div>
                  {reseaux.find(r => r.plateforme === 'whatsapp') ? (
                    <Badge className="bg-green-100 text-green-700">✓ Connecté</Badge>
                  ) : (
                    <Button 
                      onClick={handleConnectWhatsApp}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Connecter
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {reseaux.length === 0 ? (
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardContent className="py-12 text-center">
                <Share2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 mb-4">Aucun autre réseau social connecté</p>
                <p className="text-sm text-slate-400 mb-4">
                  Connectez vos réseaux sociaux pour centraliser tous vos messages clients
                </p>
                <Button onClick={() => setShowSocialForm(true)}>
                  Connecter un réseau
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reseaux.map(reseau => (
                <Card key={reseau.id} className="border-0 shadow-lg shadow-slate-200/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getSocialColor(reseau.plateforme)} flex items-center justify-center text-white`}>
                          {getSocialIcon(reseau.plateforme)}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{reseau.plateforme}</p>
                          <p className="text-sm text-slate-500">{reseau.nom_compte}</p>
                          <a href={reseau.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            Voir le profil
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-100 text-emerald-700">Connecté</Badge>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveSocial(reseau)} className="text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {reseau.derniere_synchro && (
                      <p className="text-xs text-slate-400 mt-2">
                        Dernière synchro: {moment(reseau.derniere_synchro).format('DD/MM/YYYY HH:mm')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card className="border-0 shadow-lg shadow-blue-200/50 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Centre de messages unifié</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Une fois connectés, tous les messages de vos réseaux sociaux apparaîtront dans la section Messagerie.
                    Vous pourrez répondre directement depuis l'application.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-4">
          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle>Informations de l'entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nom de l'entreprise</Label>
                  <Input value="Imprimerie OGOOUE" disabled />
                </div>
                <div>
                  <Label>Pays</Label>
                  <Input value="Gabon" disabled />
                </div>
                <div>
                  <Label>Ville</Label>
                  <Input value="Moanda" disabled />
                </div>
                <div className="md:col-span-2">
                  <Label>Adresse</Label>
                  <Input value="Carrefour Fina en face de FINAM" disabled />
                </div>
                <div>
                  <Label>Devise</Label>
                  <Input value="FCFA" disabled />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg shadow-slate-200/50">
            <CardHeader>
              <CardTitle>Paramètres des rapports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Verrouillage automatique des rapports</p>
                  <p className="text-sm text-slate-500">Les rapports soumis sont automatiquement verrouillés</p>
                </div>
                <Switch checked={true} disabled />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Approbation requise pour modification</p>
                  <p className="text-sm text-slate-500">Un administrateur doit approuver les demandes de modification</p>
                </div>
                <Switch checked={true} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inviter un utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Adresse email</Label>
              <Input 
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemple.com"
              />
            </div>
            {inviteRole === 'client' && (
              <div>
                <Label>Nom du client *</Label>
                <Input 
                  value={inviteNom}
                  onChange={(e) => setInviteNom(e.target.value)}
                  placeholder="Nom complet"
                  required
                />
              </div>
            )}
            <div>
              <Label>Rôle</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      Client
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      Administrateur
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Manager
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                      Employé/Opérateur
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1">
                {inviteRole === 'client'
                  ? '✅ Accès au portail client uniquement (commandes, catalogue, factures)'
                  : inviteRole === 'admin' 
                  ? 'Accès complet à toutes les fonctionnalités et paramètres'
                  : inviteRole === 'manager'
                  ? 'Accès aux rapports et gestion d\'équipe'
                  : 'Accès limité aux opérations quotidiennes (pointage, rapports)'}
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowInvite(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleInviteUser}
                disabled={!inviteEmail.trim() || (inviteRole === 'client' && !inviteNom.trim())}
              >
                <Mail className="w-4 h-4 mr-2" />
                Envoyer l'invitation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier l'utilisateur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom complet</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                placeholder="Nom complet"
              />
            </div>
            <div>
              <Label>Rôle</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      Administrateur
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      Manager
                    </div>
                  </SelectItem>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                      Employé/Opérateur
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600">
                <strong>Email:</strong> {editingUser?.email}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                L'email ne peut pas être modifié
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Annuler
              </Button>
              <Button onClick={handleUpdateUser}>
                <Edit className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Social Form Dialog */}
      <Dialog open={showSocialForm} onOpenChange={setShowSocialForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un réseau social</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plateforme</Label>
              <Select value={socialForm.plateforme} onValueChange={(v) => setSocialForm(prev => ({ ...prev, plateforme: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp Business</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom du compte / Page</Label>
              <Input
                value={socialForm.nom_compte}
                onChange={(e) => setSocialForm(prev => ({ ...prev, nom_compte: e.target.value }))}
                placeholder="Ex: Imprimerie Ogooué"
              />
            </div>
            <div>
              <Label>URL du profil / page</Label>
              <Input
                value={socialForm.url}
                onChange={(e) => setSocialForm(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Pour une intégration complète, vous devrez fournir les clés API de chaque plateforme.
                Contactez le support pour l'assistance technique.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowSocialForm(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddSocial}>
                <Share2 className="w-4 h-4 mr-2" />
                Connecter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}