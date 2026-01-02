import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2,
  Download,
  Copy,
  Sparkles,
  BookOpen,
  FileCheck
} from 'lucide-react';
import RoleProtection from '@/components/auth/RoleProtection';
import AssistantIAClauses from '@/components/documents/AssistantIAClauses';
import GenerateurDocument from '@/components/documents/GenerateurDocument';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export default function ModelesDocuments() {
  const [user, setUser] = useState(null);
  const [modeles, setModeles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editingModele, setEditingModele] = useState(null);
  const [selectedModele, setSelectedModele] = useState(null);
  const [showAssistant, setShowAssistant] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    type_document: 'contrat_travail',
    description: '',
    contenu: '',
    variables: []
  });
  const [variableValues, setVariableValues] = useState({});
  const [modelesPredéfinis, setModelesPredéfinis] = useState([]);

  useEffect(() => {
    loadData();
    loadModelesPredéfinis();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, modelesData] = await Promise.all([
        base44.auth.me(),
        base44.entities.ModeleDocumentRH.list()
      ]);
      setUser(userData);
      setModeles(modelesData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadModelesPredéfinis = () => {
    const modeles = [
      {
        id: 'cdd',
        nom: 'Contrat de travail CDD',
        type_document: 'contrat_travail',
        description: 'Contrat à Durée Déterminée conforme au Code du Travail Gabonais',
        contenu: `CONTRAT DE TRAVAIL À DURÉE DÉTERMINÉE (CDD)

Entre les soussignés :

La Société {{nom_entreprise}}, dont le siège social est situé au {{adresse_entreprise}}, représentée par {{representant_entreprise}} agissant en qualité de {{fonction_representant}}, ci-après dénommée "L'Employeur".

ET

{{civilite}} {{nom_employe}}, ci-après dénommé(e) "L'Employé(e)".

Il a été convenu et arrêté ce qui suit :

Article 1 : OBJET DU CONTRAT
Le présent contrat a pour objet de définir les droits et les obligations des contractants pendant la durée des fonctions que le travailleur exercera au service de l'entreprise au regard de la législation et du Code du Travail Gabonais ainsi que des règlements qui en découlent.

Article 2 : DURÉE DU CONTRAT
Le présent contrat est conclu pour une durée déterminée de {{duree_contrat}} mois, prenant effet à partir du {{date_debut}}. Il peut être prorogé en conformité avec l'article 24 du Code du Travail Gabonais, dans la limite de deux renouvellements, sa durée totale, renouvellements compris, ne pouvant excéder 24 mois.

Article 3 : FONCTION
L'Employé(e) est engagé(e) en qualité de {{fonction}} et exercera ses fonctions au {{lieu_travail}}.

Article 4 : DURÉE ET HORAIRE DE TRAVAIL
La durée de travail hebdomadaire est fixée à {{heures_hebdomadaires}} heures, réparties sur {{jours_travail}} jours ouvrables. Le travail commence à {{heure_debut}}. Toutefois, le responsable pourra modifier cet horaire en fonction des exigences du moment.

Article 5 : PÉRIODE D'ESSAI
Conformément à l'article 45 du Code du Travail Gabonais, une période d'essai de {{duree_essai}} mois est prévue. Cette période d'essai pourra être rompue avant terme, sans formalisme ni préavis, en accord avec les dispositions de l'article 58 du Code du Travail Gabonais.

Article 6 : SALAIRE
Le salaire fixé pour le présent contrat est de {{salaire}} FCFA par mois. Toute modification du montant du salaire devra faire l'objet d'un avenant écrit au présent contrat, dûment signé par les deux parties.

Article 7 : CLAUSES ADDITIONNELLES

Clause de Confidentialité : L'Employé(e) s'engage formellement à ne pas divulguer d'informations confidentielles de l'entreprise à des tiers, que ce soient des concurrents, fournisseurs, clients, collègues ou proches, pendant et après la durée du contrat de travail.

Clause de Non-concurrence : L'Employé(e) s'engage à ne pas exercer d'activité concurrente de manière déloyale à l'employeur pendant la durée du contrat et après son expiration, conformément à l'article 52 du Code du Travail Gabonais.

Article 8 : CONDITIONS DE TRAVAIL - EXCLUSIVITÉ
L'Employé(e) devra consacrer tout son temps et apporter tous ses soins à la bonne marche de l'entreprise dans le cadre et les limites de ses attributions telles qu'elles ont été définies.

Article 9 : CERTIFICAT DE TRAVAIL
Conformément à l'article 96 du Code du Travail Gabonais, l'Employeur s'engage à délivrer à l'Employé(e), à l'expiration du contrat de travail, un certificat de travail indiquant les dates d'entrée et de sortie, la nature et les dates des emplois occupés dans l'entreprise, ainsi que sa catégorie professionnelle.

Article 10 : LOI APPLICABLE
Le présent contrat de travail est régi par le Code du Travail Gabonais applicable à l'entreprise.

Le présent contrat de travail est fait en double exemplaire, chacune des parties reconnaissant par sa signature en avoir reçu un original.

Fait, à {{lieu_signature}}, le {{date_signature}}.

Pour l'Employeur,
_________________________ (lu et approuvé)
{{representant_entreprise}}

Pour L'employé(e),
_________________________ (lu et approuvé)
{{nom_employe}}`,
        variables: [
          { nom: 'nom_entreprise', libelle: 'Nom de l\'entreprise', type: 'texte', obligatoire: true },
          { nom: 'adresse_entreprise', libelle: 'Adresse de l\'entreprise', type: 'texte', obligatoire: true },
          { nom: 'representant_entreprise', libelle: 'Nom du représentant', type: 'texte', obligatoire: true },
          { nom: 'fonction_representant', libelle: 'Fonction du représentant', type: 'texte', obligatoire: true },
          { nom: 'civilite', libelle: 'Civilité (Monsieur/Madame)', type: 'texte', obligatoire: true },
          { nom: 'nom_employe', libelle: 'Nom de l\'employé', type: 'texte', obligatoire: true },
          { nom: 'duree_contrat', libelle: 'Durée du contrat (mois)', type: 'nombre', obligatoire: true },
          { nom: 'date_debut', libelle: 'Date de début', type: 'date', obligatoire: true },
          { nom: 'fonction', libelle: 'Fonction', type: 'texte', obligatoire: true },
          { nom: 'lieu_travail', libelle: 'Lieu de travail', type: 'texte', obligatoire: true },
          { nom: 'heures_hebdomadaires', libelle: 'Heures hebdomadaires', type: 'nombre', obligatoire: true },
          { nom: 'jours_travail', libelle: 'Jours de travail', type: 'nombre', obligatoire: true },
          { nom: 'heure_debut', libelle: 'Heure de début', type: 'texte', obligatoire: true },
          { nom: 'duree_essai', libelle: 'Durée période d\'essai (mois)', type: 'nombre', obligatoire: true },
          { nom: 'salaire', libelle: 'Salaire mensuel (FCFA)', type: 'nombre', obligatoire: true },
          { nom: 'lieu_signature', libelle: 'Lieu de signature', type: 'texte', obligatoire: true },
          { nom: 'date_signature', libelle: 'Date de signature', type: 'date', obligatoire: true }
        ]
      },
      {
        id: 'bail',
        nom: 'Contrat de bail commercial',
        type_document: 'contrat_bail',
        description: 'Contrat de bail pour local commercial conforme à la législation gabonaise',
        contenu: `CONTRAT DE BAIL COMMERCIAL

ENTRE:

Locataire : {{nom_locataire}}
Adresse du Locataire : {{adresse_locataire}}

Propriétaire/Bailleur : {{nom_proprietaire}}
Adresse du Propriétaire : {{adresse_proprietaire}}

Emplacement du Local: {{adresse_local}}

1. Objet du Contrat :
Le présent contrat de bail a pour objet la location d'un local commercial "tous commerces" situé à l'adresse mentionnée ci-dessus. Le locataire s'engage à utiliser ce local uniquement à des fins commerciales conformément à la législation en vigueur au Gabon.

2. Durée du Contrat :
La durée du présent contrat est conclue pour une durée de {{duree_bail}} ans renouvelable (bail classique 3-6-9). Le contrat prend effet à partir du {{date_debut_bail}}.

3. Loyers et Modalités de Paiement :
Le montant du loyer est de {{montant_loyer}} FCFA par mois payable à partir du {{date_debut_paiement}} avec une déduction progressive des frais des travaux engagés à cette date et payé chaque 11 du mois.

Le contrat inclus une révision triennale permettant une augmentation à la fin de la 3ème, 6ème, et 9ème année.

3.1 Travaux et Modalités Convenues :
Le bailleur accorde au preneur une période de {{periode_travaux}} mois, à compter du {{date_debut_bail}}, pour réaliser des travaux d'aménagement. Pendant cette période, aucun loyer ne sera exigé.

À partir du {{date_debut_paiement}}, le loyer sera dû, avec une déduction progressive des frais des travaux engagés, sur présentation du devis final. La déduction sera appliquée jusqu'à ce que la somme totale des travaux soit entièrement compensée.

Le bailleur pourra vérifier la conformité des travaux et demander les justificatifs nécessaires.

4. Obligations du Locataire :
Le locataire s'engage à :
• Utiliser le local conformément à la législation en vigueur au Gabon.
• Payer le loyer et les charges associées en temps voulu.
• Entretenir le local en bon état, sauf usure normale.
• Obtenir toutes les autorisations nécessaires pour l'exercice de son activité commerciale.
• Respecter toutes les règles et réglementations en vigueur dans la zone où se trouve le local.

5. Obligations du Propriétaire :
La propriétaire s'engage à :
• Fournir un local en bon état de fonctionnement.
• Ne pas interférer avec l'utilisation du local par le locataire.
• Assurer que le locataire bénéficie de la jouissance paisible du local.

6. Résiliation du Contrat :
Le présent contrat pourra être résilié dans les cas prévus par la législation gabonaise en vigueur. En cas de résiliation à la fin du contrat, un préavis de {{preavis_mois}} mois sera donné par la partie résiliante à l'autre partie.

7. Loi Applicable :
Ce contrat est soumis à la législation en vigueur au Gabon.

En foi de quoi, les parties ont signé le présent contrat de bail en deux exemplaires, à {{lieu_signature}} le {{date_signature}}.

Signature du Locataire :
_________________________
{{nom_locataire}}

Signature du bailleur :
_________________________
{{nom_proprietaire}}

Date: {{date_signature}}`,
        variables: [
          { nom: 'nom_locataire', libelle: 'Nom du locataire', type: 'texte', obligatoire: true },
          { nom: 'adresse_locataire', libelle: 'Adresse du locataire', type: 'texte', obligatoire: true },
          { nom: 'nom_proprietaire', libelle: 'Nom du propriétaire', type: 'texte', obligatoire: true },
          { nom: 'adresse_proprietaire', libelle: 'Adresse du propriétaire', type: 'texte', obligatoire: true },
          { nom: 'adresse_local', libelle: 'Adresse du local', type: 'texte', obligatoire: true },
          { nom: 'duree_bail', libelle: 'Durée du bail (années)', type: 'nombre', obligatoire: true },
          { nom: 'date_debut_bail', libelle: 'Date de début du bail', type: 'date', obligatoire: true },
          { nom: 'montant_loyer', libelle: 'Montant du loyer mensuel (FCFA)', type: 'nombre', obligatoire: true },
          { nom: 'date_debut_paiement', libelle: 'Date de début du paiement', type: 'date', obligatoire: true },
          { nom: 'periode_travaux', libelle: 'Période de travaux (mois)', type: 'nombre', obligatoire: false },
          { nom: 'preavis_mois', libelle: 'Préavis de résiliation (mois)', type: 'nombre', obligatoire: true },
          { nom: 'lieu_signature', libelle: 'Lieu de signature', type: 'texte', obligatoire: true },
          { nom: 'date_signature', libelle: 'Date de signature', type: 'date', obligatoire: true }
        ]
      }
    ];
    setModelesPredéfinis(modeles);
  };

  const utiliserModelePredéfini = (modelePredefini) => {
    setFormData({
      nom: modelePredefini.nom,
      type_document: modelePredefini.type_document,
      description: modelePredefini.description,
      contenu: modelePredefini.contenu,
      variables: modelePredefini.variables
    });
    setShowForm(true);
    toast.success('Modèle pré-défini chargé');
  };

  const handleSave = async () => {
    try {
      if (editingModele) {
        await base44.entities.ModeleDocumentRH.update(editingModele.id, formData);
        toast.success('Modèle mis à jour');
      } else {
        await base44.entities.ModeleDocumentRH.create(formData);
        toast.success('Modèle créé');
      }
      setShowForm(false);
      setEditingModele(null);
      setFormData({
        nom: '',
        type_document: 'contrat_travail',
        description: '',
        contenu: '',
        variables: []
      });
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Confirmer la suppression ?')) return;
    try {
      await base44.entities.ModeleDocumentRH.delete(id);
      toast.success('Modèle supprimé');
      loadData();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const addVariable = () => {
    setFormData({
      ...formData,
      variables: [
        ...formData.variables,
        { nom: '', libelle: '', type: 'texte', obligatoire: false }
      ]
    });
  };

  const updateVariable = (index, field, value) => {
    const newVariables = [...formData.variables];
    newVariables[index][field] = value;
    setFormData({ ...formData, variables: newVariables });
  };

  const removeVariable = (index) => {
    setFormData({
      ...formData,
      variables: formData.variables.filter((_, i) => i !== index)
    });
  };

  const genererDocument = () => {
    if (!selectedModele) return;

    let contenu = selectedModele.contenu;
    
    // Remplacer les variables
    selectedModele.variables?.forEach(variable => {
      const valeur = variableValues[variable.nom] || '';
      contenu = contenu.replace(new RegExp(`{{${variable.nom}}}`, 'g'), valeur);
    });

    // Générer PDF
    const pdf = new jsPDF();
    
    pdf.setFontSize(16);
    pdf.text(selectedModele.nom, 20, 20);
    
    pdf.setFontSize(10);
    const lignes = pdf.splitTextToSize(contenu, 170);
    pdf.text(lignes, 20, 35);
    
    pdf.save(`${selectedModele.nom.replace(/\s+/g, '-')}.pdf`);
    toast.success('Document généré');
    setShowGenerate(false);
    setSelectedModele(null);
    setVariableValues({});
  };

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Modèles de documents RH</h1>
            <p className="text-slate-500">Créez et gérez vos modèles de documents personnalisés</p>
          </div>
          <Button
            onClick={() => {
              setEditingModele(null);
              setFormData({
                nom: '',
                type_document: 'contrat_travail',
                description: '',
                contenu: '',
                variables: []
              });
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau modèle
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="mes-modeles" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mes-modeles">Mes modèles ({modeles.length})</TabsTrigger>
            <TabsTrigger value="bibliotheque">Bibliothèque prédéfinie</TabsTrigger>
          </TabsList>

          {/* Mes modèles */}
          <TabsContent value="mes-modeles" className="space-y-4">
            <div className="grid gap-4">
          {modeles.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun modèle pour le moment</p>
              </CardContent>
            </Card>
          ) : (
            modeles.map(modele => (
              <Card key={modele.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900">{modele.nom}</h3>
                          <Badge className="bg-blue-100 text-blue-700">{modele.type_document}</Badge>
                          {modele.actif ? (
                            <Badge className="bg-emerald-100 text-emerald-700">Actif</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700">Inactif</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{modele.description}</p>
                        <p className="text-xs text-slate-500">
                          {modele.variables?.length || 0} variable(s) personnalisable(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedModele(modele);
                          setShowAssistant(false);
                          setShowGenerate(true);
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingModele(modele);
                          setFormData(modele);
                          setShowAssistant(true);
                          setShowForm(true);
                        }}
                        className="text-purple-600"
                      >
                        <Sparkles className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingModele(modele);
                          setFormData(modele);
                          setShowForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(modele.id)}
                        className="text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
            </div>
          </TabsContent>

          {/* Bibliothèque prédéfinie */}
          <TabsContent value="bibliotheque" className="space-y-4">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <BookOpen className="w-6 h-6 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">
                      Modèles juridiques pré-rédigés
                    </h3>
                    <p className="text-sm text-slate-600">
                      Ces modèles sont basés sur vos documents existants et conformes à la législation gabonaise. 
                      Utilisez-les comme base pour créer vos propres modèles personnalisés.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {modelesPredéfinis.map(modele => (
                <Card key={modele.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <FileCheck className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900">{modele.nom}</h3>
                            <Badge className="bg-indigo-100 text-indigo-700">{modele.type_document}</Badge>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{modele.description}</p>
                          <p className="text-xs text-slate-500">
                            {modele.variables?.length || 0} variable(s) • Conforme législation gabonaise
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => utiliserModelePredéfini(modele)}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Utiliser ce modèle
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingModele ? 'Modifier' : 'Nouveau'} modèle</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulaire principal */}
              <div className="lg:col-span-2 space-y-4">
              <div>
                <Label>Nom du modèle</Label>
                <Input
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Contrat de travail CDI"
                />
              </div>

              <div>
                <Label>Type de document</Label>
                <select
                  value={formData.type_document}
                  onChange={(e) => setFormData({...formData, type_document: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="contrat_travail">Contrat de travail</option>
                  <option value="contrat_bail">Contrat de bail</option>
                  <option value="contrat_partenariat">Contrat de partenariat</option>
                  <option value="avenant">Avenant</option>
                  <option value="attestation">Attestation</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brève description..."
                />
              </div>

              <div>
                <Label>Contenu du document</Label>
                <p className="text-xs text-slate-500 mb-2">
                  Utilisez {"{{nom_variable}}"} pour insérer des variables personnalisables
                </p>
                <Textarea
                  value={formData.contenu}
                  onChange={(e) => setFormData({...formData, contenu: e.target.value})}
                  placeholder="Contenu du document avec variables..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Variables personnalisables</Label>
                  <Button size="sm" variant="outline" onClick={addVariable}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.variables?.map((variable, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Nom (ex: nom_employe)"
                          value={variable.nom}
                          onChange={(e) => updateVariable(index, 'nom', e.target.value)}
                        />
                        <Input
                          placeholder="Libellé (ex: Nom de l'employé)"
                          value={variable.libelle}
                          onChange={(e) => updateVariable(index, 'libelle', e.target.value)}
                        />
                        <select
                          value={variable.type}
                          onChange={(e) => updateVariable(index, 'type', e.target.value)}
                          className="p-2 border rounded-lg"
                        >
                          <option value="texte">Texte</option>
                          <option value="date">Date</option>
                          <option value="nombre">Nombre</option>
                          <option value="email">Email</option>
                        </select>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeVariable(index)}
                        className="text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => {
                    setShowForm(false);
                    setShowAssistant(false);
                  }}>
                    Annuler
                  </Button>
                  <Button onClick={handleSave} disabled={!formData.nom || !formData.contenu}>
                    Enregistrer
                  </Button>
                </div>
              </div>

              {/* Assistant IA */}
              {showAssistant && (
                <div className="lg:col-span-1">
                  <AssistantIAClauses
                    typeDocument={formData.type_document}
                    contenuActuel={formData.contenu}
                    onSuggestionAccepted={(texte) => {
                      setFormData({
                        ...formData,
                        contenu: formData.contenu + texte
                      });
                    }}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Generate Dialog */}
        {showGenerate && selectedModele && (
          <GenerateurDocument
            modele={selectedModele}
            onClose={() => {
              setShowGenerate(false);
              setSelectedModele(null);
            }}
          />
        )}

        {/* Old Generate Dialog - Keep for backward compatibility */}
        <Dialog open={false} onOpenChange={setShowGenerate}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Générer le document</DialogTitle>
            </DialogHeader>
            {selectedModele && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">{selectedModele.description}</p>
                
                {selectedModele.variables?.map(variable => (
                  <div key={variable.nom}>
                    <Label>{variable.libelle}</Label>
                    <Input
                      type={variable.type === 'date' ? 'date' : variable.type === 'nombre' ? 'number' : variable.type === 'email' ? 'email' : 'text'}
                      value={variableValues[variable.nom] || ''}
                      onChange={(e) => setVariableValues({...variableValues, [variable.nom]: e.target.value})}
                      placeholder={`Entrez ${variable.libelle.toLowerCase()}`}
                    />
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowGenerate(false)}>
                    Annuler
                  </Button>
                  <Button onClick={genererDocument} className="bg-blue-600 hover:bg-blue-700">
                    <Download className="w-4 h-4 mr-2" />
                    Générer PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleProtection>
  );
}