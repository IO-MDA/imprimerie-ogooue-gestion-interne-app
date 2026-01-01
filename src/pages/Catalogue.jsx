import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  FileDown, 
  Send, 
  Eye, 
  Edit, 
  Trash2, 
  Image as ImageIcon,
  Loader2,
  Package,
  Filter,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import ProduitForm from '@/components/catalogue/ProduitForm';
import CatalogueGenerator from '@/components/catalogue/CatalogueGenerator';

const CATEGORIES = [
  "Photos & Cadres",
  "Calendrier & Tampon",
  "Impression & Saisie",
  "Reliure & Plastification",
  "Numérisation",
  "Textile Personnalisé",
  "EPI & Sécurité",
  "Communication Visuelle",
  "Bâches & Banderoles",
  "Objets Publicitaires"
];

export default function Catalogue() {
  const [produits, setProduits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduit, setEditingProduit] = useState(null);
  const [selectedProduits, setSelectedProduits] = useState([]);
  const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
  const [user, setUser] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [produitsData, userData] = await Promise.all([
      base44.entities.ProduitCatalogue.list('ordre'),
      base44.auth.me()
    ]);
    setProduits(produitsData);
    setUser(userData);
    setIsLoading(false);
  };

  const handleSave = async (data) => {
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
  };

  const handleDelete = async (produit) => {
    if (confirm(`Supprimer "${produit.nom}" ?`)) {
      await base44.entities.ProduitCatalogue.delete(produit.id);
      toast.success('Produit supprimé');
      loadData();
    }
  };

  const handleToggleActive = async (produit) => {
    await base44.entities.ProduitCatalogue.update(produit.id, {
      actif: !produit.actif
    });
    toast.success(produit.actif ? 'Produit désactivé' : 'Produit activé');
    loadData();
  };

  const handleSelectProduit = (produitId) => {
    setSelectedProduits(prev => 
      prev.includes(produitId) 
        ? prev.filter(id => id !== produitId)
        : [...prev, produitId]
    );
  };

  const filteredProduits = produits.filter(p => {
    if (categoryFilter !== 'all' && p.categorie !== categoryFilter) return false;
    if (showInactiveOnly && p.actif) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return p.nom?.toLowerCase().includes(search) ||
             p.description_courte?.toLowerCase().includes(search);
    }
    return true;
  });

  const isAdmin = user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            Catalogue Produits
          </h1>
          <p className="text-slate-500">Gérez votre catalogue commercial</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowGeneratorDialog(true)}
            variant="outline"
            disabled={produits.length === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Générer PDF
          </Button>
          {isAdmin && (
            <Button
              onClick={() => { setEditingProduit(null); setShowForm(true); }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nouveau produit
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Button
                variant={showInactiveOnly ? 'default' : 'outline'}
                onClick={() => setShowInactiveOnly(!showInactiveOnly)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showInactiveOnly ? 'Désactivés uniquement' : 'Tous'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
            <p className="text-2xl font-bold text-green-600">
              {produits.filter(p => p.actif).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Catégories</p>
            <p className="text-2xl font-bold text-blue-600">
              {new Set(produits.map(p => p.categorie)).size}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Sélectionnés</p>
            <p className="text-2xl font-bold text-purple-600">{selectedProduits.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      {filteredProduits.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun produit trouvé</p>
            {isAdmin && (
              <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">
                Créer un produit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProduits.map(produit => (
            <Card
              key={produit.id}
              className={`border-0 shadow-lg hover:shadow-xl transition-all ${
                !produit.actif ? 'opacity-60' : ''
              } ${selectedProduits.includes(produit.id) ? 'ring-2 ring-blue-500' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Badge className="mb-2">{produit.categorie}</Badge>
                    <CardTitle className="text-lg">{produit.nom}</CardTitle>
                  </div>
                  {isAdmin && (
                    <input
                      type="checkbox"
                      checked={selectedProduits.includes(produit.id)}
                      onChange={() => handleSelectProduit(produit.id)}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Image */}
                {produit.images && produit.images.length > 0 ? (
                  <img
                    src={produit.images[0]}
                    alt={produit.nom}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-slate-300" />
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-slate-600 line-clamp-2">
                  {produit.description_courte}
                </p>

                {/* Prix */}
                <div className="flex items-center justify-between">
                  <div>
                    {produit.prix_unitaire ? (
                      <p className="text-lg font-bold text-blue-600">
                        {produit.prix_unitaire.toLocaleString()} FCFA
                      </p>
                    ) : produit.prix_a_partir_de ? (
                      <p className="text-lg font-bold text-blue-600">
                        À partir de {produit.prix_a_partir_de.toLocaleString()} FCFA
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">Sur devis</p>
                    )}
                    {produit.delai_estime && (
                      <p className="text-xs text-slate-500">Délai: {produit.delai_estime}</p>
                    )}
                  </div>
                  {!produit.actif && (
                    <Badge variant="outline" className="text-rose-600">Désactivé</Badge>
                  )}
                </div>

                {/* Actions */}
                {isAdmin && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(produit)}
                      className="flex-1"
                    >
                      {produit.actif ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingProduit(produit); setShowForm(true); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(produit)}
                      className="text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduit ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
          </DialogHeader>
          <ProduitForm
            produit={editingProduit}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingProduit(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* Generator Dialog */}
      <Dialog open={showGeneratorDialog} onOpenChange={setShowGeneratorDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Générer un catalogue PDF</DialogTitle>
          </DialogHeader>
          <CatalogueGenerator
            produits={produits}
            selectedProduits={selectedProduits}
            onClose={() => setShowGeneratorDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}