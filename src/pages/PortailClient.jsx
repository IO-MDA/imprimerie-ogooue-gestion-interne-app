import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  ShoppingBag, 
  FileText, 
  Plus,
  Package,
  Search,
  Image as ImageIcon,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle2,
  Eye,
  Download,
  MessageSquare,
  Truck
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import moment from 'moment';
import { formatMontant } from '@/components/utils/formatMontant.jsx';
import ClientHeader from '@/components/client/ClientHeader';
import BottomNav from '@/components/client/BottomNav';
import WhatsAppButton from '@/components/client/WhatsAppButton';
import DemandeForm from '@/components/client/DemandeForm';
import TimelineStatut from '@/components/client/TimelineStatut';
import ClientFooter from '@/components/client/ClientFooter';
import ChatbotIA from '@/components/client/ChatbotIA';

export default function PortailClient() {
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  const [projets, setProjets] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDemandeForm, setShowDemandeForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentDialog, setShowDocumentDialog] = useState(false);
  const [produitsCatalogue, setProduitsCatalogue] = useState([]);
  const [catalogueSearch, setCatalogueSearch] = useState('');
  const [selectedProduit, setSelectedProduit] = useState(null);
  const [commandes, setCommandes] = useState([]);
  const [tarifsClients, setTarifsClients] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [activeTab, setActiveTab] = useState('accueil');
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [profileForm, setProfileForm] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    type: 'particulier'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      setProfileForm({
        nom: userData?.full_name || '',
        email: userData?.email || '',
        telephone: '',
        adresse: '',
        type: 'particulier'
      });

      // Find client by user_id (priorité) ou email (fallback)
      let clients = await base44.entities.Client.filter({ user_id: userData.id });
      if (clients.length === 0) {
        // Fallback: chercher par email pour migration
        clients = await base44.entities.Client.filter({ email: userData.email });
        // Si trouvé, mettre à jour avec user_id
        if (clients.length > 0) {
          await base44.entities.Client.update(clients[0].id, { user_id: userData.id });
        }
      }
      const clientData = clients[0];
      setClient(clientData);

      if (clientData) {
        // Load all related data
        const [devisData, facturesData, projetsData, catalogueData, commandesData, tarifsData, demandesData] = await Promise.all([
          base44.entities.Devis.filter({ client_id: clientData.id }),
          base44.entities.Facture.filter({ client_id: clientData.id }),
          base44.entities.Projet.filter({ client_id: clientData.id }),
          base44.entities.ProduitCatalogue.filter({ actif: true, visible_clients: true }),
          base44.entities.Commande.filter({ client_id: clientData.id }),
          base44.entities.TarifsClients.filter({ client_id: clientData.id }),
          base44.entities.DemandeClient.filter({ client_id: clientData.id })
        ]);

        setDevis(devisData);
        setFactures(facturesData);
        setProjets(projetsData);
        setProduitsCatalogue(catalogueData);
        setCommandes(commandesData);
        setTarifsClients(tarifsData);
        setDemandes(demandesData);
      }
    } catch (e) {
      console.error('Error loading data:', e);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (statut) => {
    const colors = {
      'brouillon': 'bg-slate-100 text-slate-700',
      'envoye': 'bg-blue-100 text-blue-700',
      'approuve': 'bg-green-100 text-green-700',
      'refuse': 'bg-red-100 text-red-700',
      'en_attente': 'bg-amber-100 text-amber-700',
      'payee': 'bg-emerald-100 text-emerald-700',
      'en_cours': 'bg-blue-100 text-blue-700',
      'termine': 'bg-green-100 text-green-700'
    };
    return colors[statut] || 'bg-slate-100 text-slate-700';
  };

  const getStatutCommandeConfig = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', icon: Clock, color: 'bg-slate-100 text-slate-700' },
      'en_preparation': { label: 'En préparation', icon: Package, color: 'bg-blue-100 text-blue-700' },
      'prete': { label: 'Prête', icon: CheckCircle2, color: 'bg-purple-100 text-purple-700' },
      'expediee': { label: 'Expédiée', icon: Truck, color: 'bg-amber-100 text-amber-700' },
      'livree': { label: 'Livrée', icon: MapPin, color: 'bg-emerald-100 text-emerald-700' }
    };
    return configs[statut] || configs['en_attente'];
  };

  const viewDocument = (doc) => {
    setSelectedDocument(doc);
    setShowDocumentDialog(true);
  };

  const downloadDocument = async (doc, type) => {
    toast.info('Génération du PDF...');
    // PDF generation would be handled here
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleCreateProfile = async (profileData) => {
    try {
      const newClient = await base44.entities.Client.create({
        user_id: user.id,
        nom: profileData.nom,
        email: profileData.email || user.email,
        telephone: profileData.telephone,
        adresse: profileData.adresse,
        type: profileData.type || 'particulier'
      });
      setClient(newClient);
      toast.success('Profil client créé avec succès');
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la création du profil');
    }
  };

  if (!client) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <Card className="border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="text-center">
              <Package className="w-12 h-12 mx-auto mb-3" />
              Créez votre profil client
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-slate-600 mb-6 text-center">
              Bienvenue à l'Imprimerie OGOOUE ! Créez votre profil pour commencer à passer des commandes, suivre vos commandes et accéder à notre catalogue de services et produits complets avec les meilleurs prix de Moanda.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nom complet *</label>
                <Input
                  value={profileForm.nom}
                  onChange={(e) => setProfileForm({...profileForm, nom: e.target.value})}
                  placeholder="Votre nom ou raison sociale"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <Input
                  type="email"
                  value={profileForm.email || user?.email || ''}
                  onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                  placeholder="votre.email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Téléphone *</label>
                <Input
                  value={profileForm.telephone}
                  onChange={(e) => setProfileForm({...profileForm, telephone: e.target.value})}
                  placeholder="+241 XX XX XX XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Adresse</label>
                <Input
                  value={profileForm.adresse}
                  onChange={(e) => setProfileForm({...profileForm, adresse: e.target.value})}
                  placeholder="Votre adresse à Moanda"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Type de client</label>
                <select
                  value={profileForm.type}
                  onChange={(e) => setProfileForm({...profileForm, type: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="particulier">Particulier</option>
                  <option value="entreprise">Entreprise</option>
                </select>
              </div>

              <Button
                onClick={() => handleCreateProfile(profileForm)}
                disabled={!profileForm.nom || !profileForm.email || !profileForm.telephone}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Créer mon profil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCommandes = devis.filter(d => d.statut === 'approuve').length;
  const facturesImpayees = factures.filter(f => f.statut !== 'payee').length;
  const projetsActifs = projets.filter(p => p.statut === 'en_cours').length;

  const getPrixClient = (produit) => {
    const tarif = tarifsClients.find(t => t.produit_id === produit.id);
    
    if (tarif) {
      if (tarif.prix_client) return tarif.prix_client;
      if (tarif.remise_pct) return produit.prix_unitaire * (1 - tarif.remise_pct / 100);
    }
    
    if (client?.remise_globale_pct) {
      return produit.prix_unitaire * (1 - client.remise_globale_pct / 100);
    }
    
    return produit.prix_unitaire;
  };

  // Filter catalogue
  const filteredCatalogue = produitsCatalogue.filter(p => {
    if (!catalogueSearch) return true;
    const search = catalogueSearch.toLowerCase();
    return p.nom?.toLowerCase().includes(search) ||
           p.description_courte?.toLowerCase().includes(search) ||
           p.categorie?.toLowerCase().includes(search);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pb-20 md:pb-6">
      {/* Header */}
      <ClientHeader 
        client={client} 
        notifications={demandes.filter(d => d.statut === 'repondu').length + facturesImpayees}
      />

      {/* WhatsApp Button */}
      <WhatsAppButton />

      {/* Chatbot IA */}
      <ChatbotIA 
        client={client}
        commandes={commandes}
        demandes={demandes}
        factures={factures}
      />

      {/* Content */}
      <div className="container mx-auto px-4 py-6 space-y-6">
        {activeTab === 'accueil' && (
          <>
            {/* Welcome Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
              <CardContent className="p-6 relative z-10">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Bienvenue, {client.nom} 👋
                </h1>
                <p className="text-blue-100 mb-4 text-sm md:text-base">
                  Suivez vos commandes en temps réel et gérez vos demandes facilement
                </p>
                <Button
                  onClick={() => setShowDemandeForm(true)}
                  className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-medium"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle demande
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Commandes</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{totalCommandes}</p>
                    <p className="text-xs text-slate-400 mt-1">En cours</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <ShoppingBag className="w-7 h-7 text-white" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Factures</p>
                    <p className="text-3xl font-bold text-amber-600 mt-1">{facturesImpayees}</p>
                    <p className="text-xs text-slate-400 mt-1">En attente</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Projets</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">{projetsActifs}</p>
                    <p className="text-xs text-slate-400 mt-1">Actifs</p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
                    <Package className="w-7 h-7 text-white" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Contact Info */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">Besoin d'aide ?</h3>
                </div>
                <div className="space-y-3">
                  <a href="tel:+241060444634" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Appelez-nous</p>
                      <p className="font-medium text-slate-900">+241 060 44 46 34</p>
                    </div>
                  </a>
                  <a href="mailto:imprimerieogooue@gmail.com" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Envoyez un email</p>
                      <p className="font-medium text-slate-900 text-sm">imprimerieogooue@gmail.com</p>
                    </div>
                  </a>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Notre adresse</p>
                      <p className="font-medium text-slate-900 text-sm">Carrefour Fina, Moanda 🇬🇦</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {activeTab === 'commandes' && (
          <div className="space-y-4">
          {commandes.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucune commande pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            commandes.map(cmd => (
              <Card key={cmd.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{cmd.reference_commande}</h3>
                        <Badge className={
                          cmd.statut === 'livree' ? 'bg-green-100 text-green-700' :
                          cmd.statut === 'prete' ? 'bg-emerald-100 text-emerald-700' :
                          cmd.statut === 'en_production' ? 'bg-purple-100 text-purple-700' :
                          cmd.statut === 'confirmee' ? 'bg-blue-100 text-blue-700' :
                          cmd.statut === 'annulee' ? 'bg-rose-100 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }>
                          {cmd.statut}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{cmd.type_prestation}</p>
                      <p className="text-xs text-slate-400">
                        Commandé le {moment(cmd.date_commande).format('DD/MM/YYYY')}
                      </p>
                      {cmd.date_livraison_prevue && (
                        <p className="text-xs text-blue-600 mt-1">
                          📅 Livraison prévue: {moment(cmd.date_livraison_prevue).format('DD/MM/YYYY')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Total</p>
                      <p className="text-lg font-bold text-slate-900">{formatMontant(cmd.montant_total)} F</p>
                      {cmd.reste_a_payer > 0 && (
                        <p className="text-xs text-amber-600">Reste: {formatMontant(cmd.reste_a_payer)} F</p>
                      )}
                    </div>
                  </div>

                  {cmd.commentaire_client && (
                    <div className="p-3 bg-blue-50 rounded-lg mb-3">
                      <p className="text-sm text-slate-700">{cmd.commentaire_client}</p>
                    </div>
                  )}

                  {cmd.historique_statuts && cmd.historique_statuts.length > 0 && (
                    <div className="border-t pt-3">
                      <HistoriqueCommande commande={cmd} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
        )}

        {activeTab === 'catalogue' && (
          <div className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher un produit..."
                    value={catalogueSearch}
                    onChange={(e) => {
                      setCatalogueSearch(e.target.value);
                      setSelectedProduit(null);
                    }}
                    className="pl-10"
                  />
                </div>
                <Button 
                  onClick={() => setShowCatalogueGenerator(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Mon catalogue PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions IA si produit sélectionné */}
          {selectedProduit && catalogueSearch && (
            <SuggestionsIA 
              produitActuel={selectedProduit}
              tousLesProduits={produitsCatalogue}
              clientId={client?.id}
            />
          )}

          {filteredCatalogue.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun produit trouvé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredCatalogue.map(produit => (
                <Card key={produit.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-4">
                    {produit.photos && produit.photos.length > 0 ? (
                      <img
                        src={produit.photos[0]}
                        alt={produit.nom}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                      />
                    ) : (
                      <div className="w-full h-40 bg-slate-100 rounded-lg mb-3 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-slate-300" />
                      </div>
                    )}
                    
                    <Badge className="mb-2 bg-blue-100 text-blue-700">
                      {produit.categorie}
                    </Badge>
                    
                    <h3 className="font-semibold text-slate-900 mb-2">{produit.nom}</h3>
                    
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {produit.description_courte}
                    </p>
                    
                    <div className="flex items-baseline gap-2 mb-3">
                      <p className="text-lg font-bold text-blue-600">
                        {formatMontant(getPrixClient(produit))} F
                      </p>
                      {produit.prix_a_partir_de && (
                        <span className="text-xs text-slate-500">à partir de</span>
                      )}
                      {getPrixClient(produit) < produit.prix_unitaire && (
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                          Prix spécial
                        </Badge>
                      )}
                    </div>
                    
                    {produit.delai_estime && (
                      <p className="text-xs text-slate-500 mb-3">
                        ⏱ Délai: {produit.delai_estime}
                      </p>
                    )}
                    
                    <Button
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                      onClick={() => {
                        setSelectedProduit(produit);
                        setShowDemandeForm(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Demander un devis
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          </div>
        )}

        {activeTab === 'demandes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Mes demandes</h2>
              <Button onClick={() => setShowDemandeForm(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle
              </Button>
            </div>

            {demandes.length === 0 ? (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-16 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Aucune demande pour le moment</p>
                  <Button
                    onClick={() => setShowDemandeForm(true)}
                    className="mt-4 bg-blue-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Créer une demande
                  </Button>
                </CardContent>
              </Card>
            ) : (
              demandes.map(demande => (
                <Card
                  key={demande.id}
                  className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setSelectedDemande(demande)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{demande.titre}</h3>
                          <Badge className={
                            demande.statut === 'termine' ? 'bg-green-100 text-green-700' :
                            demande.statut === 'repondu' ? 'bg-emerald-100 text-emerald-700' :
                            demande.statut === 'en_production' ? 'bg-purple-100 text-purple-700' :
                            demande.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }>
                            {demande.statut.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">{demande.description}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      {moment(demande.created_date).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'devis' && (
          <div className="space-y-4">
          {devis.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun devis pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            devis.map(d => (
              <Card key={d.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">
                          Devis #{d.numero}
                        </h3>
                        <Badge className={getStatusColor(d.statut)}>
                          {d.statut}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        Date: {moment(d.date).format('DD/MM/YYYY')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <div className="text-sm text-slate-500">
                          {d.lignes?.length || 0} article(s)
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          Total: {formatMontant(d.total || 0)} F
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewDocument(d)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadDocument(d, 'devis')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          </div>
        )}

        {activeTab === 'factures' && (
          <div className="space-y-4">
          {factures.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucune facture pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            factures.map(f => {
              const estimation = estimations[f.id];
              const isLoading = loadingEstimation[f.id];

              return (
                <Card key={f.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">
                            Facture #{f.numero}
                          </h3>
                          <Badge className={getStatusColor(f.statut)}>
                            {f.statut === 'payee' ? 'Payée' : f.statut}
                          </Badge>
                          {f.statut_commande && (
                            <Badge className={getStatutCommandeConfig(f.statut_commande).color}>
                              {getStatutCommandeConfig(f.statut_commande).label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-3">
                          Date: {moment(f.date).format('DD/MM/YYYY')}
                          {f.date_echeance && (
                            <span className="ml-2">
                              • Échéance: {moment(f.date_echeance).format('DD/MM/YYYY')}
                            </span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <div className="text-sm text-slate-500">
                            {f.lignes?.length || 0} article(s)
                          </div>
                          <div className="text-sm font-semibold text-slate-900">
                            Total: {formatMontant(f.total || 0)} F
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewDocument(f)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadDocument(f, 'facture')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Estimation de délai IA */}
                    {f.statut_commande && f.statut_commande !== 'livree' && f.statut_commande !== 'annulee' && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                        {!estimation && !isLoading && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => chargerEstimation(f.id)}
                            className="text-blue-600 border-blue-200"
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Estimer le délai de livraison
                          </Button>
                        )}

                        {isLoading && (
                          <div className="flex items-center gap-2 text-blue-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            <span className="text-sm">Analyse en cours...</span>
                          </div>
                        )}

                        {estimation && (
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-slate-900 mb-1">
                                  📦 Livraison estimée : {moment(estimation.date_livraison_estimee).format('DD/MM/YYYY')}
                                </p>
                                <p className="text-sm text-slate-600">
                                  Délai estimé : {estimation.delai_jours} jour{estimation.delai_jours > 1 ? 's' : ''}
                                </p>
                              </div>
                              <Badge className={
                                estimation.niveau_confiance === 'haute' ? 'bg-emerald-100 text-emerald-700' :
                                estimation.niveau_confiance === 'moyenne' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-700'
                              }>
                                Confiance {estimation.niveau_confiance}
                              </Badge>
                            </div>

                            {estimation.conseil_client && (
                              <p className="text-sm text-blue-700 italic">
                                💡 {estimation.conseil_client}
                              </p>
                            )}

                            {estimation.etapes && estimation.etapes.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-slate-600">Étapes estimées :</p>
                                {estimation.etapes.map((etape, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                    <span>{etape.nom} ({etape.delai_jours}j)</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
          </div>
        )}

        {activeTab === 'projets' && (
          <div className="space-y-4">
          {projets.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun projet pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            projets.map(p => (
              <Card key={p.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">{p.nom}</h3>
                        <Badge className={getStatusColor(p.statut)}>
                          {p.statut === 'en_cours' ? 'En cours' : 
                           p.statut === 'termine' ? 'Terminé' : p.statut}
                        </Badge>
                      </div>
                      {p.description && (
                        <p className="text-sm text-slate-600 mb-3">{p.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        {p.date_debut && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            Début: {moment(p.date_debut).format('DD/MM/YYYY')}
                          </span>
                        )}
                        {p.date_fin_prevue && (
                          <span>
                            Fin prévue: {moment(p.date_fin_prevue).format('DD/MM/YYYY')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Progression</span>
                      <span className="font-medium text-slate-900">{p.progression || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all"
                        style={{ width: `${p.progression || 0}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        badges={{
          demandes: demandes.filter(d => d.statut === 'nouveau' || d.statut === 'en_cours').length,
          commandes: commandes.filter(c => c.statut !== 'livree' && c.statut !== 'annulee').length,
          factures: facturesImpayees
        }}
      />

      {/* Demande Form Dialog */}
      <Dialog open={showDemandeForm} onOpenChange={setShowDemandeForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle demande</DialogTitle>
          </DialogHeader>
          <DemandeForm
            client={client}
            onSuccess={() => {
              setShowDemandeForm(false);
              loadData();
            }}
            onCancel={() => setShowDemandeForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Demande Detail Dialog */}
      <Dialog open={!!selectedDemande} onOpenChange={() => setSelectedDemande(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedDemande?.titre}</DialogTitle>
          </DialogHeader>
          {selectedDemande && (
            <div className="space-y-4">
              <div>
                <Badge className={
                  selectedDemande.statut === 'termine' ? 'bg-green-100 text-green-700' :
                  selectedDemande.statut === 'repondu' ? 'bg-emerald-100 text-emerald-700' :
                  selectedDemande.statut === 'en_production' ? 'bg-purple-100 text-purple-700' :
                  selectedDemande.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-700'
                }>
                  {selectedDemande.statut.replace('_', ' ')}
                </Badge>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Description</h4>
                <p className="text-slate-600">{selectedDemande.description}</p>
              </div>

              {selectedDemande.fichiers && selectedDemande.fichiers.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Fichiers joints</h4>
                  <div className="space-y-2">
                    {selectedDemande.fichiers.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded hover:bg-slate-100"
                      >
                        <FileText className="w-4 h-4 text-slate-500" />
                        <span className="text-sm text-slate-700">Fichier {index + 1}</span>
                        <Download className="w-4 h-4 text-slate-400 ml-auto" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedDemande.reponse_admin && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2 text-blue-900">Réponse</h4>
                  <p className="text-slate-700">{selectedDemande.reponse_admin}</p>
                </div>
              )}

              {selectedDemande.historique_statuts && selectedDemande.historique_statuts.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Suivi</h4>
                  <TimelineStatut
                    historique={selectedDemande.historique_statuts}
                    statutActuel={selectedDemande.statut}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Document View Dialog */}
      <Dialog open={showDocumentDialog} onOpenChange={setShowDocumentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDocument?.numero}
            </DialogTitle>
          </DialogHeader>
          {selectedDocument && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Date</p>
                  <p className="font-medium">{moment(selectedDocument.date).format('DD/MM/YYYY')}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="font-medium">{formatMontant(selectedDocument.total || 0)} F</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Articles</h4>
                <div className="space-y-2">
                  {selectedDocument.lignes?.map((ligne, index) => (
                    <div key={index} className="flex justify-between p-3 bg-slate-50 rounded">
                      <div>
                        <p className="font-medium">{ligne.designation}</p>
                        <p className="text-sm text-slate-500">
                          {ligne.quantite} x {formatMontant(ligne.prix_unitaire)} F
                        </p>
                      </div>
                      <p className="font-semibold">{formatMontant(ligne.montant)} F</p>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDocument.historique_statuts && (
                <div className="border-t pt-4">
                  <HistoriqueCommande commande={selectedDocument} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}