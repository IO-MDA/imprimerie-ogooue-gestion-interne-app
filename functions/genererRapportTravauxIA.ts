import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projet, travaux, analysis } = await req.json();

    const doc = new jsPDF();
    let y = 20;

    // Calculs financiers
    const totalDepenses = travaux.reduce((s, t) => s + (t.montant || 0), 0);
    const totalPaye = travaux.reduce((s, t) => s + (t.montant_paye || 0), 0);
    const totalRestant = totalDepenses - totalPaye;
    const tauxPaiement = totalDepenses > 0 ? ((totalPaye / totalDepenses) * 100).toFixed(1) : 0;

    // Header avec logo
    doc.setFontSize(20);
    doc.setTextColor(249, 115, 22); // Orange
    doc.text('Rapport d\'Analyse IA - Travaux', 20, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Projet: ${projet}`, 20, y);
    doc.setFont(undefined, 'normal');
    y += 7;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')} par ${user.full_name || user.email}`, 20, y);
    doc.setTextColor(0, 0, 0);
    y += 15;

    // Résumé financier
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Résumé Financier', 20, y);
    doc.setFont(undefined, 'normal');
    y += 10;

    // Box résumé
    doc.setFillColor(249, 250, 251);
    doc.rect(20, y, 170, 40, 'F');
    doc.setFontSize(10);
    y += 8;
    doc.text(`Total Dépenses: ${totalDepenses.toLocaleString()} FCFA`, 25, y);
    y += 8;
    doc.setTextColor(16, 185, 129);
    doc.text(`Total Payé: ${totalPaye.toLocaleString()} FCFA (${tauxPaiement}%)`, 25, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.setTextColor(239, 68, 68);
    doc.text(`Reste à Payer: ${totalRestant.toLocaleString()} FCFA`, 25, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.text(`Nombre de Travaux: ${travaux.length}`, 25, y);
    y += 15;

    // Score général
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('État Général du Projet', 20, y);
    doc.setFont(undefined, 'normal');
    y += 10;
    
    // Score avec couleur
    doc.setFontSize(12);
    const score = analysis.etat_general?.score || 0;
    doc.setTextColor(score >= 7 ? 16 : score >= 5 ? 251 : 239, score >= 7 ? 185 : score >= 5 ? 191 : 68, score >= 7 ? 129 : score >= 5 ? 36 : 68);
    doc.text(`Score Global: ${score}/10`, 20, y);
    doc.setTextColor(0, 0, 0);
    y += 8;
    doc.setFontSize(10);
    const commentLines = doc.splitTextToSize(analysis.etat_general?.commentaire || 'Aucun commentaire', 170);
    doc.text(commentLines, 20, y);
    y += commentLines.length * 5 + 12;

    // Points d'attention
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text('Points d\'Attention Urgents', 20, y);
    y += 8;
    doc.setFontSize(10);
    analysis.points_attention.forEach((point, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${idx + 1}. ${point.titre} [${point.priorite}]`, 20, y);
      y += 5;
      const descLines = doc.splitTextToSize(point.description, 170);
      doc.text(descLines, 25, y);
      y += descLines.length * 5 + 3;
    });

    // Optimisations budgétaires
    y += 5;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text('Optimisations Budgétaires', 20, y);
    y += 8;
    doc.setFontSize(10);
    analysis.optimisations_budgetaires.forEach((optim, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const optimLines = doc.splitTextToSize(`• ${optim}`, 170);
      doc.text(optimLines, 20, y);
      y += optimLines.length * 5 + 2;
    });

    // Planning recommandé
    y += 5;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text('Planning Recommandé', 20, y);
    y += 8;
    doc.setFontSize(10);
    analysis.planning_recommande.forEach((etape, idx) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${idx + 1}. ${etape.etape}`, 20, y);
      y += 5;
      doc.text(`   Délai: ${etape.delai} | Budget: ${etape.budget_estime.toLocaleString()} FCFA`, 25, y);
      y += 7;
    });

    // Coût total estimé
    y += 5;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Estimation Finale & Prévisions', 20, y);
    doc.setFont(undefined, 'normal');
    y += 10;
    
    doc.setFillColor(245, 243, 255);
    doc.rect(20, y, 170, 25, 'F');
    y += 8;
    doc.setFontSize(14);
    doc.setTextColor(124, 58, 237);
    doc.text(`Coût Total Estimé: ${(analysis.cout_total_estime || 0).toLocaleString()} FCFA`, 25, y);
    doc.setTextColor(0, 0, 0);
    y += 10;
    doc.setFontSize(10);
    const ecart = (analysis.cout_total_estime || 0) - totalDepenses;
    const ecartText = ecart > 0 ? `+${ecart.toLocaleString()}` : ecart.toLocaleString();
    doc.text(`Écart avec dépenses actuelles: ${ecartText} FCFA`, 25, y);
    y += 15;

    // Photos section info
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Documentation Photos', 20, y);
    doc.setFont(undefined, 'normal');
    y += 8;
    doc.setFontSize(10);
    
    const travauxAvecPhotos = travaux.filter(t => t.photos && t.photos.length > 0);
    doc.text(`${travauxAvecPhotos.length} travau(x) avec photos documentées`, 20, y);
    y += 6;
    doc.text(`Total: ${travaux.reduce((s, t) => s + (t.photos?.length || 0), 0)} photo(s)`, 20, y);
    y += 10;
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Imprimerie OGOOUE - Rapport généré automatiquement par IA', 20, 285);
    doc.text(`Page ${doc.internal.getNumberOfPages()}`, 180, 285);

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Rapport_Travaux_${projet}.pdf`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});