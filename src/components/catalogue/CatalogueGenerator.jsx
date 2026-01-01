import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, FileDown, Send } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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

export default function CatalogueGenerator({ produits, selectedProduits, onClose }) {
  const [generationType, setGenerationType] = useState('complet');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [generating, setGenerating] = useState(false);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      let yPosition = 20;
      
      // Page de couverture
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('IMPRIMERIE OGOOUÉ', 105, 60, { align: 'center' });
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Catalogue de produits & services', 105, 75, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('Création • Impressions • Toutes solutions', 105, 90, { align: 'center' });
      doc.text('+241 060 44 46 34 / 074 42 41 42', 105, 100, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 105, 280, { align: 'center' });
      
      // Sélectionner les produits à inclure
      let produitsToInclude = [];
      if (generationType === 'complet') {
        produitsToInclude = produits.filter(p => p.actif && p.partage_client);
      } else if (generationType === 'categorie') {
        produitsToInclude = produits.filter(p => p.actif && p.partage_client && p.categorie === selectedCategory);
      } else if (generationType === 'personnalise') {
        produitsToInclude = produits.filter(p => selectedProduits.includes(p.id));
      }

      // Sommaire
      doc.addPage();
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Sommaire', 20, 30);
      
      yPosition = 50;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      const categoriesInCatalogue = [...new Set(produitsToInclude.map(p => p.categorie))];
      categoriesInCatalogue.forEach((cat, index) => {
        const count = produitsToInclude.filter(p => p.categorie === cat).length;
        doc.text(`${index + 1}. ${cat} (${count} produit${count > 1 ? 's' : ''})`, 30, yPosition);
        yPosition += 10;
        
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
      });

      // Produits par catégorie
      for (const categorie of categoriesInCatalogue) {
        doc.addPage();
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 150, 243);
        doc.text(categorie, 20, 30);
        doc.setTextColor(0, 0, 0);
        
        yPosition = 45;
        
        const produitsCategorie = produitsToInclude.filter(p => p.categorie === categorie);
        
        for (const produit of produitsCategorie) {
          // Vérifier si on a assez de place
          if (yPosition > 240) {
            doc.addPage();
            yPosition = 30;
          }
          
          // Nom du produit
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(produit.nom, 20, yPosition);
          yPosition += 8;
          
          // Description
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          const descLines = doc.splitTextToSize(produit.description_courte || '', 170);
          doc.text(descLines, 20, yPosition);
          yPosition += descLines.length * 5 + 3;
          
          // Prix
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(33, 150, 243);
          if (produit.prix_unitaire) {
            doc.text(`${produit.prix_unitaire.toLocaleString()} FCFA`, 20, yPosition);
          } else if (produit.prix_a_partir_de) {
            doc.text(`À partir de ${produit.prix_a_partir_de.toLocaleString()} FCFA`, 20, yPosition);
          } else {
            doc.text('Sur devis', 20, yPosition);
          }
          doc.setTextColor(0, 0, 0);
          yPosition += 8;
          
          // Délai
          if (produit.delai_estime) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'italic');
            doc.text(`Délai: ${produit.delai_estime}`, 20, yPosition);
            yPosition += 6;
          }
          
          // Options
          if (produit.options_personnalisables && produit.options_personnalisables.length > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Options: ${produit.options_personnalisables.join(', ')}`, 20, yPosition);
            yPosition += 6;
          }
          
          // Ligne de séparation
          doc.setDrawColor(200, 200, 200);
          doc.line(20, yPosition, 190, yPosition);
          yPosition += 10;
        }
      }
      
      // Pied de page sur toutes les pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          'Imprimerie Ogooué - Moanda, Gabon - imprimerieogooue@gmail.com',
          105,
          290,
          { align: 'center' }
        );
      }
      
      // Sauvegarder
      const fileName = `Catalogue_Ogooue_${generationType}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success('Catalogue PDF généré avec succès');
      onClose();
    } catch (e) {
      console.error('PDF generation error:', e);
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold mb-3 block">Type de catalogue</Label>
        <RadioGroup value={generationType} onValueChange={setGenerationType}>
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="complet" id="complet" />
            <Label htmlFor="complet" className="flex-1 cursor-pointer">
              <span className="font-medium">Catalogue complet</span>
              <p className="text-sm text-slate-500">Tous les produits actifs et partageables</p>
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="categorie" id="categorie" />
            <Label htmlFor="categorie" className="flex-1 cursor-pointer">
              <span className="font-medium">Par catégorie</span>
              <p className="text-sm text-slate-500">Produits d'une catégorie spécifique</p>
            </Label>
          </div>
          
          {selectedProduits.length > 0 && (
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-slate-50">
              <RadioGroupItem value="personnalise" id="personnalise" />
              <Label htmlFor="personnalise" className="flex-1 cursor-pointer">
                <span className="font-medium">Sélection personnalisée</span>
                <p className="text-sm text-slate-500">
                  {selectedProduits.length} produit(s) sélectionné(s)
                </p>
              </Label>
            </div>
          )}
        </RadioGroup>
      </div>

      {generationType === 'categorie' && (
        <div>
          <Label>Choisir une catégorie</Label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionnez une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Aperçu:</strong> Le catalogue inclura{' '}
          {generationType === 'complet' && `${produits.filter(p => p.actif && p.partage_client).length} produits`}
          {generationType === 'categorie' && selectedCategory && 
            `${produits.filter(p => p.actif && p.partage_client && p.categorie === selectedCategory).length} produits de la catégorie ${selectedCategory}`}
          {generationType === 'personnalise' && `${selectedProduits.length} produits sélectionnés`}
        </p>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Annuler
        </Button>
        <Button
          onClick={generatePDF}
          disabled={generating || (generationType === 'categorie' && !selectedCategory)}
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <FileDown className="w-4 h-4 mr-2" />
              Générer le PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}