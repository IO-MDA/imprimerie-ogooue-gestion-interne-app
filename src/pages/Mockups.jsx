import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Shirt, 
  Coffee,
  Mail,
  Download,
  Loader2,
  CheckCircle,
  Image as ImageIcon,
  Palette,
  Sparkles,
  FileText,
  CreditCard,
  Flag,
  SquareStack
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const MOCKUP_TYPES = [
  { id: 'mug', name: 'Mug', icon: Coffee, colors: ['blanc', 'noir', 'rouge', 'bleu'] },
  { id: 'tshirt', name: 'T-Shirt', icon: Shirt, colors: ['blanc', 'noir', 'rouge', 'bleu', 'vert', 'jaune', 'gris'] },
  { id: 'polo', name: 'Polo', icon: Shirt, colors: ['blanc', 'noir', 'marine', 'rouge', 'gris'] },
  { id: 'casquette', name: 'Casquette', icon: Palette, colors: ['noir', 'blanc', 'rouge', 'bleu', 'vert'] },
  { id: 'banderole', name: 'Banderole', icon: Flag, sizes: ['2x1m', '3x1m', '4x2m', '5x2m', '6x3m'] },
  { id: 'panneau', name: 'Panneau publicitaire', icon: SquareStack, sizes: ['A3', 'A2', 'A1', 'A0', '3x4m'] },
  { id: 'flyer', name: 'Flyer', icon: FileText, sizes: ['A6', 'A5', 'A4'] },
  { id: 'carte', name: 'Carte de visite', icon: CreditCard, sizes: ['standard (85x55mm)'] }
];

