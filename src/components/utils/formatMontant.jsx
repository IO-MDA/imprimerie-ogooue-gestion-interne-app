export const formatMontant = (montant) => {
  if (!montant && montant !== 0) return '0';
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(montant);
};