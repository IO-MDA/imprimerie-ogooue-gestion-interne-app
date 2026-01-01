import jsPDF from 'jspdf';

const COMPANY_INFO = {
  name: 'imprimerie\nOGOOUÉ',
  slogan: 'Création • Impressions • Toutes solutions',
  rccm: 'RCCM : RG/FCV 2023A0407',
  nif: 'NIF : 256598U',
  address: 'Siège social : Carrefour Fina en face de Finam Moanda – Gabon',
  phone: 'Tel : 060 44 46 34 / 074 42 41 42',
  email: 'Email : imprimerieogooue@gmail.com',
  contacts: 'Contacts : +241 060 44 46 34/ 074 42 41 42'
};

export const addHeader = (pdf) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // En-tête avec infos légales en haut
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text(COMPANY_INFO.rccm + '  ' + COMPANY_INFO.nif, pageWidth / 2, 10, { align: 'center' });
  pdf.text(COMPANY_INFO.address, pageWidth / 2, 15, { align: 'center' });
  pdf.text(COMPANY_INFO.phone + ' ' + COMPANY_INFO.email, pageWidth / 2, 20, { align: 'center' });
  
  // Logo simulé (texte stylisé)
  pdf.setFontSize(16);
  pdf.setTextColor(0, 174, 239);
  pdf.setFont(undefined, 'bold');
  pdf.text('imprimerie', 20, 40);
  pdf.text('OGOOUÉ', 28, 48);
  
  // Slogan à droite
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text(COMPANY_INFO.slogan, pageWidth - 20, 35, { align: 'right' });
  pdf.setFontSize(9);
  pdf.text(COMPANY_INFO.contacts, pageWidth - 20, 42, { align: 'right' });
  
  pdf.setFont(undefined, 'normal');
  
  return 60;
};

export const addFooter = (pdf) => {
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(COMPANY_INFO.rccm + '  ' + COMPANY_INFO.nif, pageWidth / 2, pageHeight - 15, { align: 'center' });
  pdf.text(COMPANY_INFO.address, pageWidth / 2, pageHeight - 10, { align: 'center' });
  pdf.text(COMPANY_INFO.phone + ' ' + COMPANY_INFO.email, pageWidth / 2, pageHeight - 5, { align: 'center' });
};

export const addStamp = (pdf, x = 150, y = 180) => {
  pdf.setDrawColor(0, 0, 255);
  pdf.setLineWidth(2);
  pdf.circle(x, y, 20);
  pdf.setFontSize(6);
  pdf.setTextColor(0, 0, 255);
  pdf.text('IMPRIMERIE OGOOUE', x - 15, y - 5);
  pdf.text('MOANDA - GABON', x - 12, y + 5);
  pdf.line(x - 15, y + 5, x + 10, y - 8);
};

