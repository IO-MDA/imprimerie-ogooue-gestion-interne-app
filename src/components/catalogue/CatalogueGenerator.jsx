import React, { useState } from 'react';
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

  const categories = [...new Set(produits.map(p => p.categorie))];

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
      pdf.setFillColor(0, 120, 215);
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

      // Group products by category
      const produitsParCategorie = {};
      produitsToInclude.forEach(p => {
        if (!produitsParCategorie[p.categorie]) {
          produitsParCategorie[p.categorie] = [];
        }
        produitsParCategorie[p.categorie].push(p);
      });

      // Products by category (no table of contents, direct to products)
      let isFirstCategory = true;
      
      for (const [categorie, produitsCategorie] of Object.entries(produitsParCategorie)) {
        if (!isFirstCategory) {
          pdf.addPage();
        } else {
          pdf.addPage();
        }
        isFirstCategory = false;
        
        let yPos = margin + 5;
        
        // Category header (compact)
        pdf.setFillColor(0, 120, 215);
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
          const cardHeight = 45;
          
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
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text(produit.nom, textStartX, yPos + 8);
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          
          const descLines = pdf.splitTextToSize(produit.description_courte || '', textWidth);
          pdf.text(descLines.slice(0, 2), textStartX, yPos + 14);
          
          // Price (prominent)
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 120, 215);
          const prix = new Intl.NumberFormat('fr-FR').format(Math.round(produit.prix_unitaire || 0));
          const prixText = `${prix} FCFA${produit.prix_a_partir_de ? ' (à partir de)' : ''}`;
          pdf.text(prixText, textStartX, yPos + 30);
          
          // Delivery time (small, subtle)
          if (produit.delai_estime) {
            pdf.setFontSize(7);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Délai: ${produit.delai_estime}`, textStartX, yPos + 37);
          }
          
          yPos += cardHeight + 3;
        }
        
        // Footer on each page
        addFooter();
      }

      // Save PDF
      const fileName = `Catalogue_Impression_&_Saisie_${new Date().toISOString().split('T')[0]}.pdf`;
      
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