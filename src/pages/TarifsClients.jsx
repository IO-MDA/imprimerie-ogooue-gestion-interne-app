import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import RoleProtection from '@/components/auth/RoleProtection';
import { toast } from 'sonner';
import { formatMontant } from '@/components/utils/formatMontant.jsx';

export default function TarifsClients() {
  const [user, setUser] = useState(null);
  const [clients, setClients] = useState([]);
  const [produits, setProduits] = useState([]);
  const [tarifs, setTarifs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTarif, setEditingTarif] = useState(null);
  const [selectedClient, setSelectedClient] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    client_id: '',
    produit_id: '',
    prix_client: null,
    remise_pct: null,
    prix_minimum: null,
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const userData = await base44.auth.me();
      setUser(userData);

      const [clientsData, produitsData, tarifsData] = await Promise.all([
        base44.entities.Client.list(),
        base44.entities.ProduitCatalogue.list(),
        base44.entities.TarifsClients.list()
      ]);

      setClients(clientsData);
      setProduits(produitsData);
      setTarifs(tarifsData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const client = clients.find(c => c.id === formData.client_id);
      const produit = produits.find(p => p.id === formData.produit_id);

      const data = {
        ...formData,
        client_nom: client?.nom,
        produit_nom: produit?.nom,
        prix_client: formData.prix_client || null,
        remise_pct: formData.remise_pct || null,
        prix_minimum: formData.prix_minimum || null
      };

      if (editingTarif) {
        await base44.entities.TarifsClients.update(editingTarif.id, data);
        toast.success('Tarif mis à jour');
      } else {
        await base44.entities.TarifsClients.create(data);
        toast.success('Tarif créé');
      }

      setShowForm(false);
      setEditingTarif(null);
      setFormData({ client_id: '', produit_id: '', prix_client: null, remise_pct: null, prix_minimum: null, notes: '' });
      loadData();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (tarifId) => {
    if (!confirm('Supprimer ce tarif personnalisé ?')) return;
    try {
      await base44.entities.TarifsClients.delete(tarifId);
      toast.success('Tarif supprimé');
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getPrixFinal = (produit, clientId) => {
    const tarif = tarifs.find(t => t.client_id === clientId && t.produit_id === produit.id);
    const client = clients.find(c => c.id === clientId);

    if (tarif) {
      if (tarif.prix_client) return tarif.prix_client;
      if (tarif.remise_pct) return produit.prix_unitaire * (1 - tarif.remise_pct / 100);
    }

    if (client?.remise_globale_pct) {
      return produit.prix_unitaire * (1 - client.remise_globale_pct / 100);
    }

    return produit.prix_unitaire;
  };

  const filteredTarifs = tarifs.filter(t => {
    const matchClient = selectedClient === 'all' || t.client_id === selectedClient;
    const matchSearch = t.client_nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       t.produit_nom?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchClient && matchSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <RoleProtection allowedRoles={['admin']} user={user}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Tarifs Clients</h1>
            <p className="text-slate-500">Gérez les prix personnalisés par client</p>
          </div>
          <Button onClick={() => { setEditingTarif(null); setShowForm(true); }} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau tarif
          </Button>
        </div>

        <div className="flex gap-4">
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les clients</SelectItem>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid gap-4">
          {filteredTarifs.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-slate-500">Aucun tarif personnalisé</p>
              </CardContent>
            </Card>
          ) : (
            filteredTarifs.map(tarif => {
              const produit = produits.find(p => p.id === tarif.produit_id);
              return (
                <Card key={tarif.id} className="border-0 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{tarif.client_nom}</h3>
                          <span className="text-slate-400">→</span>
                          <span className="text-slate-700">{tarif.produit_nom}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-500">
                            Prix public: <span className="font-medium">{formatMontant(produit?.prix_unitaire || 0)} F</span>
                          </span>
                          {tarif.prix_client ? (
                            <Badge className="bg-blue-100 text-blue-700">
                              Prix fixe: {formatMontant(tarif.prix_client)} F
                            </Badge>
                          ) : tarif.remise_pct ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              Remise: -{tarif.remise_pct}%
                            </Badge>
                          ) : null}
                          <span className="text-slate-900 font-bold">
                            → {formatMontant(getPrixFinal(produit, tarif.client_id))} F
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingTarif(tarif); setFormData(tarif); setShowForm(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(tarif.id)}>
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTarif ? 'Modifier' : 'Nouveau'} tarif personnalisé</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Client *</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData({...formData, client_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Produit *</Label>
                <Select value={formData.produit_id} onValueChange={(v) => setFormData({...formData, produit_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un produit" />
                  </SelectTrigger>
                  <SelectContent>
                    {produits.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nom} ({formatMontant(p.prix_unitaire)} F)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Prix fixe client (FCFA)</Label>
                <Input
                  type="number"
                  value={formData.prix_client || ''}
                  onChange={(e) => setFormData({...formData, prix_client: e.target.value ? parseFloat(e.target.value) : null})}
                  placeholder="Laisser vide si remise"
                />
              </div>

              <div>
                <Label>OU Remise (%)</Label>
                <Input
                  type="number"
                  value={formData.remise_pct || ''}
                  onChange={(e) => setFormData({...formData, remise_pct: e.target.value ? parseFloat(e.target.value) : null})}
                  placeholder="Ex: 10 pour -10%"
                />
              </div>

              <div>
                <Label>Prix minimum (FCFA)</Label>
                <Input
                  type="number"
                  value={formData.prix_minimum || ''}
                  onChange={(e) => setFormData({...formData, prix_minimum: e.target.value ? parseFloat(e.target.value) : null})}
                  placeholder="Optionnel"
                />
              </div>

              <div>
                <Label>Notes internes</Label>
                <Input
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Optionnel"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button onClick={handleSave} disabled={!formData.client_id || !formData.produit_id}>
                  {editingTarif ? 'Mettre à jour' : 'Créer'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleProtection>
  );
}