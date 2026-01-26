/**
 * Helpers pour la génération PDF optimisée
 */

/**
 * Formate un montant pour PDF (espace comme séparateur de milliers)
 */
export const formatMontantPDF = (montant) => {
  if (!montant && montant !== 0) return '0';
  const value = Math.round(montant);
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/**
 * Calcule si un bloc peut rentrer dans l'espace disponible
 */
export const canFitOnPage = (currentY, blockHeight, pageHeight, bottomMargin = 25) => {
  return (currentY + blockHeight) <= (pageHeight - bottomMargin);
};

/**
 * Ajoute un footer standardisé
 */
export const addStandardFooter = (pdf, pageNumber, pageHeight, pageWidth, margin = 15) => {
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    'IMPRIMERIE OGOOUE | Tel: +241 060 44 46 34 / 074 42 41 42 | imprimerieogooue@gmail.com',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );
  pdf.text(
    'RCCM: RG/FCV 2023A0407 | Carrefour Fina en face de Finam, Moanda - Gabon',
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );
  
  pdf.setFontSize(8);
  pdf.text(`Page ${pageNumber}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
};

/**
 * Configuration de mise en page adaptative selon le nombre d'items
 */
export const getAdaptiveLayout = (itemCount) => {
  if (itemCount <= 6) {
    return {
      cardHeight: 55,
      descriptionLines: 3,
      fontSize: 9,
      titleFontSize: 13,
      imageSize: 32,
      spacing: 4
    };
  } else if (itemCount <= 20) {
    return {
      cardHeight: 42,
      descriptionLines: 2,
      fontSize: 8,
      titleFontSize: 11,
      imageSize: 28,
      spacing: 3
    };
  } else if (itemCount <= 60) {
    return {
      cardHeight: 35,
      descriptionLines: 2,
      fontSize: 7,
      titleFontSize: 10,
      imageSize: 24,
      spacing: 3
    };
  } else {
    return {
      cardHeight: 30,
      descriptionLines: 1,
      fontSize: 6.5,
      titleFontSize: 9,
      imageSize: 20,
      spacing: 2
    };
  }
};

/**
 * Tronque du texte avec ellipsis si trop long
 */
export const truncateText = (pdf, text, maxWidth, fontSize) => {
  pdf.setFontSize(fontSize);
  const lines = pdf.splitTextToSize(text, maxWidth);
  return lines;
};

/**
 * Convertit un nombre en lettres (français - FCFA)
 */
export const nombreEnLettres = (nombre) => {
  const unites = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const dizaines = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  const dix = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  
  if (nombre === 0) return 'zéro';
  
  const convertirMoins1000 = (n) => {
    if (n === 0) return '';
    if (n < 10) return unites[n];
    if (n < 20) return dix[n - 10];
    if (n < 100) {
      const d = Math.floor(n / 10);
      const u = n % 10;
      if (d === 7 || d === 9) {
        return dizaines[d] + (u === 0 ? (d === 9 ? 's' : '-dix') : '-' + (d === 7 && u === 1 ? 'et-onze' : (u < 10 ? dix[u] : '')));
      }
      return dizaines[d] + (u === 1 && d !== 8 ? ' et un' : (u > 0 ? '-' + unites[u] : ''));
    }
    const c = Math.floor(n / 100);
    const reste = n % 100;
    return (c === 1 ? 'cent' : unites[c] + ' cent' + (c > 1 && reste === 0 ? 's' : '')) + (reste > 0 ? ' ' + convertirMoins1000(reste) : '');
  };
  
  const convertirPartie = (n) => {
    if (n === 0) return '';
    const milliards = Math.floor(n / 1000000000);
    const millions = Math.floor((n % 1000000000) / 1000000);
    const milliers = Math.floor((n % 1000000) / 1000);
    const reste = n % 1000;
    
    let resultat = '';
    if (milliards > 0) resultat += convertirMoins1000(milliards) + ' milliard' + (milliards > 1 ? 's' : '') + ' ';
    if (millions > 0) resultat += convertirMoins1000(millions) + ' million' + (millions > 1 ? 's' : '') + ' ';
    if (milliers > 0) resultat += (milliers === 1 ? 'mille' : convertirMoins1000(milliers) + ' mille') + ' ';
    if (reste > 0) resultat += convertirMoins1000(reste);
    
    return resultat.trim();
  };
  
  const partieEntiere = Math.floor(nombre);
  return convertirPartie(partieEntiere) + ' francs CFA';
};