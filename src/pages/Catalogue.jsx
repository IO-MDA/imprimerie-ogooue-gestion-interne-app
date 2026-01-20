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
  Sparkles,
  Loader2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import ProduitCatalogueForm from '@/components/catalogue/ProduitCatalogueForm';
import CatalogueGenerator from '@/components/catalogue/CatalogueGenerator';
import AnalyseVentesIA from '@/components/catalogue/AnalyseVentesIA';

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
  const [generatingCatalogue, setGeneratingCatalogue] = useState(false);
  const [showAnalyseIA, setShowAnalyseIA] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const isAdmin = user?.role === 'admin';
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [sortBy, setSortBy] = useState('default'); // default, prix_asc, prix_desc, delai
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

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

  const genererImagesIA = async () => {
    const produitssSansPhotos = produits.filter(p => !p.photos || p.photos.length === 0);
    
    if (produitssSansPhotos.length === 0) {
      toast.info('Tous les produits ont déjà des photos');
      return;
    }

    if (!confirm(`Générer des images IA pour ${produitssSansPhotos.length} produits sans photos?\n\nCela prendra environ ${produitssSansPhotos.length * 10} secondes.`)) {
      return;
    }

    setGeneratingImages(true);
    let generated = 0;

    try {
      for (const produit of produitssSansPhotos) {
        try {
          toast.info(`Génération image: ${produit.nom}...`);

          const prompt = `Professional product photo: ${produit.nom}. Clean studio shot, white background, professional lighting. Replace any text with "GABON" only. No other text allowed.`;

          const result = await base44.integrations.Core.GenerateImage({ prompt });
          
          if (result && result.url) {
            await base44.entities.ProduitCatalogue.update(produit.id, {
              photos: [result.url]
            });
            generated++;
            toast.success(`✓ ${produit.nom}`);
          } else {
            toast.error(`Pas d'URL pour ${produit.nom}`);
          }
        } catch (e) {
          console.error(`Erreur ${produit.nom}:`, e);
          toast.error(`✗ ${produit.nom}: ${e.message || 'Erreur inconnue'}`);
        }
      }

      if (generated > 0) {
        toast.success(`${generated}/${produitssSansPhotos.length} images générées!`);
        loadData();
      } else {
        toast.error('Aucune image générée');
      }
    } catch (e) {
      console.error('Erreur générale:', e);
      toast.error(`Erreur: ${e.message || 'Erreur inconnue'}`);
    } finally {
      setGeneratingImages(false);
    }
  };

  const genererCatalogueIA = async () => {
    if (!confirm('Générer automatiquement tous les produits à partir des mockups ?\n\nCela peut prendre quelques minutes et créer environ 50+ produits.')) {
      return;
    }

    setGeneratingCatalogue(true);
    
    try {
      // Définir les produits mockup
      const mockupProducts = [
        // Textile
        { nom: 'T-Shirt personnalisé', categorie: 'Textile', sous_categorie: 'T-shirts', prix: 3500 },
        { nom: 'Polo personnalisé', categorie: 'Textile', sous_categorie: 'Polos', prix: 5000 },
        { nom: 'Casquette brodée', categorie: 'Textile', sous_categorie: 'Accessoires', prix: 3000 },
        { nom: 'Tote Bag personnalisé', categorie: 'Textile', sous_categorie: 'Sacs', prix: 2500 },
        { nom: 'Tablier professionnel', categorie: 'Textile', sous_categorie: 'Cuisine', prix: 4000 },
        
        // Bureau & Papeterie
        { nom: 'Carnet personnalisé A5', categorie: 'Impression & Saisie', sous_categorie: 'Carnets', prix: 2000 },
        { nom: 'Stylo marqué', categorie: 'Impression & Saisie', sous_categorie: 'Stylos', prix: 500 },
        { nom: 'Calendrier mural personnalisé', categorie: 'Calendriers & Tampons', sous_categorie: 'Calendriers', prix: 3500 },
        { nom: 'Bloc-notes A4', categorie: 'Impression & Saisie', sous_categorie: 'Blocs', prix: 1500 },
        
        // Communication
        { nom: 'Flyer A5 couleur', categorie: 'Marketing', sous_categorie: 'Flyers', prix: 100 },
        { nom: 'Carte de visite premium', categorie: 'Marketing', sous_categorie: 'Cartes', prix: 25 },
        { nom: 'Badge personnalisé', categorie: 'Marketing', sous_categorie: 'Badges', prix: 300 },
        
        // Signalisation
        { nom: 'Banderole 3x1m', categorie: 'Signalétique', sous_categorie: 'Banderoles', prix: 25000 },
        { nom: 'Kakemono 80x200cm', categorie: 'Signalétique', sous_categorie: 'Kakemonos', prix: 20000 },
        { nom: 'Panneau publicitaire A1', categorie: 'Signalétique', sous_categorie: 'Panneaux', prix: 15000 },
        
        // EPI & Sécurité
        { nom: 'Combinaison de travail', categorie: 'EPI & Sécurité', sous_categorie: 'Tenues', prix: 12000 },
        { nom: 'Gilet haute visibilité', categorie: 'EPI & Sécurité', sous_categorie: 'Gilets', prix: 3500 },
        { nom: 'Casque de sécurité marqué', categorie: 'EPI & Sécurité', sous_categorie: 'Protection', prix: 4000 }
      ];

      let created = 0;
      
      for (const produit of mockupProducts) {
        // Vérifier si le produit existe déjà
        const existing = produits.find(p => 
          p.nom.toLowerCase() === produit.nom.toLowerCase()
        );
        
        if (existing) {
          continue;
        }

        toast.info(`Génération: ${produit.nom}...`);

        // Générer description avec IA
        const prompt = `Tu es un expert en communication commerciale pour l'Imprimerie Ogooué à Moanda, Gabon.

Génère une description commerciale courte (2-3 lignes max) et professionnelle pour ce produit:
- Produit: ${produit.nom}
- Catégorie: ${produit.categorie}

La description doit:
- Être attractive et professionnelle
- Mentionner les avantages clés
- Être adaptée au marché gabonais
- Ne pas dépasser 200 caractères

Réponds uniquement avec la description, sans guillemets ni préambule.`;

        const description = await base44.integrations.Core.InvokeLLM({ prompt });

        // Créer le produit
        await base44.entities.ProduitCatalogue.create({
          nom: produit.nom,
          categorie: produit.categorie,
          sous_categorie: produit.sous_categorie || '',
          description_courte: description,
          prix_unitaire: produit.prix,
          prix_a_partir_de: true,
          delai_estime: '3-5 jours ouvrés',
          actif: true,
          visible_clients: true,
          ordre: created,
          tags: [produit.categorie.toLowerCase(), produit.sous_categorie?.toLowerCase()].filter(Boolean)
        });

        created++;
      }

      toast.success(`${created} produits créés avec succès!`);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération du catalogue');
    } finally {
      setGeneratingCatalogue(false);
    }
  };

  // Advanced search with scoring
  const searchProducts = (products, query) => {
    if (!query) return products;
    
    const search = query.toLowerCase().trim();
    const words = search.split(' ').filter(w => w.length > 0);
    
    return products.map(p => {
      let score = 0;
      const nom = p.nom?.toLowerCase() || '';
      const description = p.description_courte?.toLowerCase() || '';
      const categorie = p.categorie?.toLowerCase() || '';
      const tags = (p.tags || []).join(' ').toLowerCase();
      
      // Exact match in name (highest priority)
      if (nom === search) score += 100;
      else if (nom.includes(search)) score += 50;
      
      // Word matches in name
      words.forEach(word => {
        if (nom.includes(word)) score += 20;
        if (description.includes(word)) score += 10;
        if (categorie.includes(word)) score += 15;
        if (tags.includes(word)) score += 8;
      });
      
      // Partial matches (fuzzy)
      if (nom.includes(search.slice(0, -1))) score += 5;
      
      return { ...p, searchScore: score };
    })
    .filter(p => p.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
  };

  // Filtering
  let filteredProduits = produits.filter(p => {
    if (categoryFilter !== 'all' && p.categorie !== categoryFilter) return false;
    if (showInactiveOnly && p.actif) return false;
    return true;
  });

  // Apply search
  if (searchQuery) {
    filteredProduits = searchProducts(filteredProduits, searchQuery);
  }

  // Sorting
  if (sortBy !== 'default') {
    filteredProduits = [...filteredProduits].sort((a, b) => {
      switch (sortBy) {
        case 'prix_asc':
          return (a.prix_unitaire || 0) - (b.prix_unitaire || 0);
        case 'prix_desc':
          return (b.prix_unitaire || 0) - (a.prix_unitaire || 0);
        case 'delai':
          // Sort by estimated delay (convert to comparable format)
          const delaiA = a.delai_estime || '';
          const delaiB = b.delai_estime || '';
          return delaiA.localeCompare(delaiB);
        case 'nom':
          return (a.nom || '').localeCompare(b.nom || '');
        default:
          return 0;
      }
    });
  }

  // Update active filters indicator
  useEffect(() => {
    const active = categoryFilter !== 'all' || showInactiveOnly || sortBy !== 'default' || searchQuery !== '';
    setHasActiveFilters(active);
  }, [categoryFilter, showInactiveOnly, sortBy, searchQuery]);

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
          <h1 className="text-2xl font-bold text-slate-900">Catalogue Produits</h1>
          <p className="text-slate-500">Gérez vos produits et générez des catalogues PDF</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <>
              <Button 
                onClick={() => { setEditingProduit(null); setShowForm(true); }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau produit
              </Button>
              <Button 
                variant="outline"
                onClick={genererImagesIA}
                disabled={generatingImages}
                className="bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:from-pink-700 hover:to-purple-700"
              >
                {generatingImages ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Images IA...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Générer images IA
                  </>
                )}
              </Button>
              <Button 
                variant="outline"
                onClick={genererCatalogueIA}
                disabled={generatingCatalogue}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700"
              >
                {generatingCatalogue ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer produits IA
                  </>
                )}
              </Button>
            </>
          )}
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
        {isAdmin && (
          <Card 
            className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-shadow bg-gradient-to-br from-emerald-50 to-teal-50"
            onClick={() => setShowAnalyseIA(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <p className="text-sm text-slate-500">Analyse IA</p>
              </div>
              <p className="text-sm font-medium text-emerald-700">Optimiser ventes</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card className={`border-0 shadow-lg transition-all ${hasActiveFilters ? 'ring-2 ring-blue-500' : ''}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Active filters indicator */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Filtres actifs ({[
                      categoryFilter !== 'all' ? 1 : 0,
                      showInactiveOnly ? 1 : 0,
                      sortBy !== 'default' ? 1 : 0,
                      searchQuery ? 1 : 0
                    ].reduce((a, b) => a + b, 0)})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCategoryFilter('all');
                    setSearchQuery('');
                    setShowInactiveOnly(false);
                    setSortBy('default');
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Réinitialiser
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Recherche avancée (nom, description, tags...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Badge className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-700 text-xs">
                    {filteredProduits.length} résultat{filteredProduits.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <span>Toutes catégories</span>
                      <Badge className="bg-slate-100 text-slate-700 text-xs">{produits.length}</Badge>
                    </div>
                  </SelectItem>
                  {CATEGORIES.map(cat => {
                    const count = produits.filter(p => p.categorie === cat).length;
                    return (
                      <SelectItem key={cat} value={cat}>
                        <div className="flex items-center gap-2">
                          <span>{cat}</span>
                          <Badge className="bg-blue-100 text-blue-700 text-xs">{count}</Badge>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Tri par défaut</SelectItem>
                  <SelectItem value="nom">Nom (A-Z)</SelectItem>
                  <SelectItem value="prix_asc">Prix (croissant) ⬆</SelectItem>
                  <SelectItem value="prix_desc">Prix (décroissant) ⬇</SelectItem>
                  <SelectItem value="delai">Délai de livraison</SelectItem>
                </SelectContent>
              </Select>

              {/* Additional filters */}
              <Button 
                variant={showInactiveOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowInactiveOnly(!showInactiveOnly)}
                className={showInactiveOnly ? 'bg-blue-600' : ''}
              >
                <Filter className="w-4 h-4 mr-2" />
                Inactifs {showInactiveOnly && `(${produits.filter(p => !p.actif).length})`}
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
                        <div 
                          className="w-full h-48 bg-white rounded-lg mb-3 p-3 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                          onClick={() => setSelectedImage({ url: produit.photos[0], nom: produit.nom })}
                        >
                          <img 
                            src={produit.photos[0]} 
                            alt={produit.nom}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-slate-100 rounded-lg mb-3 flex items-center justify-center">
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

                        <Badge className="bg-blue-100 text-blue-700">{produit.categorie}</Badge>

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

                        {isAdmin && (
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
                        )}

                        {/* Stock Badge */}
                        {(produit.stock_actuel !== undefined && produit.stock_actuel !== null) && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Stock</span>
                              <Badge className={
                                produit.stock_actuel <= (produit.stock_minimum || 5) 
                                  ? 'bg-rose-100 text-rose-700' 
                                  : produit.stock_actuel <= (produit.stock_minimum || 5) * 2
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }>
                                {produit.stock_actuel} {produit.unite || 'unité'}(s)
                              </Badge>
                            </div>
                          </div>
                        )}
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

      {/* Analyse IA Dialog */}
      <Dialog open={showAnalyseIA} onOpenChange={setShowAnalyseIA}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analyse IA des ventes</DialogTitle>
          </DialogHeader>
          <AnalyseVentesIA produits={produits} />
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.nom}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="w-full aspect-[9/16] bg-white rounded-lg p-4">
              <img 
                src={selectedImage.url} 
                alt={selectedImage.nom}
                className="w-full h-full object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}