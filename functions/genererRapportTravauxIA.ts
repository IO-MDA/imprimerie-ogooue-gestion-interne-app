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

    // Header
    doc.setFontSize(20);
    doc.text('Rapport d\'Analyse IA - Travaux', 20, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(`Projet: ${projet}`, 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, y);
    y += 15;

    // Score général
    doc.setFontSize(16);
    doc.text('État Général', 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`Score: ${analysis.etat_general.score}/10`, 20, y);
    y += 7;
    doc.setFontSize(10);
    const commentLines = doc.splitTextToSize(analysis.etat_general.commentaire, 170);
    doc.text(commentLines, 20, y);
    y += commentLines.length * 5 + 10;

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
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(14);
    doc.text('Estimation Finale', 20, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`Coût Total Estimé: ${analysis.cout_total_estime.toLocaleString()} FCFA`, 20, y);

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