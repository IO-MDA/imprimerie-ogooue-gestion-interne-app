import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import RoleProtection from '@/components/auth/RoleProtection';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  FileText, 
  Receipt,
  Eye,
  Edit,
  Printer,
  Send,
  CheckCircle,
  ArrowRight,
  Download,
  Package,
  Truck,
  MapPin,
  Clock,
  XCircle
} from 'lucide-react';
import jsPDF from 'jspdf';
import DocumentForm from '@/components/documents/DocumentForm';
import ChangerStatutDialog from '@/components/commandes/ChangerStatutDialog';
import moment from 'moment';
import { toast } from 'sonner';

export default function DevisFactures() {
  const [devis, setDevis] = useState([]);
  const [factures, setFactures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('devis');
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [showStatutDialog, setShowStatutDialog] = useState(false);
  const [selectedFacture, setSelectedFacture] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [devisData, facturesData, userData] = await Promise.all([
      base44.entities.Devis.list('-created_date'),
      base44.entities.Facture.list('-created_date'),
      base44.auth.me()
    ]);
    setDevis(devisData);
    setFactures(facturesData);
    setUser(userData);
    setIsLoading(false);
  };

  const handleSaveDevis = async (data) => {
    if (editingDoc) {
      await base44.entities.Devis.update(editingDoc.id, data);
      toast.success('Devis mis à jour');
    } else {
      await base44.entities.Devis.create(data);
      toast.success('Devis créé');
    }
    setShowForm(false);
    setEditingDoc(null);
    loadData();
  };

  const handleSaveFacture = async (data) => {
    if (editingDoc) {
      await base44.entities.Facture.update(editingDoc.id, data);
      toast.success('Facture mise à jour');
    } else {
      await base44.entities.Facture.create(data);
      toast.success('Facture créée');
    }
    setShowForm(false);
    setEditingDoc(null);
    loadData();
  };

  const convertToFacture = async (devisItem) => {
    const factureData = {
      devis_id: devisItem.id,
      client_id: devisItem.client_id,
      client_nom: devisItem.client_nom,
      client_email: devisItem.client_email,
      client_telephone: devisItem.client_telephone,
      client_adresse: devisItem.client_adresse,
      date_emission: new Date().toISOString().split('T')[0],
      date_echeance: moment().add(30, 'days').format('YYYY-MM-DD'),
      lignes: devisItem.lignes,
      sous_total: devisItem.sous_total,
      tva: devisItem.tva,
      total: devisItem.total,
      notes: devisItem.notes,
      numero: `FAC-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    };
    await base44.entities.Facture.create(factureData);
    await base44.entities.Devis.update(devisItem.id, { statut: 'facture' });
    toast.success('Facture créée à partir du devis');
    loadData();
  };

  const updateStatus = async (type, id, statut) => {
    if (type === 'devis') {
      await base44.entities.Devis.update(id, { statut });
    } else {
      await base44.entities.Facture.update(id, { 
        statut,
        date_paiement: statut === 'payee' ? new Date().toISOString().split('T')[0] : null
      });
    }
    toast.success('Statut mis à jour');
    loadData();
  };

  const downloadPDF = (doc, type) => {
    const pdf = new jsPDF();
    
    // Header
    pdf.setFillColor(37, 99, 235);
    pdf.rect(0, 0, 210, 40, 'F');
    
    // Add logo
    const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/c22c6636f_LOGO-BON-FINAL1.png';
    try {
      pdf.addImage(logoUrl, 'PNG', 165, 5, 30, 30);
    } catch (e) {
      console.log('Logo non chargé');
    }
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.text('Imprimerie OGOOUE', 20, 20);
    pdf.setFontSize(10);
    pdf.text('Moanda, Gabon', 20, 28);
    pdf.text('Carrefour Fina en face de FINAM', 20, 34);
    
    // Document type and number
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
    pdf.text(type === 'devis' ? 'DEVIS' : 'FACTURE', 150, 20);
    pdf.setFontSize(12);
    pdf.text(doc.numero, 150, 28);
    
    // Client info
    pdf.setFontSize(10);
    pdf.text('Client:', 20, 55);
    pdf.setFontSize(12);
    pdf.text(doc.client_nom, 20, 62);
    if (doc.client_email) pdf.setFontSize(9) && pdf.text(doc.client_email, 20, 68);
    if (doc.client_telephone) pdf.text(doc.client_telephone, 20, 73);
    
    // Dates
    pdf.setFontSize(10);
    pdf.text(`Date: ${moment(doc.date_emission).format('DD/MM/YYYY')}`, 150, 55);
    if (doc.date_validite) {
      pdf.text(`Validité: ${moment(doc.date_validite).format('DD/MM/YYYY')}`, 150, 62);
    }
    if (doc.date_echeance) {
      pdf.text(`Échéance: ${moment(doc.date_echeance).format('DD/MM/YYYY')}`, 150, 62);
    }
    
    // Table header
    let y = 90;
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, y, 170, 10, 'F');
    pdf.setFontSize(10);
    pdf.text('Description', 25, y + 7);
    pdf.text('Qté', 120, y + 7);
    pdf.text('P.U.', 140, y + 7);
    pdf.text('Total', 165, y + 7);
    
    // Lines
    y += 15;
    doc.lignes?.forEach(ligne => {
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }
      pdf.setFontSize(9);
      const description = String(ligne.description || '').substring(0, 50);
      const quantite = String(ligne.quantite || 0);
      const prixUnitaire = String(Math.round(ligne.prix_unitaire || 0));
      const total = String(Math.round(ligne.total || 0));
      
      pdf.text(description, 25, y);
      pdf.text(quantite, 120, y);
      pdf.text(prixUnitaire + ' F', 140, y);
      pdf.text(total + ' F', 165, y);
      y += 8;
    });
    
    // Totals
    y += 10;
    pdf.setFontSize(10);
    const sousTotal = String(Math.round(doc.sous_total || 0));
    const montantTVA = String(Math.round(((doc.sous_total || 0) * (doc.tva || 0)) / 100));
    const total = String(Math.round(doc.total || 0));
    
    pdf.text('Sous-total:', 130, y);
    pdf.text(sousTotal + ' FCFA', 165, y);
    y += 7;
    pdf.text('TVA (' + (doc.tva || 0) + '%):', 130, y);
    pdf.text(montantTVA + ' FCFA', 165, y);
    y += 10;
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('TOTAL:', 130, y);
    pdf.text(total + ' FCFA', 165, y);
    
    // Notes
    if (doc.notes) {
      y += 15;
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      pdf.text('Notes:', 20, y);
      pdf.text(doc.notes, 20, y + 5, { maxWidth: 170 });
    }
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text('RCCM : RG/FCV 2023A0407 | NIF : 256598U', 105, 275, { align: 'center' });
    pdf.text('Siege social : Carrefour Fina en face de Finam Moanda - Gabon', 105, 280, { align: 'center' });
    pdf.text('Tel : 060 44 46 34 / 074 42 41 42 | Email : imprimerieogooue@gmail.com', 105, 285, { align: 'center' });
    
    pdf.save(`${doc.numero}.pdf`);
    toast.success('PDF téléchargé');
  };

  const getStatusBadge = (type, statut) => {
    const configs = {
      devis: {
        brouillon: { label: 'Brouillon', class: 'bg-slate-100 text-slate-700' },
        envoye: { label: 'Envoyé', class: 'bg-blue-100 text-blue-700' },
        accepte: { label: 'Accepté', class: 'bg-emerald-100 text-emerald-700' },
        refuse: { label: 'Refusé', class: 'bg-rose-100 text-rose-700' },
        expire: { label: 'Expiré', class: 'bg-amber-100 text-amber-700' },
        facture: { label: 'Facturé', class: 'bg-violet-100 text-violet-700' }
      },
      facture: {
        brouillon: { label: 'Brouillon', class: 'bg-slate-100 text-slate-700' },
        envoyee: { label: 'Envoyée', class: 'bg-blue-100 text-blue-700' },
        payee: { label: 'Payée', class: 'bg-emerald-100 text-emerald-700' },
        en_retard: { label: 'En retard', class: 'bg-rose-100 text-rose-700' },
        annulee: { label: 'Annulée', class: 'bg-slate-100 text-slate-700' }
      }
    };
    const config = configs[type][statut] || { label: statut, class: 'bg-slate-100 text-slate-700' };
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  const getStatutCommandeBadge = (statut) => {
    const configs = {
      'en_attente': { label: 'En attente', icon: Clock, class: 'bg-slate-100 text-slate-700' },
      'en_preparation': { label: 'En préparation', icon: Package, class: 'bg-blue-100 text-blue-700' },
      'prete': { label: 'Prête', icon: CheckCircle, class: 'bg-purple-100 text-purple-700' },
      'expediee': { label: 'Expédiée', icon: Truck, class: 'bg-amber-100 text-amber-700' },
      'livree': { label: 'Livrée', icon: MapPin, class: 'bg-emerald-100 text-emerald-700' },
      'annulee': { label: 'Annulée', icon: XCircle, class: 'bg-rose-100 text-rose-700' }
    };
    const config = configs[statut] || configs['en_attente'];
    return <Badge className={config.class}>{config.label}</Badge>;
  };

  const filteredDevis = devis.filter(d => 
    d.client_nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.numero?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFactures = factures.filter(f => 
    f.client_nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.numero?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const DocumentCard = ({ doc, type }) => (
    <Card className="border-0 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              type === 'devis' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
            }`}>
              {type === 'devis' ? <FileText className="w-6 h-6 text-white" /> : <Receipt className="w-6 h-6 text-white" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-slate-900">{doc.numero}</h3>
                {getStatusBadge(type, doc.statut)}
                {type === 'facture' && doc.statut_commande && getStatutCommandeBadge(doc.statut_commande)}
              </div>
              <p className="text-sm text-slate-500 mt-1">{doc.client_nom}</p>
              <p className="text-xs text-slate-400">{moment(doc.date_emission).format('DD/MM/YYYY')}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-500">Total</p>
              <p className="font-bold text-slate-900">{(doc.total || 0).toLocaleString()} FCFA</p>
            </div>
            <div className="flex items-center gap-2">
              {type === 'facture' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setSelectedFacture(doc);
                    setShowStatutDialog(true);
                  }} 
                  className="text-blue-600"
                  title="Changer statut commande"
                >
                  <Package className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => downloadPDF(doc, type)} title="Télécharger PDF">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setSelectedDoc({ ...doc, type })}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => { setEditingDoc(doc); setActiveTab(type); setShowForm(true); }}>
                <Edit className="w-4 h-4" />
              </Button>
              {type === 'devis' && doc.statut === 'accepte' && (
                <Button variant="ghost" size="icon" onClick={() => convertToFacture(doc)} className="text-emerald-600">
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
              {type === 'facture' && doc.statut !== 'payee' && (
                <Button variant="ghost" size="icon" onClick={() => updateStatus('facture', doc.id, 'payee')} className="text-emerald-600">
                  <CheckCircle className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <RoleProtection allowedRoles={['admin']} user={user}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Devis & Factures</h1>
          <p className="text-slate-500">Créez et gérez vos documents commerciaux</p>
        </div>
        <Button 
          onClick={() => { setEditingDoc(null); setShowForm(true); }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouveau {activeTab === 'devis' ? 'devis' : 'facture'}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input 
          placeholder="Rechercher par client ou numéro..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="devis" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Devis ({devis.length})
          </TabsTrigger>
          <TabsTrigger value="factures" className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Factures ({factures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devis" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredDevis.length === 0 ? (
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun devis trouvé</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredDevis.map(d => <DocumentCard key={d.id} doc={d} type="devis" />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="factures" className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredFactures.length === 0 ? (
            <Card className="border-0 shadow-lg shadow-slate-200/50">
              <CardContent className="py-16 text-center">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucune facture trouvée</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredFactures.map(f => <DocumentCard key={f.id} doc={f} type="facture" />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDoc ? 'Modifier' : 'Nouveau'} {activeTab === 'devis' ? 'devis' : 'facture'}
            </DialogTitle>
          </DialogHeader>
          <DocumentForm 
            type={activeTab === 'devis' ? 'devis' : 'facture'}
            document={editingDoc}
            onSave={activeTab === 'devis' ? handleSaveDevis : handleSaveFacture}
            onCancel={() => { setShowForm(false); setEditingDoc(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDoc?.type === 'devis' ? 'Devis' : 'Facture'} {selectedDoc?.numero}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Imprimerie Ogooué</h2>
                  <p className="text-slate-500">Moanda, Gabon</p>
                  <p className="text-xs text-slate-400">Carrefour Fina en face de FINAM</p>
                </div>
                {getStatusBadge(selectedDoc.type, selectedDoc.statut)}
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm text-slate-500">Client</p>
                  <p className="font-medium">{selectedDoc.client_nom}</p>
                  {selectedDoc.client_email && <p className="text-sm text-slate-500">{selectedDoc.client_email}</p>}
                  {selectedDoc.client_telephone && <p className="text-sm text-slate-500">{selectedDoc.client_telephone}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Date d'émission</p>
                  <p className="font-medium">{moment(selectedDoc.date_emission).format('DD/MM/YYYY')}</p>
                  {selectedDoc.date_validite && (
                    <>
                      <p className="text-sm text-slate-500 mt-2">Valide jusqu'au</p>
                      <p className="font-medium">{moment(selectedDoc.date_validite).format('DD/MM/YYYY')}</p>
                    </>
                  )}
                  {selectedDoc.date_echeance && (
                    <>
                      <p className="text-sm text-slate-500 mt-2">Échéance</p>
                      <p className="font-medium">{moment(selectedDoc.date_echeance).format('DD/MM/YYYY')}</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Détail</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-slate-600">Description</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-600">Qté</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-600">Prix unit.</th>
                        <th className="text-right p-3 text-sm font-medium text-slate-600">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDoc.lignes?.map((ligne, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-3">{ligne.description}</td>
                          <td className="p-3 text-right">{ligne.quantite}</td>
                          <td className="p-3 text-right">{ligne.prix_unitaire?.toLocaleString()}</td>
                          <td className="p-3 text-right font-medium">{ligne.total?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sous-total</span>
                    <span>{(selectedDoc.sous_total || 0).toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TVA ({selectedDoc.tva}%)</span>
                    <span>{((selectedDoc.sous_total || 0) * (selectedDoc.tva || 0) / 100).toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span className="text-blue-600">{(selectedDoc.total || 0).toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>

              {selectedDoc.notes && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">{selectedDoc.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => downloadPDF(selectedDoc, selectedDoc.type)}>
                  <Download className="w-4 h-4 mr-2" />
                  Télécharger PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Changer Statut Commande Dialog */}
      <ChangerStatutDialog
        facture={selectedFacture}
        open={showStatutDialog}
        onClose={() => {
          setShowStatutDialog(false);
          setSelectedFacture(null);
        }}
        onSuccess={loadData}
      />
    </div>
    </RoleProtection>
  );
}