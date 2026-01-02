import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  Package, 
  Eye, 
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  Truck
} from 'lucide-react';
import CommandeForm from '@/components/commandes/CommandeForm';
import CommandeDetail from '@/components/commandes/CommandeDetail';
import moment from 'moment';
import { toast } from 'sonner';
import { formatMontant } from '@/components/utils/formatMontant.jsx';

export default function Commandes() {
  const [commandes, setCommandes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [client, setClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCommande, setEditingCommande] = useState(null);
  const [selectedCommande, setSelectedCommande] = useState(null);
  const [filterStatut, setFilterStatut] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);
      
      let commandesData;
      if (userData.role === 'admin' || userData.role === 'manager') {
        commandesData = await base44.entities.Commande.list('-date_commande');
      } else {
        const clients = await base44.entities.Client.filter({ user_id: userData.id });
        if (clients.length > 0) {
          setClient(clients[0]);
          commandesData = await base44.entities.Commande.filter({ client_id: clients[0].id }, '-date_commande');
        } else {
          commandesData = [];
        }
      }
      
      setCommandes(commandesData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      const resteAPayer = (data.montant_total || 0) - (data.acompte || 0);
      
      if (editingCommande) {
        await base44.entities.Commande.update(editingCommande.id, { ...data, reste_a_payer: resteAPayer });
        toast.success('Commande mise à jour');
      } else {
        const reference = `CMD-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        await base44.entities.Commande.create({ 
          ...data, 
          reference_commande: reference,
          reste_a_payer: resteAPayer
        });
        toast.success('Commande créée');
      }
      setShowForm(false);
      setEditingCommande(null);
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const getStatutBadge = (statut) => {
    const configs = {
      'brouillon': { label: 'Brouillon', icon: Clock, class: 'bg-slate-100 text-slate-700' },
      'confirmee': { label: 'Confirmée', icon: CheckCircle, class: 'bg-blue-100 text-blue-700' },
      'en_production': { label: 'En production', icon: Package, class: 'bg-purple-100 text-purple-700' },
      'prete': { label: 'Prête', icon: CheckCircle, class: 'bg-emerald-100 text-emerald-700' },
      'livree': { label: 'Livrée', icon: Truck, class: 'bg-green-100 text-green-700' },
      'annulee': { label: 'Annulée', icon: XCircle, class: 'bg-rose-100 text-rose-700' }
    };
    const config = configs[statut] || configs['brouillon'];
    const Icon = config.icon;
    return (
      <Badge className={config.class}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const filteredCommandes = commandes.filter(c => {
    const matchSearch = c.reference_commande?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       c.client_nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       c.type_prestation?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatut = filterStatut === 'all' || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const stats = {
    total: commandes.length,
    confirmees: commandes.filter(c => c.statut === 'confirmee' || c.statut === 'en_production').length,
    pretes: commandes.filter(c => c.statut === 'prete').length,
    livrees: commandes.filter(c => c.statut === 'livree').length
  };

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
          <h1 className="text-2xl font-bold text-slate-900">
            {isAdmin ? 'Gestion des commandes' : 'Mes commandes'}
          </h1>
          <p className="text-slate-500">
            {isAdmin ? 'Gérez toutes les commandes clients' : 'Suivez vos commandes et livraisons'}
          </p>
        </div>
        {isAdmin && (
          <Button 
            onClick={() => { setEditingCommande(null); setShowForm(true); }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle commande
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">En cours</p>
                <p className="text-xl font-bold text-slate-900">{stats.confirmees}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Prêtes</p>
                <p className="text-xl font-bold text-slate-900">{stats.pretes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Livrées</p>
                <p className="text-xl font-bold text-slate-900">{stats.livrees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Rechercher par référence, client ou prestation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filterStatut} onValueChange={setFilterStatut} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Toutes</TabsTrigger>
            <TabsTrigger value="confirmee">En cours</TabsTrigger>
            <TabsTrigger value="prete">Prêtes</TabsTrigger>
            <TabsTrigger value="livree">Livrées</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4">
        {filteredCommandes.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-16 text-center">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune commande trouvée</p>
            </CardContent>
          </Card>
        ) : (
          filteredCommandes.map(commande => (
            <Card key={commande.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-slate-900">{commande.reference_commande}</h3>
                        {getStatutBadge(commande.statut)}
                      </div>
                      {isAdmin && (
                        <p className="text-sm text-slate-600">Client: {commande.client_nom}</p>
                      )}
                      <p className="text-sm text-slate-600">{commande.type_prestation}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Commandé le {moment(commande.date_commande).format('DD/MM/YYYY')}
                      </p>
                      {commande.date_livraison_prevue && (
                        <p className="text-xs text-blue-600">
                          Livraison prévue: {moment(commande.date_livraison_prevue).format('DD/MM/YYYY')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Montant</p>
                      <p className="font-bold text-slate-900">{formatMontant(commande.montant_total)} F</p>
                      {commande.reste_a_payer > 0 && (
                        <p className="text-xs text-amber-600">Reste: {formatMontant(commande.reste_a_payer)} F</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSelectedCommande(commande)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {isAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => { setEditingCommande(commande); setShowForm(true); }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCommande ? 'Modifier la commande' : 'Nouvelle commande'}
            </DialogTitle>
          </DialogHeader>
          <CommandeForm
            commande={editingCommande}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingCommande(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedCommande} onOpenChange={() => setSelectedCommande(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détail de la commande</DialogTitle>
          </DialogHeader>
          {selectedCommande && (
            <CommandeDetail 
              commande={selectedCommande}
              isAdmin={isAdmin}
              onUpdate={loadData}
              onClose={() => setSelectedCommande(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}