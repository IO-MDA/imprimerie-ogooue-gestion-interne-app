import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  FileText, 
  Download, 
  Send, 
  Search, 
  Edit, 
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Filter,
  AlertTriangle,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import ProduitCatalogueForm from '@/components/catalogue/ProduitCatalogueForm';
import CatalogueGenerator from '@/components/catalogue/CatalogueGenerator';

const CATEGORIES = [
  'Photos',
  'Calendriers & Tampons',
  'Impression & Saisie',
  'Reliure & Plastification',
  'Numérisation',
  'Textile',
  'EPI & Sécurité',
  'Marketing',
  'Signalétique'
];

export default function Catalogue() {
  const [produits, setProduits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduit, setEditingProduit] = useState(null);
  const [selectedProduits, setSelectedProduits] = useState([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [user, setUser] = useState(null);
  const [showStockAlert, setShowStockAlert] = useState(false);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [produitsData, userData] = await Promise.all([
        base44.entities.ProduitCatalogue.list('ordre'),
        base44.auth.me()
      ]);
      setProduits(produitsData);
      setUser(userData);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editingProduit) {
        await base44.entities.ProduitCatalogue.update(editingProduit.id, data);
        toast.success('Produit mis à jour');
      } else {
        await base44.entities.ProduitCatalogue.create(data);
        toast.success('Produit créé');
      }
      setShowForm(false);
      setEditingProduit(null);
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la sauvegarde');
      console.error(e);
    }
  };

  const handleDelete = async (produit) => {
    if (!confirm(`Supprimer "${produit.nom}" ?`)) return;
    
    try {
      await base44.entities.ProduitCatalogue.delete(produit.id);
      toast.success('Produit supprimé');
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleActive = async (produit) => {
    try {
      await base44.entities.ProduitCatalogue.update(produit.id, {
        actif: !produit.actif
      });
      toast.success(produit.actif ? 'Produit désactivé' : 'Produit activé');
      loadData();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const toggleSelection = (produitId) => {
    setSelectedProduits(prev => 
      prev.includes(produitId) 
        ? prev.filter(id => id !== produitId)
        : [...prev, produitId]
    );
  };

  const selectAll = () => {
    const visibleIds = filteredProduits.map(p => p.id);
    setSelectedProduits(visibleIds);
  };

  const clearSelection = () => {
    setSelectedProduits([]);
  };

  // Filtering
  const filteredProduits = produits.filter(p => {
    if (categoryFilter !== 'all' && p.categorie !== categoryFilter) return false;
    if (showInactiveOnly && p.actif) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return p.nom?.toLowerCase().includes(search) ||
             p.description_courte?.toLowerCase().includes(search) ||
             p.tags?.some(t => t.toLowerCase().includes(search));
    }
    return true;
  });

  // Stock alerts
  const lowStockProducts = produits.filter(p => 
    p.gestion_stock && p.stock_actuel <= p.stock_minimum
  );

  // Group by category
  const produitsParCategorie = {};
  filteredProduits.forEach(p => {
    if (!produitsParCategorie[p.categorie]) {
      produitsParCategorie[p.categorie] = [];
    }
    produitsParCategorie[p.categorie].push(p);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            Catalogue Produits
          </h1>
          <p className="text-slate-500">Gérez vos produits et générez des catalogues PDF</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingProduit(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nouveau produit
          </Button>
          <Button 
            variant="outline"
            onClick={() => setShowGenerator(true)}
            disabled={produits.length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            Générer catalogue
          </Button>
        </div>
      </div>

      {/* Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-0 shadow-lg shadow-amber-200/50 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-900">Alerte stock bas</p>
                <p className="text-sm text-amber-700">
                  {lowStockProducts.length} produit{lowStockProducts.length > 1 ? 's' : ''} nécessite{lowStockProducts.length > 1 ? 'nt' : ''} un réapprovisionnement
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowStockAlert(true)}>
                Voir détails
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total produits</p>
            <p className="text-2xl font-bold text-slate-900">{produits.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Actifs</p>
            <p className="text-2xl font-bold text-green-600">{produits.filter(p => p.actif).length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Catégories</p>
            <p className="text-2xl font-bold text-blue-600">{Object.keys(produitsParCategorie).length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Sélectionnés</p>
            <p className="text-2xl font-bold text-purple-600">{selectedProduits.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button 
                variant={showInactiveOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowInactiveOnly(!showInactiveOnly)}
                className="flex-1"
              >
                <Filter className="w-4 h-4 mr-2" />
                Inactifs
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Actions */}
      {selectedProduits.length > 0 && (
        <Card className="border-0 shadow-lg bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-blue-900">
                {selectedProduits.length} produit(s) sélectionné(s)
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowGenerator(true)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Catalogue sélection
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Désélectionner
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredProduits.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun produit trouvé</p>
            <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">
              Créer un produit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={Object.keys(produitsParCategorie)[0] || 'all'} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all" onClick={() => setCategoryFilter('all')}>
              Tous ({filteredProduits.length})
            </TabsTrigger>
            {Object.keys(produitsParCategorie).map(cat => (
              <TabsTrigger key={cat} value={cat} onClick={() => setCategoryFilter(cat)}>
                {cat} ({produitsParCategorie[cat].length})
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProduits.map(produit => (
              <Card 
                key={produit.id} 
                className={`border-0 shadow-lg hover:shadow-xl transition-all ${
                  selectedProduits.includes(produit.id) ? 'ring-2 ring-blue-500' : ''
                } ${!produit.actif ? 'opacity-60' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedProduits.includes(produit.id)}
                      onChange={() => toggleSelection(produit.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      {/* Image */}
                      {produit.photos && produit.photos.length > 0 ? (
                        <img 
                          src={produit.photos[0]} 
                          alt={produit.nom}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-slate-400" />
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold text-slate-900">{produit.nom}</h3>
                          {!produit.actif && (
                            <Badge variant="secondary" className="ml-2">Inactif</Badge>
                          )}
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Badge className="bg-blue-100 text-blue-700">{produit.categorie}</Badge>
                          {produit.gestion_stock && (
                            <Badge className={produit.stock_actuel <= produit.stock_minimum ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}>
                              Stock: {produit.stock_actuel || 0}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-slate-600 line-clamp-2">
                          {produit.description_courte}
                        </p>

                        <div className="flex items-baseline gap-2">
                          <p className="text-lg font-bold text-blue-600">
                            {produit.prix_unitaire.toLocaleString()} FCFA
                          </p>
                          {produit.prix_a_partir_de && (
                            <span className="text-xs text-slate-500">à partir de</span>
                          )}
                        </div>

                        {produit.delai_estime && (
                          <p className="text-xs text-slate-500">
                            ⏱ Délai: {produit.delai_estime}
                          </p>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => { setEditingProduit(produit); setShowForm(true); }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleActive(produit)}
                          >
                            {produit.actif ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDelete(produit)}
                            className="text-rose-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Tabs>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduit ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
          </DialogHeader>
          <ProduitCatalogueForm
            produit={editingProduit}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingProduit(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Generator Dialog */}
      <Dialog open={showGenerator} onOpenChange={setShowGenerator}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Générer un catalogue PDF</DialogTitle>
          </DialogHeader>
          <CatalogueGenerator
            produits={produits}
            selectedProduits={selectedProduits}
            onClose={() => setShowGenerator(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Stock Alert Dialog */}
      <Dialog open={showStockAlert} onOpenChange={setShowStockAlert}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              Alertes Stock Bas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {lowStockProducts.map(produit => (
              <Card key={produit.id} className="border border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{produit.nom}</p>
                      <p className="text-sm text-slate-500">{produit.categorie}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Stock actuel</p>
                      <p className="text-2xl font-bold text-amber-600">{produit.stock_actuel || 0}</p>
                      <p className="text-xs text-slate-400">Min: {produit.stock_minimum || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}