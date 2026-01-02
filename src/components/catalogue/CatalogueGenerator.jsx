import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function CatalogueGenerator({ produits, selectedProduits, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [generationType, setGenerationType] = useState('complet');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [template, setTemplate] = useState('moderne');
  const [couleurPrimaire, setCouleurPrimaire] = useState('#0078d7');
  const [includePromos, setIncludePromos] = useState(false);
  const [includeNouveautes, setIncludeNouveautes] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [tarifsClients, setTarifsClients] = useState([]);

  const categories = [...new Set(produits.map(p => p.categorie))];

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    const clientsData = await base44.entities.Client.list();
    const tarifsData = await base44.entities.TarifsClients.list();
    setClients(clientsData);
    setTarifsClients(tarifsData);
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Determine which products to include
      let produitsToInclude = [];
      
      if (generationType === 'selection' && selectedProduits.length > 0) {
        produitsToInclude = produits.filter(p => selectedProduits.includes(p.id) && p.actif && p.visible_clients);
      } else if (generationType === 'categorie' && selectedCategory) {
        produitsToInclude = produits.filter(p => p.categorie === selectedCategory && p.actif && p.visible_clients);
      } else {
        produitsToInclude = produits.filter(p => p.actif && p.visible_clients);
      }

      if (produitsToInclude.length === 0) {
        toast.error('Aucun produit à inclure dans le catalogue');
        setGenerating(false);
        return;
      }

      // Sections dynamiques
      let sectionsSpeciales = {};
      
      if (includePromos) {
        const produitsPromo = produitsToInclude.filter(p => p.prix_a_partir_de || (p.tags && p.tags.includes('promotion')));
        if (produitsPromo.length > 0) {
          sectionsSpeciales['Promotions & Offres Spéciales'] = produitsPromo;
        }
      }
      
      if (includeNouveautes) {
        const dateLimit = new Date();
        dateLimit.setMonth(dateLimit.getMonth() - 2);
        const nouveautes = produitsToInclude.filter(p => new Date(p.created_date) > dateLimit);
        if (nouveautes.length > 0) {
          sectionsSpeciales['Nouveautés'] = nouveautes;
        }
      }

      // Calculer prix personnalisés si client sélectionné
      const clientData = selectedClient ? clients.find(c => c.id === selectedClient) : null;
      
      const getPrixClient = (produit) => {
        if (!clientData) return produit.prix_unitaire;
        
        // Chercher tarif spécifique
        const tarif = tarifsClients.find(t => t.client_id === clientData.id && t.produit_id === produit.id);
        
        if (tarif) {
          if (tarif.prix_client) return tarif.prix_client;
          if (tarif.remise_pct) return produit.prix_unitaire * (1 - tarif.remise_pct / 100);
        }
        
        // Remise globale client
        if (clientData.remise_globale_pct) {
          return produit.prix_unitaire * (1 - clientData.remise_globale_pct / 100);
        }
        
        return produit.prix_unitaire;
      };

      // Parse couleur
      const rgbColor = {
        r: parseInt(couleurPrimaire.slice(1, 3), 16),
        g: parseInt(couleurPrimaire.slice(3, 5), 16),
        b: parseInt(couleurPrimaire.slice(5, 7), 16)
      };

      // IA de mise en page automatique selon nombre de produits
      const totalProduits = produitsToInclude.length;
      let layoutConfig = {
        cardsPerPage: 5,
        cardHeight: 45,
        descriptionLines: 2,
        fontSize: 8,
        titleFontSize: 11
      };

      if (totalProduits <= 6) {
        layoutConfig = { cardsPerPage: 4, cardHeight: 60, descriptionLines: 3, fontSize: 9, titleFontSize: 13 };
      } else if (totalProduits <= 20) {
        layoutConfig = { cardsPerPage: 5, cardHeight: 45, descriptionLines: 2, fontSize: 8, titleFontSize: 11 };
      } else if (totalProduits <= 60) {
        layoutConfig = { cardsPerPage: 7, cardHeight: 35, descriptionLines: 2, fontSize: 7, titleFontSize: 10 };
      } else {
        layoutConfig = { cardsPerPage: 9, cardHeight: 28, descriptionLines: 1, fontSize: 6.5, titleFontSize: 9 };
      }

      // Create PDF with professional layout
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - (2 * margin);
      let pageNumber = 1;

      // Helper function to add footer with logo and pagination
      const addFooter = () => {
        pdf.setFontSize(7);
        pdf.setTextColor(120, 120, 120);
        pdf.text('IMPRIMERIE OGOOUE | Tel: +241 060 44 46 34 / 074 42 41 42 | imprimerieogooue@gmail.com', pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('RCCM: RG/FCV 2023A0407 | Carrefour Fina en face de Finam, Moanda - Gabon', pageWidth / 2, pageHeight - 6, { align: 'center' });
        
        // Page number
        pdf.setFontSize(8);
        pdf.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        pageNumber++;
      };

      // COVER PAGE
      pdf.setFillColor(rgbColor.r, rgbColor.g, rgbColor.b);
      pdf.rect(0, 0, pageWidth, pageHeight / 2, 'F');
      
      // Logo on cover (centered, not overlapping text)
      const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/c22c6636f_LOGO-BON-FINAL1.png';
      try {
        pdf.addImage(logoUrl, 'PNG', pageWidth / 2 - 20, 30, 40, 40);
      } catch (e) {
        console.log('Logo loading error');
      }
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      pdf.text('IMPRIMERIE OGOOUÉ', pageWidth / 2, 85, { align: 'center' });
      
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Catalogue Produits & Services', pageWidth / 2, 100, { align: 'center' });
      
      // Category subtitle on white background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, pageHeight / 2, pageWidth, pageHeight / 2, 'F');
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(14);
      const titleText = generationType === 'selection' ? 'Sélection personnalisée' :
                        generationType === 'categorie' ? `Catégorie: ${selectedCategory}` :
                        'Catalogue complet';
      pdf.text(titleText, pageWidth / 2, pageHeight / 2 + 20, { align: 'center' });

      // Contact info
      pdf.setFontSize(11);
      pdf.setTextColor(60, 60, 60);
      pdf.text('Tél: +241 060 44 46 34 / 074 42 41 42', pageWidth / 2, pageHeight / 2 + 40, { align: 'center' });
      pdf.text('Email: imprimerieogooue@gmail.com', pageWidth / 2, pageHeight / 2 + 48, { align: 'center' });

      if (clientData) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Catalogue personnalisé pour: ${clientData.nom}`, pageWidth / 2, pageHeight / 2 + 65, { align: 'center' });
      }

      // Group products by category
      const produitsParCategorie = {};
      produitsToInclude.forEach(p => {
        if (!produitsParCategorie[p.categorie]) {
          produitsParCategorie[p.categorie] = [];
        }
        produitsParCategorie[p.categorie].push(p);
      });

      // Sections spéciales d'abord
      let isFirstCategory = true;
      
      for (const [sectionName, produitsSection] of Object.entries(sectionsSpeciales)) {
        if (!isFirstCategory) {
          pdf.addPage();
        } else {
          pdf.addPage();
        }
        isFirstCategory = false;
        
        let yPos = margin + 5;
        
        // Section header (avec étoile pour les promotions)
        pdf.setFillColor(rgbColor.r, rgbColor.g, rgbColor.b);
        pdf.rect(0, yPos, pageWidth, 12, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        const headerText = sectionName.includes('Promotion') ? '⭐ ' + sectionName : sectionName;
        pdf.text(headerText, pageWidth / 2, yPos + 8, { align: 'center' });
        
        yPos += 20;
        
        for (let i = 0; i < produitsSection.length; i++) {
          const produit = produitsSection[i];
          const cardHeight = layoutConfig.cardHeight;
          
          if (yPos + cardHeight > pageHeight - 25) {
            addFooter();
            pdf.addPage();
            yPos = margin + 5;
          }
          
          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, yPos, contentWidth, cardHeight);
          
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin + 3, yPos + 3, 28, 28, 'F');
          pdf.setFontSize(7);
          pdf.setTextColor(150, 150, 150);
          pdf.text('PHOTO', margin + 17, yPos + 18, { align: 'center' });
          
          const textStartX = margin + 34;
          const textWidth = contentWidth - 37;
          
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(layoutConfig.titleFontSize);
          pdf.setFont('helvetica', 'bold');
          pdf.text(produit.nom, textStartX, yPos + 8);
          
          pdf.setFontSize(layoutConfig.fontSize);
          pdf.setFont('helvetica', 'normal');
          const descLines = pdf.splitTextToSize(produit.description_courte || '', textWidth);
          pdf.text(descLines.slice(0, layoutConfig.descriptionLines), textStartX, yPos + 14);
          
          pdf.setFontSize(layoutConfig.titleFontSize + 1);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(rgbColor.r, rgbColor.g, rgbColor.b);
          const prixFinal = getPrixClient(produit);
          const prix = new Intl.NumberFormat('fr-FR').format(Math.round(prixFinal || 0));
          const prixText = `${prix} FCFA${produit.prix_a_partir_de ? ' (à partir de)' : ''}`;
          pdf.text(prixText, textStartX, yPos + (cardHeight - 15));
          
          if (produit.delai_estime) {
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Délai: ${produit.delai_estime}`, textStartX, yPos + 37);
          }
          
          yPos += cardHeight + 3;
        }
        
        addFooter();
      }
      
      // Products by category (no table of contents, direct to products)
      for (const [categorie, produitsCategorie] of Object.entries(produitsParCategorie)) {
        if (!isFirstCategory) {
          pdf.addPage();
        } else {
          pdf.addPage();
        }
        isFirstCategory = false;
        
        let yPos = margin + 5;
        
        // Category header (compact)
        pdf.setFillColor(rgbColor.r, rgbColor.g, rgbColor.b);
        pdf.rect(0, yPos, pageWidth, 12, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(categorie, pageWidth / 2, yPos + 8, { align: 'center' });
        
        yPos += 20;
        
        // Products in optimized grid
        for (let i = 0; i < produitsCategorie.length; i++) {
          const produit = produitsCategorie[i];
          
          // Calculate product card height
          const cardHeight = layoutConfig.cardHeight;
          
          // Check if we need a new page (leave space for footer)
          if (yPos + cardHeight > pageHeight - 25) {
            addFooter();
            pdf.addPage();
            yPos = margin + 5;
          }
          
          // Product card with border
          pdf.setDrawColor(220, 220, 220);
          pdf.setLineWidth(0.3);
          pdf.rect(margin, yPos, contentWidth, cardHeight);
          
          // Product image placeholder (left side)
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin + 3, yPos + 3, 28, 28, 'F');
          pdf.setFontSize(7);
          pdf.setTextColor(150, 150, 150);
          pdf.text('PHOTO', margin + 17, yPos + 18, { align: 'center' });
          
          // Product details (right side)
          const textStartX = margin + 34;
          const textWidth = contentWidth - 37;
          
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(layoutConfig.titleFontSize);
          pdf.setFont('helvetica', 'bold');
          pdf.text(produit.nom, textStartX, yPos + 8);
          
          pdf.setFontSize(layoutConfig.fontSize);
          pdf.setFont('helvetica', 'normal');
          
          const descLines = pdf.splitTextToSize(produit.description_courte || '', textWidth);
          pdf.text(descLines.slice(0, layoutConfig.descriptionLines), textStartX, yPos + 14);
          
          // Price (prominent)
          pdf.setFontSize(layoutConfig.titleFontSize + 1);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(rgbColor.r, rgbColor.g, rgbColor.b);
          const prixFinal = getPrixClient(produit);
          const prix = new Intl.NumberFormat('fr-FR').format(Math.round(prixFinal || 0));
          const prixText = `${prix} FCFA${produit.prix_a_partir_de ? ' (à partir de)' : ''}`;
          pdf.text(prixText, textStartX, yPos + (cardHeight - 15));
          
          // Delivery time (small, subtle)
          if (produit.delai_estime) {
            pdf.setFontSize(layoutConfig.fontSize - 0.5);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Délai: ${produit.delai_estime}`, textStartX, yPos + (cardHeight - 8));
          }
          
          yPos += cardHeight + 3;
        }
        
        // Footer on each page
        addFooter();
      }

      // Save PDF
      const clientSuffix = clientData ? `_${clientData.nom.replace(/ /g, '_')}` : '';
      const fileName = `Catalogue_Impression_&_Saisie${clientSuffix}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      pdf.save(fileName);
      
      toast.success('Catalogue généré avec succès');
      onClose();
    } catch (e) {
      toast.error('Erreur lors de la génération du PDF');
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label>Type de catalogue</Label>
        <Select value={generationType} onValueChange={setGenerationType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="complet">Catalogue complet</SelectItem>
            <SelectItem value="categorie">Par catégorie</SelectItem>
            {selectedProduits.length > 0 && (
              <SelectItem value="selection">
                Sélection ({selectedProduits.length} produits)
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {generationType === 'categorie' && (
        <div>
          <Label>Catégorie</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label>Client (tarification personnalisée)</Label>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger>
            <SelectValue placeholder="Aucun - Prix publics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>Aucun - Prix publics</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.nom} {client.remise_globale_pct > 0 && `(-${client.remise_globale_pct}%)`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-1">
          Sélectionnez un client pour générer un catalogue avec ses prix personnalisés
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Couleur principale</Label>
          <Input
            type="color"
            value={couleurPrimaire}
            onChange={(e) => setCouleurPrimaire(e.target.value)}
            className="h-10"
          />
        </div>
        <div>
          <Label>Style</Label>
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="moderne">Moderne</SelectItem>
              <SelectItem value="classique">Classique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Sections spéciales</Label>
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={includePromos} 
            onCheckedChange={setIncludePromos}
            id="promos"
          />
          <label htmlFor="promos" className="text-sm cursor-pointer">
            Inclure les promotions en première page
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={includeNouveautes} 
            onCheckedChange={setIncludeNouveautes}
            id="nouveautes"
          />
          <label htmlFor="nouveautes" className="text-sm cursor-pointer">
            Inclure les nouveautés (derniers 2 mois)
          </label>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-blue-900">
          Le catalogue sera généré avec:
        </p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1">
          <li>• Page de couverture professionnelle</li>
          <li>• Sommaire automatique</li>
          <li>• Produits classés par catégorie</li>
          <li>• Photos, descriptions et prix</li>
        </ul>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose} disabled={generating}>
          Annuler
        </Button>
        <Button 
          onClick={generatePDF}
          disabled={generating || (generationType === 'categorie' && !selectedCategory)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Générer le PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}