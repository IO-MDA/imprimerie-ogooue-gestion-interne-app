import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  Package,
  Edit,
  Trash2,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Papeterie', 'Consommables', 'Équipement', 'Fournitures', 'Autre'];

export default function Catalogue() {
  const [produits, setProduits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState('all');

  const [formData, setFormData] = useState({
    nom: '',
    categorie: 'Papeterie',
    description: '',
    prix_unitaire: 0,
    prix_achat: 0,
    stock_actuel: 0,
    stock_minimum: 5,
    unite: 'unité'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const data = await base44.entities.Produit.list();
    setProduits(data);
    setIsLoading(false);
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      categorie: 'Papeterie',
      description: '',
      prix_unitaire: 0,
      prix_achat: 0,
      stock_actuel: 0,
      stock_minimum: 5,
      unite: 'unité'
    });
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      nom: product.nom,
      categorie: product.categorie || 'Papeterie',
      description: product.description || '',
      prix_unitaire: product.prix_unitaire || 0,
      prix_achat: product.prix_achat || 0,
      stock_actuel: product.stock_actuel || 0,
      stock_minimum: product.stock_minimum || 5,
      unite: product.unite || 'unité'
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.nom) {
      toast.error('Le nom du produit est requis');
      return;
    }
    
    if (editingProduct) {
      await base44.entities.Produit.update(editingProduct.id, formData);
      toast.success('Produit mis à jour');
    } else {
      await base44.entities.Produit.create(formData);
      toast.success('Produit créé');
    }
    setShowForm(false);
    resetForm();
    loadData();
  };

  const handleDelete = async (id) => {
    if (confirm('Supprimer ce produit ?')) {
      await base44.entities.Produit.delete(id);
      toast.success('Produit supprimé');
      loadData();
    }
  };

  const updateStock = async (product, delta) => {
    const newStock = Math.max(0, (product.stock_actuel || 0) + delta);
    await base44.entities.Produit.update(product.id, { stock_actuel: newStock });
    loadData();
  };

  const filteredProducts = produits.filter(p => {
    if (filterCategory !== 'all' && p.categorie !== filterCategory) return false;
    if (filterStock === 'low' && p.stock_actuel > p.stock_minimum) return false;
    if (filterStock === 'ok' && p.stock_actuel <= p.stock_minimum) return false;
    if (searchQuery) {
      return p.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const lowStockCount = produits.filter(p => p.stock_actuel <= p.stock_minimum).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catalogue produits</h1>
          <p className="text-slate-500">Gérez votre inventaire et suivez les stocks</p>
        </div>
        <Button 
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau produit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total produits</p>
                <p className="text-2xl font-bold">{produits.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Stock bas</p>
                <p className="text-2xl font-bold text-amber-600">{lowStockCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Valeur stock</p>
                <p className="text-2xl font-bold">
                  {produits.reduce((sum, p) => sum + ((p.prix_achat || 0) * (p.stock_actuel || 0)), 0).toLocaleString()} FCFA
                </p>
              </div>
              <Package className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStock} onValueChange={setFilterStock}>
              <SelectTrigger>
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="low">Stock bas</SelectItem>
                <SelectItem value="ok">Stock OK</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="border-0 shadow-lg shadow-slate-200/50">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Aucun produit trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <Card key={product.id} className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{product.nom}</h3>
                    <Badge variant="secondary" className="mt-1">{product.categorie}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(product.id)} className="text-rose-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {product.description && (
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{product.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-slate-500">Prix vente</p>
                    <p className="font-bold text-blue-600">{(product.prix_unitaire || 0).toLocaleString()} FCFA</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Prix achat</p>
                    <p className="font-medium text-slate-600">{(product.prix_achat || 0).toLocaleString()} FCFA</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    {product.stock_actuel <= product.stock_minimum && (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-sm text-slate-500">Stock:</span>
                    <span className={`font-bold ${product.stock_actuel <= product.stock_minimum ? 'text-amber-600' : 'text-slate-900'}`}>
                      {product.stock_actuel} {product.unite}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" onClick={() => updateStock(product, -1)}>-</Button>
                    <Button variant="outline" size="sm" onClick={() => updateStock(product, 1)}>+</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du produit *</Label>
              <Input 
                value={formData.nom}
                onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                placeholder="Ex: Rame de papier A4"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Catégorie</Label>
                <Select value={formData.categorie} onValueChange={(v) => setFormData(prev => ({ ...prev, categorie: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unité</Label>
                <Input 
                  value={formData.unite}
                  onChange={(e) => setFormData(prev => ({ ...prev, unite: e.target.value }))}
                  placeholder="unité, rame, boîte..."
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du produit..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prix de vente (FCFA)</Label>
                <Input 
                  type="number"
                  value={formData.prix_unitaire}
                  onChange={(e) => setFormData(prev => ({ ...prev, prix_unitaire: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Prix d'achat (FCFA)</Label>
                <Input 
                  type="number"
                  value={formData.prix_achat}
                  onChange={(e) => setFormData(prev => ({ ...prev, prix_achat: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Stock actuel</Label>
                <Input 
                  type="number"
                  value={formData.stock_actuel}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_actuel: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Stock minimum (alerte)</Label>
                <Input 
                  type="number"
                  value={formData.stock_minimum}
                  onChange={(e) => setFormData(prev => ({ ...prev, stock_minimum: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Annuler
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600"
                onClick={handleSave}
              >
                {editingProduct ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}