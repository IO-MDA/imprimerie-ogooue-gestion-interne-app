import jsPDF from 'jspdf';

const COMPANY_INFO = {
  name: 'imprimerie\nOGOOUÉ',
  slogan: 'Création • Impressions • Toutes solutions',
  contacts: 'Contacts : +241 060 44 46 34/ 074 42 41 42'
};

export const addHeader = (pdf) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Logo simulé (cercles colorés + texte)
  pdf.setFillColor(0, 174, 239); // Cyan
  pdf.circle(25, 25, 8, 'F');
  pdf.setFillColor(236, 0, 140); // Rose/Magenta
  pdf.circle(30, 20, 6, 'F');
  pdf.setFillColor(255, 215, 0); // Jaune
  pdf.circle(35, 25, 5, 'F');
  
  // Texte logo
  pdf.setFontSize(18);
  pdf.setTextColor(0, 174, 239);
  pdf.setFont(undefined, 'bold');
  pdf.text('imprimerie', 20, 40);
  
  pdf.setFontSize(20);
  pdf.text('OGOOUÉ', 20, 50);
  
  // Slogan en haut à droite
  pdf.setFontSize(14);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, 'bold');
  pdf.text(COMPANY_INFO.slogan, pageWidth / 2, 20, { align: 'center' });
  
  // Contacts
  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');
  pdf.text(COMPANY_INFO.contacts, pageWidth / 2, 30, { align: 'center' });
  
  return 60;
};

export const addFooter = (pdf) => {
  // Pas de footer dans le nouveau template
};

export const generateInvoicePDF = async (invoice) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  let yPos = addHeader(pdf);
  yPos += 10;
  
  // Date en haut à droite
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Moanda le, ${new Date(invoice.date_emission).toLocaleDateString('fr-FR')}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 20;
  pdf.setFontSize(13);
  pdf.setFont(undefined, 'bold');
  pdf.text(`FACTURE N°${invoice.numero}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 15;
  // Boîte bleue pour le client
  pdf.setDrawColor(0, 174, 239);
  pdf.setLineWidth(1.5);
  pdf.rect(20, yPos, 170, 12);
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'bold');
  pdf.text(`CLIENT : ${invoice.client_nom}`, 25, yPos + 8);
  
  yPos += 20;
  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Objet : ${invoice.notes || 'Facture'}`, 20, yPos);
  pdf.setFont(undefined, 'underline');
  pdf.text('Objet', 20, yPos);
  
  // Tableau
  yPos += 15;
  const tableTop = yPos;
  const colX = [20, 115, 145, 170];
  
  // Bordures du tableau
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(colX[0], tableTop, pageWidth - 40, 10);
  
  // En-têtes
  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(11);
  pdf.text('DESIGNATION', colX[0] + 2, tableTop + 7);
  pdf.text('QTE', colX[1] + 2, tableTop + 7);
  pdf.text('P.U', colX[2] + 2, tableTop + 7);
  pdf.text('P. TOTAL', colX[3] + 2, tableTop + 7);
  
  // Lignes verticales en-tête
  pdf.line(colX[1], tableTop, colX[1], tableTop + 10);
  pdf.line(colX[2], tableTop, colX[2], tableTop + 10);
  pdf.line(colX[3], tableTop, colX[3], tableTop + 10);
  
  pdf.setFont(undefined, 'normal');
  let currentY = tableTop + 10;
  
  invoice.lignes?.forEach((ligne, idx) => {
    const rowHeight = 8;
    pdf.rect(colX[0], currentY, pageWidth - 40, rowHeight);
    pdf.line(colX[1], currentY, colX[1], currentY + rowHeight);
    pdf.line(colX[2], currentY, colX[2], currentY + rowHeight);
    pdf.line(colX[3], currentY, colX[3], currentY + rowHeight);
    
    pdf.text(ligne.description || '', colX[0] + 2, currentY + 5.5);
    pdf.text(String(ligne.quantite || 0), colX[1] + 2, currentY + 5.5);
    pdf.text(String(ligne.prix_unitaire || 0), colX[2] + 2, currentY + 5.5);
    pdf.text(String((ligne.total || 0).toLocaleString()), colX[3] + 2, currentY + 5.5);
    
    currentY += rowHeight;
  });
  
  // Total
  pdf.setFont(undefined, 'bold');
  pdf.rect(colX[0], currentY, pageWidth - 40, 10);
  pdf.line(colX[3], currentY, colX[3], currentY + 10);
  pdf.text('TOTAL GENERAL', colX[0] + 2, currentY + 7);
  pdf.text(`${(invoice.total || 0).toLocaleString()}FCFA`, colX[3] + 2, currentY + 7);
  
  currentY += 20;
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(10);
  const totalEnLettres = numberToFrenchWords(invoice.total || 0);
  pdf.text(`Arrêté la présente facture à la somme de ${totalEnLettres} Francs CFA.`, 20, currentY);
  
  currentY += 30;
  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(12);
  pdf.text('Le Responsable', pageWidth - 20, currentY, { align: 'right' });
  pdf.setFont(undefined, 'underline');
  pdf.text('Le Responsable', pageWidth - 20, currentY, { align: 'right' });
  
  return pdf;
};