export default function Mockups() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [selectedType, setSelectedType] = useState('tshirt');
  const [selectedColor, setSelectedColor] = useState('blanc');
  const [selectedSize, setSelectedSize] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedMockups, setGeneratedMockups] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setIsLoading(true);
    const userData = await base44.auth.me();
    setUser(userData);
    setIsLoading(false);
  };

  const isAdmin = user?.role === 'admin';

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    setUploadedFile(file);
    toast.info('Upload en cours...');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedFileUrl(file_url);
      toast.success('Maquette uploadée avec succès');
    } catch (e) {
      toast.error('Erreur lors de l\'upload');
      setUploadedFile(null);
    }
  };

  const getCurrentMockupType = () => {
    return MOCKUP_TYPES.find(t => t.id === selectedType);
  };

  const generateMockups = async () => {
    if (!uploadedFileUrl) {
      toast.error('Veuillez d\'abord uploader une maquette');
      return;
    }

    setGenerating(true);
    setGeneratedMockups([]);
    
    try {
      const mockupType = getCurrentMockupType();
      const basePrompt = `Professional product mockup of a ${mockupType.name}`;
      
      let detailPrompt = '';
      if (mockupType.colors) {
        detailPrompt = `${selectedColor} color`;
      } else if (mockupType.sizes) {
        detailPrompt = `size ${selectedSize || mockupType.sizes[0]}`;
      }

      // Générer 3 angles différents
      const angles = [
        { name: 'Vue de face', prompt: `${basePrompt}, ${detailPrompt}, front view, centered, professional studio lighting, high quality, realistic` },
        { name: 'Vue de côté', prompt: `${basePrompt}, ${detailPrompt}, side view, 45 degree angle, professional studio lighting, high quality, realistic` },
        { name: 'Vue perspective', prompt: `${basePrompt}, ${detailPrompt}, perspective view, slightly angled, professional studio lighting, high quality, realistic` }
      ];

      const mockups = [];
      
      for (const angle of angles) {
        toast.info(`Génération: ${angle.name}...`);
        
        const result = await base44.integrations.Core.GenerateImage({
          prompt: angle.prompt,
          existing_image_urls: [uploadedFileUrl]
        });

        mockups.push({
          angle: angle.name,
          url: result.url
        });
      }

      setGeneratedMockups(mockups);
      toast.success('Mockups générés avec succès!');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de la génération des mockups');
    } finally {
      setGenerating(false);
    }
  };

  const generatePDF = async () => {
    if (generatedMockups.length === 0) return null;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // En-tête
    pdf.setFillColor(59, 130, 246);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.text('Imprimerie Ogooué', 20, 25);
    
    pdf.setFontSize(12);
    pdf.text('Proposition de Mockup', 20, 35);

    // Info client
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.text(`Client: ${clientName}`, 20, 55);
    pdf.text(`Type: ${getCurrentMockupType().name}`, 20, 65);
    if (selectedColor) pdf.text(`Couleur: ${selectedColor}`, 20, 75);
    if (selectedSize) pdf.text(`Taille: ${selectedSize}`, 20, 75);

    // Ajouter les images
    let yPosition = 90;
    
    for (let i = 0; i < generatedMockups.length; i++) {
      const mockup = generatedMockups[i];
      
      if (i > 0) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.text(mockup.angle, 20, yPosition);
      
      try {
        // Charger l'image
        const img = await fetch(mockup.url);
        const blob = await img.blob();
        const reader = new FileReader();
        
        await new Promise((resolve) => {
          reader.onloadend = () => {
            const imgData = reader.result;
            // Ajouter l'image au PDF
            pdf.addImage(imgData, 'JPEG', 20, yPosition + 10, pageWidth - 40, 120);
            resolve();
          };
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        console.error('Erreur chargement image:', e);
      }
    }

    // Pied de page sur la dernière page
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Imprimerie Ogooué - Libreville, Gabon', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text('Contactez-nous pour concrétiser votre projet', pageWidth / 2, pageHeight - 5, { align: 'center' });

    return pdf.output('datauristring');
  };

  const sendEmail = async () => {
    if (!clientEmail || !clientName) {
      toast.error('Veuillez renseigner le nom et l\'email du client');
      return;
    }

    if (generatedMockups.length === 0) {
      toast.error('Aucun mockup à envoyer');
      return;
    }

    setSendingEmail(true);

    try {
      // Générer le PDF
      const pdfData = await generatePDF();

      // Créer le contenu HTML de l'email
      const mockupType = getCurrentMockupType();
      let emailBody = `
Bonjour ${clientName},

Nous vous remercions pour votre intérêt pour nos services.

Veuillez trouver ci-joint la proposition de mockup pour votre projet :
- Type: ${mockupType.name}
${selectedColor ? `- Couleur: ${selectedColor}` : ''}
${selectedSize ? `- Taille: ${selectedSize}` : ''}

Les mockups sont présentés sous différents angles pour vous donner une meilleure vision du rendu final.

Voici les aperçus :
`;

      // Ajouter les liens des mockups dans l'email
      generatedMockups.forEach((mockup, idx) => {
        emailBody += `\n${idx + 1}. ${mockup.angle}: ${mockup.url}`;
      });

      emailBody += `

Le document PDF complet avec tous les mockups est également joint à cet email.

N'hésitez pas à nous contacter pour toute question ou modification.

Cordialement,
L'équipe Imprimerie Ogooué
Libreville, Gabon
`;

      await base44.integrations.Core.SendEmail({
        from_name: 'Imprimerie Ogooué',
        to: clientEmail,
        subject: `Proposition de Mockup - ${mockupType.name}`,
        body: emailBody
      });

      toast.success('Email envoyé avec succès!');
      setShowEmailDialog(false);
      setClientEmail('');
      setClientName('');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setSendingEmail(false);
    }
  };

  const downloadPDF = async () => {
    const pdfData = await generatePDF();
    if (!pdfData) return;

    const link = document.createElement('a');
    link.href = pdfData;
    link.download = `mockup_${getCurrentMockupType().name}_${Date.now()}.pdf`;
    link.click();
    toast.success('PDF téléchargé');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-0 shadow-lg shadow-slate-200/50">
        <CardContent className="py-16 text-center">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Accès réservé aux administrateurs</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-blue-600" />
          Générateur de Mockups IA
        </h1>
        <p className="text-slate-500">Créez des mockups professionnels en quelques clics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <Card className="lg:col-span-1 border-0 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <CardTitle className="text-lg">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload */}
            <div>
              <Label>1. Importer la maquette</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                    {uploadedFile ? (
                      <div className="space-y-2">
                        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                        <p className="text-sm font-medium text-slate-700">{uploadedFile.name}</p>
                        <p className="text-xs text-slate-500">Cliquez pour changer</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm text-slate-600">Cliquez pour uploader</p>
                        <p className="text-xs text-slate-400">PNG, JPG, SVG</p>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Type de mockup */}
            <div>
              <Label>2. Choisir le type de mockup</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOCKUP_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {type.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Couleur ou Taille */}
            {getCurrentMockupType()?.colors && (
              <div>
                <Label>3. Choisir la couleur</Label>
                <Select value={selectedColor} onValueChange={setSelectedColor}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentMockupType().colors.map(color => (
                      <SelectItem key={color} value={color}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border ${
                            color === 'blanc' ? 'bg-white border-slate-300' :
                            color === 'noir' ? 'bg-black' :
                            color === 'rouge' ? 'bg-red-500' :
                            color === 'bleu' ? 'bg-blue-500' :
                            color === 'vert' ? 'bg-green-500' :
                            color === 'jaune' ? 'bg-yellow-400' :
                            color === 'gris' ? 'bg-gray-400' :
                            color === 'marine' ? 'bg-blue-900' :
                            'bg-slate-300'
                          }`} />
                          <span className="capitalize">{color}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {getCurrentMockupType()?.sizes && (
              <div>
                <Label>3. Choisir la taille</Label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Sélectionner une taille" />
                  </SelectTrigger>
                  <SelectContent>
                    {getCurrentMockupType().sizes.map(size => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Generate Button */}
            <Button 
              onClick={generateMockups}
              disabled={!uploadedFileUrl || generating}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer les Mockups
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="lg:col-span-2 border-0 shadow-lg shadow-slate-200/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Aperçu des Mockups</CardTitle>
              {generatedMockups.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={downloadPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                  <Button size="sm" onClick={() => setShowEmailDialog(true)}>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer au client
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generating ? (
              <div className="py-24 text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Génération des mockups en cours...</p>
                <p className="text-sm text-slate-400 mt-2">Cela peut prendre quelques secondes</p>
              </div>
            ) : generatedMockups.length === 0 ? (
              <div className="py-24 text-center">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">Aucun mockup généré</p>
                <p className="text-sm text-slate-400 mt-2">Uploadez une maquette et cliquez sur "Générer"</p>
              </div>
            ) : (
              <div className="space-y-6">
                {generatedMockups.map((mockup, idx) => (
                  <div key={idx} className="border rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b">
                      <p className="font-medium text-slate-700">{mockup.angle}</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100">
                      <img 
                        src={mockup.url} 
                        alt={mockup.angle}
                        className="w-full h-auto rounded-lg shadow-lg"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer au client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom du client</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nom complet"
              />
            </div>
            <div>
              <Label>Email du client</Label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@exemple.com"
              />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Le client recevra un email avec les mockups sous différents angles en pièce jointe PDF
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={sendEmail}
                disabled={sendingEmail || !clientEmail || !clientName}
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}