export const generateInvoicePDF = async (invoice) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  let yPos = addHeader(pdf);
  yPos += 15;
  
  pdf.setFontSize(10);
  pdf.text(`Moanda le, ${new Date(invoice.date_emission).toLocaleDateString('fr-FR')}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 15;
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text(`FACTURE N°${invoice.numero}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 15;
  pdf.setFontSize(11);
  pdf.setDrawColor(0, 174, 239);
  pdf.rect(20, yPos, 80, 10);
  pdf.text(`CLIENT : ${invoice.client_nom}`, 25, yPos + 7);
  
  yPos += 20;
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Objet : ${invoice.notes || 'Facture'}`, 20, yPos);
  
  yPos += 15;
  const tableTop = yPos;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(20, tableTop, pageWidth - 40, 10, 'F');
  pdf.setFont(undefined, 'bold');
  pdf.text('DESIGNATION', 25, tableTop + 7);
  pdf.text('QTE', 105, tableTop + 7);
  pdf.text('P.U', 135, tableTop + 7);
  pdf.text('P. TOTAL', 165, tableTop + 7);
  
  pdf.setFont(undefined, 'normal');
  let currentY = tableTop + 10;
  invoice.lignes?.forEach(ligne => {
    currentY += 8;
    pdf.text(ligne.description || '', 25, currentY);
    pdf.text(String(ligne.quantite || 0), 105, currentY);
    pdf.text(String(ligne.prix_unitaire || 0), 135, currentY);
    pdf.text(String(ligne.total || 0), 165, currentY);
  });
  
  currentY += 8;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(20, currentY, pageWidth - 40, 10, 'F');
  pdf.setFont(undefined, 'bold');
  pdf.text('TOTAL GENERAL', 25, currentY + 7);
  pdf.text(`${invoice.total || 0} FCFA`, 165, currentY + 7);
  
  currentY += 20;
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(9);
  pdf.text(`Arrêté la présente facture à la somme de ... Francs CFA.`, 20, currentY);
  
  currentY += 20;
  pdf.setFont(undefined, 'bold');
  pdf.text('Le Responsable', pageWidth - 50, currentY, { align: 'right' });
  
  addStamp(pdf, pageWidth - 40, currentY + 20);
  addFooter(pdf);
  
  return pdf;
};

export const generateQuotePDF = async (devis) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  let yPos = addHeader(pdf);
  yPos += 15;
  
  pdf.setFontSize(10);
  pdf.text(`Moanda le, ${new Date(devis.date_emission).toLocaleDateString('fr-FR')}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 15;
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text(`DEVIS N°${devis.numero}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 15;
  pdf.setFontSize(11);
  pdf.setDrawColor(0, 174, 239);
  pdf.rect(20, yPos, 80, 10);
  pdf.text(`CLIENT : ${devis.client_nom}`, 25, yPos + 7);
  
  yPos += 20;
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Objet : ${devis.notes || 'Devis'}`, 20, yPos);
  
  yPos += 15;
  const tableTop = yPos;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(20, tableTop, pageWidth - 40, 10, 'F');
  pdf.setFont(undefined, 'bold');
  pdf.text('DESIGNATION', 25, tableTop + 7);
  pdf.text('QTE', 105, tableTop + 7);
  pdf.text('P.U', 135, tableTop + 7);
  pdf.text('P. TOTAL', 165, tableTop + 7);
  
  pdf.setFont(undefined, 'normal');
  let currentY = tableTop + 10;
  devis.lignes?.forEach(ligne => {
    currentY += 8;
    pdf.text(ligne.description || '', 25, currentY);
    pdf.text(String(ligne.quantite || 0), 105, currentY);
    pdf.text(String(ligne.prix_unitaire || 0), 135, currentY);
    pdf.text(String(ligne.total || 0), 165, currentY);
  });
  
  currentY += 8;
  pdf.setFillColor(240, 240, 240);
  pdf.rect(20, currentY, pageWidth - 40, 10, 'F');
  pdf.setFont(undefined, 'bold');
  pdf.text('TOTAL GENERAL', 25, currentY + 7);
  pdf.text(`${devis.total || 0} FCFA`, 165, currentY + 7);
  
  currentY += 15;
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(9);
  pdf.text(`Devis valide jusqu'au : ${new Date(devis.date_validite).toLocaleDateString('fr-FR')}`, 20, currentY);
  
  addStamp(pdf, pageWidth - 40, currentY + 15);
  addFooter(pdf);
  
  return pdf;
};

export const generateMockupPDF = async (mockupData) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  let yPos = addHeader(pdf);
  yPos += 15;
  
  pdf.setFontSize(10);
  pdf.text(`Moanda le, ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 15;
  pdf.setFontSize(14);
  pdf.setFont(undefined, 'bold');
  pdf.text('PROPOSITION DE MOCKUP', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  pdf.setFontSize(11);
  pdf.setDrawColor(0, 174, 239);
  pdf.rect(20, yPos, 80, 10);
  pdf.text(`CLIENT : ${mockupData.clientName}`, 25, yPos + 7);
  
  yPos += 20;
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Type : ${mockupData.type}`, 20, yPos);
  if (mockupData.color) {
    yPos += 6;
    pdf.text(`Couleur : ${mockupData.color}`, 20, yPos);
  }
  if (mockupData.size) {
    yPos += 6;
    pdf.text(`Taille : ${mockupData.size}`, 20, yPos);
  }
  
  return pdf;
};