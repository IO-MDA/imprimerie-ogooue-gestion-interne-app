import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { Download, User, Building } from 'lucide-react';

export default function GenerateurDocument({ modele, onClose }) {
  const [variableValues, setVariableValues] = useState({});
  const [employes, setEmployes] = useState([]);
  const [selectedEmploye, setSelectedEmploye] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadEmployes();
  }, []);

  const loadEmployes = async () => {
    try {
      const users = await base44.entities.User.list();
      setEmployes(users);
    } catch (e) {
      console.error(e);
    }
  };

  const remplirDepuisEmploye = () => {
    if (!selectedEmploye) return;
    
    const employe = employes.find(e => e.id === selectedEmploye);
    if (!employe) return;

    const mappingVariables = {
      'nom_employe': employe.full_name,
      'email_employe': employe.email,
      'date_debut': new Date().toISOString().split('T')[0],
      'date_signature': new Date().toLocaleDateString('fr-FR'),
      'lieu_signature': 'Moanda',
      'nom_employeur': 'IMPRIMERIE OGOOUÉ',
      'adresse_employeur': 'Carrefour Fina, en face de FINAM, Moanda, Gabon',
      'representant_employeur': 'Mr. Abakar SENOUSSI GASSIM'
    };

    setVariableValues(prev => ({
      ...prev,
      ...mappingVariables
    }));

    toast.success('Données employé chargées');
  };

  const genererDocument = async () => {
    setIsGenerating(true);
    try {
      let contenu = modele.contenu;

      // Remplacer les variables
      modele.variables?.forEach(variable => {
        const valeur = variableValues[variable.nom] || '';
        contenu = contenu.replace(new RegExp(`{{${variable.nom}}}`, 'g'), valeur);
      });

      // Vérifier les variables manquantes
      const variablesManquantes = modele.variables?.filter(v => 
        v.obligatoire && !variableValues[v.nom]
      );

      if (variablesManquantes && variablesManquantes.length > 0) {
        toast.error(`Variables obligatoires manquantes : ${variablesManquantes.map(v => v.libelle).join(', ')}`);
        setIsGenerating(false);
        return;
      }

      // Générer le PDF avec encodage UTF-8 pour les caractères français
      const pdf = new jsPDF();
      
      // En-tête avec logo
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const titre = modele.nom.toUpperCase();
      pdf.text(titre, 105, 20, { align: 'center' });
      
      // Ligne de séparation
      pdf.setLineWidth(0.5);
      pdf.line(20, 25, 190, 25);
      
      // Contenu
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      // Diviser le contenu en lignes
      const lignes = contenu.split('\n');
      let y = 35;
      
      lignes.forEach(ligne => {
        if (y > 270) {
          pdf.addPage();
          y = 20;
        }
        
        // Gérer les lignes longues
        if (ligne.length > 0) {
          const sousLignes = pdf.splitTextToSize(ligne, 170);
          sousLignes.forEach(sousLigne => {
            if (y > 270) {
              pdf.addPage();
              y = 20;
            }
            pdf.text(sousLigne, 20, y);
            y += 6;
          });
        } else {
          y += 6; // Ligne vide
        }
      });

      // Pied de page
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(150);
        pdf.text('IMPRIMERIE OGOOUE - Carrefour Fina, Moanda', 105, 285, { align: 'center' });
        pdf.text(`Page ${i} sur ${totalPages}`, 105, 290, { align: 'center' });
      }

      // Télécharger
      const nomFichier = `${modele.nom.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(nomFichier);
      
      toast.success('Document généré avec succès');
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Générer : {modele.nom}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sélection employé */}
          {modele.type_document === 'contrat_travail' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <Label className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4" />
                Pré-remplir depuis un employé
              </Label>
              <div className="flex gap-2">
                <select
                  value={selectedEmploye}
                  onChange={(e) => setSelectedEmploye(e.target.value)}
                  className="flex-1 p-2 border rounded-lg"
                >
                  <option value="">Sélectionner un employé...</option>
                  {employes.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.email})
                    </option>
                  ))}
                </select>
                <Button onClick={remplirDepuisEmploye} disabled={!selectedEmploye}>
                  Charger
                </Button>
              </div>
            </div>
          )}

          {/* Informations entreprise */}
          <div className="p-4 bg-slate-50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Building className="w-4 h-4 text-slate-600" />
              <h4 className="font-semibold text-slate-900">Informations de l'entreprise</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Raison sociale :</span>
                <p className="font-medium">IMPRIMERIE OGOOUÉ</p>
              </div>
              <div>
                <span className="text-slate-500">Représentant légal :</span>
                <p className="font-medium">Mr. Abakar SENOUSSI GASSIM</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">Adresse :</span>
                <p className="font-medium">Carrefour Fina, en face de FINAM, Moanda, Gabon</p>
              </div>
            </div>
          </div>

          {/* Variables du document */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">
              Remplir les informations du document
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modele.variables?.map(variable => (
                <div key={variable.nom}>
                  <Label>
                    {variable.libelle}
                    {variable.obligatoire && <span className="text-rose-500 ml-1">*</span>}
                  </Label>
                  <Input
                    type={
                      variable.type === 'date' ? 'date' :
                      variable.type === 'nombre' ? 'number' :
                      variable.type === 'email' ? 'email' :
                      'text'
                    }
                    value={variableValues[variable.nom] || ''}
                    onChange={(e) => setVariableValues({
                      ...variableValues,
                      [variable.nom]: e.target.value
                    })}
                    placeholder={`Entrez ${variable.libelle.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Aperçu */}
          <div className="p-4 bg-slate-50 rounded-lg border max-h-60 overflow-y-auto">
            <h4 className="font-semibold text-slate-900 mb-2">Aperçu</h4>
            <div className="text-sm text-slate-700 whitespace-pre-wrap">
              {modele.contenu.split('\n').slice(0, 15).map((ligne, idx) => {
                let ligneAffichee = ligne;
                modele.variables?.forEach(variable => {
                  const valeur = variableValues[variable.nom] || `[${variable.libelle}]`;
                  ligneAffichee = ligneAffichee.replace(
                    new RegExp(`{{${variable.nom}}}`, 'g'),
                    valeur
                  );
                });
                return <p key={idx}>{ligneAffichee}</p>;
              })}
              {modele.contenu.split('\n').length > 15 && (
                <p className="text-slate-400 italic">... (contenu tronqué)</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              onClick={genererDocument}
              disabled={isGenerating}
              className="bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Génération...' : 'Générer le PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}