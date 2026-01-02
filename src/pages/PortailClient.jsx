import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  ShoppingBag, 
  FileText, 
  MessageSquare,
  Download,
  Eye,
  Plus,
  Package,
  Clock,
  CheckCircle2,
  Search,
  Image as ImageIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from 'sonner';
import DemandeClientForm from '@/components/portail/DemandeClientForm';
import moment from 'moment';

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
  const [profileForm, setProfileForm] = useState({
    nom: '',
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
        telephone: '',
        adresse: '',
        type: 'particulier'
      });

      // Find client by email
      const clients = await base44.entities.Client.filter({ email: userData.email });
      const clientData = clients[0];
      setClient(clientData);

      if (clientData) {
        // Load all related data
        const [devisData, facturesData, projetsData, conversationsData, catalogueData] = await Promise.all([
          base44.entities.Devis.filter({ client_id: clientData.id }),
          base44.entities.Facture.filter({ client_id: clientData.id }),
          base44.entities.Projet.filter({ client_id: clientData.id }),
          base44.entities.ConversationClient.filter({ client_id: clientData.id }),
          base44.entities.ProduitCatalogue.filter({ actif: true, visible_clients: true })
        ]);

        setDevis(devisData);
        setFactures(facturesData);
        setProjets(projetsData);
        setConversations(conversationsData);
        setProduitsCatalogue(catalogueData);
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
        nom: profileData.nom,
        email: user.email,
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
              Bienvenue à l'Imprimerie OGOOUE ! Créez votre profil pour commencer à passer des commandes.
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
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input value={user?.email} disabled className="bg-slate-100" />
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
                disabled={!profileForm.nom || !profileForm.telephone}
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

  // Filter catalogue
  const filteredCatalogue = produitsCatalogue.filter(p => {
    if (!catalogueSearch) return true;
    const search = catalogueSearch.toLowerCase();
    return p.nom?.toLowerCase().includes(search) ||
           p.description_courte?.toLowerCase().includes(search) ||
           p.categorie?.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bienvenue, {client.nom} 👋
            </h1>
            <p className="text-blue-100">
              Suivez vos commandes et gérez vos demandes en toute simplicité
            </p>
          </div>
          <Button
            onClick={() => setShowDemandeForm(true)}
            className="bg-white text-blue-600 hover:bg-blue-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle demande
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Commandes en cours</p>
                <p className="text-3xl font-bold text-blue-600">{totalCommandes}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Factures en attente</p>
                <p className="text-3xl font-bold text-amber-600">{facturesImpayees}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Projets actifs</p>
                <p className="text-3xl font-bold text-emerald-600">{projetsActifs}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="catalogue" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
          <TabsTrigger value="devis">Devis</TabsTrigger>
          <TabsTrigger value="factures">Factures</TabsTrigger>
          <TabsTrigger value="projets">Projets</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        {/* Catalogue Tab */}
        <TabsContent value="catalogue" className="space-y-4">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher un produit..."
                  value={catalogueSearch}
                  onChange={(e) => setCatalogueSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {filteredCatalogue.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun produit trouvé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        {produit.prix_unitaire.toLocaleString()} FCFA
                      </p>
                      {produit.prix_a_partir_de && (
                        <span className="text-xs text-slate-500">à partir de</span>
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
        </TabsContent>

        {/* Devis Tab */}
        <TabsContent value="devis" className="space-y-4">
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
                          Total: {(d.total || 0).toLocaleString()} FCFA
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
        </TabsContent>

        {/* Factures Tab */}
        <TabsContent value="factures" className="space-y-4">
          {factures.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucune facture pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            factures.map(f => (
              <Card key={f.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">
                          Facture #{f.numero}
                        </h3>
                        <Badge className={getStatusColor(f.statut)}>
                          {f.statut === 'payee' ? 'Payée' : f.statut}
                        </Badge>
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
                          Total: {(f.total || 0).toLocaleString()} FCFA
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
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Projets Tab */}
        <TabsContent value="projets" className="space-y-4">
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
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          {conversations.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucune conversation pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            conversations.map(c => (
              <Card key={c.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-slate-900">
                          {c.intention_detectee || 'Conversation'}
                        </h3>
                        <Badge className={getStatusColor(c.statut)}>
                          {c.statut}
                        </Badge>
                        {c.non_lu && (
                          <Badge className="bg-red-500 text-white">Nouveau</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {c.dernier_message}
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {moment(c.dernier_message_date).fromNow()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Demande Form Dialog */}
      <Dialog open={showDemandeForm} onOpenChange={setShowDemandeForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle demande</DialogTitle>
          </DialogHeader>
          <DemandeClientForm
            client={client}
            onSuccess={() => {
              setShowDemandeForm(false);
              loadData();
            }}
            onCancel={() => setShowDemandeForm(false)}
          />
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
                  <p className="font-medium">{(selectedDocument.total || 0).toLocaleString()} FCFA</p>
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
                          {ligne.quantite} x {ligne.prix_unitaire?.toLocaleString()} FCFA
                        </p>
                      </div>
                      <p className="font-semibold">{ligne.montant?.toLocaleString()} FCFA</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}