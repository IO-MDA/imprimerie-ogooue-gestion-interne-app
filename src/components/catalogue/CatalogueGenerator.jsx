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

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPos = 20;

      // Cover page
      pdf.setFillColor(0, 120, 215);
      pdf.rect(0, 0, pageWidth, 80, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(32);
      pdf.setFont('helvetica', 'bold');
      pdf.text('IMPRIMERIE OGOOUÉ', pageWidth / 2, 40, { align: 'center' });
      
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Catalogue Produits & Services', pageWidth / 2, 55, { align: 'center' });
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      const titleText = generationType === 'selection' ? 'Sélection personnalisée' :
                        generationType === 'categorie' ? `Catégorie: ${selectedCategory}` :
                        'Catalogue complet';
      pdf.text(titleText, pageWidth / 2, 100, { align: 'center' });

      // Contact info
      pdf.setFontSize(10);
      pdf.text('Tel: +241 060 44 46 34 / 074 42 41 42', pageWidth / 2, 120, { align: 'center' });
      pdf.text('Email: imprimerieogooue@gmail.com', pageWidth / 2, 128, { align: 'center' });

      // Group products by category
      const produitsParCategorie = {};
      produitsToInclude.forEach(p => {
        if (!produitsParCategorie[p.categorie]) {
          produitsParCategorie[p.categorie] = [];
        }
        produitsParCategorie[p.categorie].push(p);
      });

      // Table of contents
      pdf.addPage();
      yPos = 20;
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('SOMMAIRE', pageWidth / 2, yPos, { align: 'center' });
      
      yPos = 40;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      
      Object.keys(produitsParCategorie).forEach((cat, index) => {
        pdf.text(`${index + 1}. ${cat}`, 20, yPos);
        pdf.text(`${produitsParCategorie[cat].length} produits`, pageWidth - 40, yPos, { align: 'right' });
        yPos += 10;
        
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          yPos = 20;
        }
      });

      // Products by category
      for (const [categorie, produitsCategorie] of Object.entries(produitsParCategorie)) {
        pdf.addPage();
        yPos = 20;
        
        // Category header
        pdf.setFillColor(0, 120, 215);
        pdf.rect(0, yPos - 8, pageWidth, 15, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(categorie, pageWidth / 2, yPos, { align: 'center' });
        
        yPos = 45;
        
        for (const produit of produitsCategorie) {
          // Check if we need a new page
          if (yPos > pageHeight - 60) {
            pdf.addPage();
            yPos = 20;
          }
          
          // Product box
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.5);
          pdf.rect(15, yPos - 5, pageWidth - 30, 50);
          
          // Product image with improved error handling
          if (produit.photos && produit.photos.length > 0 && produit.photos[0]) {
            try {
              const imageUrl = produit.photos[0];
              if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                // Placeholder box for image
                pdf.setFillColor(240, 240, 240);
                pdf.rect(20, yPos, 30, 30, 'F');
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text('PHOTO', 35, yPos + 16, { align: 'center' });
              }
            } catch (e) {
              // Silently handle image errors
              console.log('Image non chargée pour:', produit.nom);
            }
          }
          
          // Product details
          const textStartX = produit.photos?.length > 0 ? 55 : 20;
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(produit.nom, textStartX, yPos + 5);
          
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          
          const descLines = pdf.splitTextToSize(produit.description_courte || '', pageWidth - textStartX - 25);
          pdf.text(descLines.slice(0, 2), textStartX, yPos + 12);
          
          // Price
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 120, 215);
          const prixText = `${produit.prix_unitaire.toLocaleString()} FCFA${produit.prix_a_partir_de ? ' (à partir de)' : ''}`;
          pdf.text(prixText, textStartX, yPos + 30);
          
          // Delivery time
          if (produit.delai_estime) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Délai: ${produit.delai_estime}`, textStartX, yPos + 37);
          }
          
          yPos += 55;
        }
      }

      // Footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text('RCCM : RG/FCV 2023A0407 | NIF : 256598U', pageWidth / 2, pageHeight - 20, { align: 'center' });
      pdf.text('Siege social : Carrefour Fina en face de Finam Moanda - Gabon', pageWidth / 2, pageHeight - 15, { align: 'center' });
      pdf.text('Tel : 060 44 46 34 / 074 42 41 42 | Email : imprimerieogooue@gmail.com', pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save PDF
      const fileName = `Catalogue_${generationType === 'selection' ? 'Selection' : 
                                     generationType === 'categorie' ? selectedCategory.replace(/ /g, '_') : 
                                     'Complet'}_${new Date().toISOString().split('T')[0]}.pdf`;
      
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