const numberToFrenchWords = (num) => {
  if (num === 0) return 'Zéro';
  
  const ones = ['', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf'];
  const tens = ['', 'Dix', 'Vingt', 'Trente', 'Quarante', 'Cinquante', 'Soixante', 'Soixante-dix', 'Quatre-vingt', 'Quatre-vingt-dix'];
  const teens = ['Dix', 'Onze', 'Douze', 'Treize', 'Quatorze', 'Quinze', 'Seize', 'Dix-sept', 'Dix-huit', 'Dix-neuf'];
  
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const one = num % 10;
    return tens[ten] + (one ? '-' + ones[one] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return (hundred > 1 ? ones[hundred] + ' ' : '') + 'Cent' + (rest ? ' ' + numberToFrenchWords(rest) : '');
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    return numberToFrenchWords(thousand) + ' Mille' + (rest ? ' ' + numberToFrenchWords(rest) : '');
  }
  
  return num.toString();
};

export const generateQuotePDF = async (devis) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  let yPos = addHeader(pdf);
  yPos += 10;
  
  // Date en haut à droite
  pdf.setFontSize(11);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Moanda le, ${new Date(devis.date_emission).toLocaleDateString('fr-FR')}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 20;
  pdf.setFontSize(13);
  pdf.setFont(undefined, 'bold');
  pdf.text(`DEVIS N°${devis.numero}`, pageWidth - 20, yPos, { align: 'right' });
  
  yPos += 15;
  // Boîte bleue pour le client
  pdf.setDrawColor(0, 174, 239);
  pdf.setLineWidth(1.5);
  pdf.rect(20, yPos, 170, 12);
  pdf.setFontSize(12);
  pdf.setFont(undefined, 'bold');
  pdf.text(`CLIENT : ${devis.client_nom}`, 25, yPos + 8);
  
  yPos += 20;
  pdf.setFontSize(11);
  pdf.setFont(undefined, 'normal');
  pdf.text(`Objet : ${devis.notes || 'Devis'}`, 20, yPos);
  pdf.setFont(undefined, 'underline');
  pdf.text('Objet', 20, yPos);
  
  // Tableau
  yPos += 15;
  const tableTop = yPos;
  const colX = [20, 115, 145, 170];
  
  // Bordures du tableau
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(colX[0], tableTop, pageWidth - 40, 10);
  
  // En-têtes
  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(11);
  pdf.text('DESIGNATION', colX[0] + 2, tableTop + 7);
  pdf.text('QTE', colX[1] + 2, tableTop + 7);
  pdf.text('P.U', colX[2] + 2, tableTop + 7);
  pdf.text('P. TOTAL', colX[3] + 2, tableTop + 7);
  
  // Lignes verticales en-tête
  pdf.line(colX[1], tableTop, colX[1], tableTop + 10);
  pdf.line(colX[2], tableTop, colX[2], tableTop + 10);
  pdf.line(colX[3], tableTop, colX[3], tableTop + 10);
  
  pdf.setFont(undefined, 'normal');
  let currentY = tableTop + 10;
  
  devis.lignes?.forEach((ligne, idx) => {
    const rowHeight = 8;
    pdf.rect(colX[0], currentY, pageWidth - 40, rowHeight);
    pdf.line(colX[1], currentY, colX[1], currentY + rowHeight);
    pdf.line(colX[2], currentY, colX[2], currentY + rowHeight);
    pdf.line(colX[3], currentY, colX[3], currentY + rowHeight);
    
    pdf.text(ligne.description || '', colX[0] + 2, currentY + 5.5);
    pdf.text(String(ligne.quantite || 0), colX[1] + 2, currentY + 5.5);
    pdf.text(String(ligne.prix_unitaire || 0), colX[2] + 2, currentY + 5.5);
    pdf.text(String((ligne.total || 0).toLocaleString()), colX[3] + 2, currentY + 5.5);
    
    currentY += rowHeight;
  });
  
  // Total
  pdf.setFont(undefined, 'bold');
  pdf.rect(colX[0], currentY, pageWidth - 40, 10);
  pdf.line(colX[3], currentY, colX[3], currentY + 10);
  pdf.text('TOTAL GENERAL', colX[0] + 2, currentY + 7);
  pdf.text(`${(devis.total || 0).toLocaleString()}FCFA`, colX[3] + 2, currentY + 7);
  
  currentY += 20;
  pdf.setFont(undefined, 'normal');
  pdf.setFontSize(10);
  const totalEnLettres = numberToFrenchWords(devis.total || 0);
  pdf.text(`Arrêté la présente facture à la somme de ${totalEnLettres} Francs CFA.`, 20, currentY);
  
  currentY += 30;
  pdf.setFont(undefined, 'bold');
  pdf.setFontSize(12);
  pdf.text('Le Responsable', pageWidth - 20, currentY, { align: 'right' });
  pdf.setFont(undefined, 'underline');
  pdf.text('Le Responsable', pageWidth - 20, currentY, { align: 'right' });
  
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