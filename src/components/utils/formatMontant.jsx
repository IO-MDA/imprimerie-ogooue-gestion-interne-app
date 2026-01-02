export const formatMontant = (montant) => {
  if (!montant && montant !== 0) return '0';
  // Utiliser un formatage explicite avec espace insécable
  const formatted = Math.round(montant).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return formatted;
};