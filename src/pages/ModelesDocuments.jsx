import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2,
  Download,
  Copy
} from 'lucide-react';
import RoleProtection from '@/components/auth/RoleProtection';
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
  const [formData, setFormData] = useState({
    nom: '',
    type_document: 'contrat_travail',
    description: '',
    contenu: '',
    variables: []
  });
  const [variableValues, setVariableValues] = useState({});

  useEffect(() => {
    loadData();
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

        {/* Liste des modèles */}
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
                          setVariableValues({});
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

        {/* Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingModele ? 'Modifier' : 'Nouveau'} modèle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={!formData.nom || !formData.contenu}>
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Generate Dialog */}
        <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
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