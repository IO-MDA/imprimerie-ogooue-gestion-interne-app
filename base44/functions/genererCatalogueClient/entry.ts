import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { client_id, produits: produitIds } = await req.json();

    // Récupérer le client
    const client = await base44.asServiceRole.entities.Client.filter({ id: client_id });
    if (client.length === 0) {
      return Response.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const clientData = client[0];

    // Récupérer les produits (tous ou sélection)
    let produits;
    if (produitIds && produitIds.length > 0) {
      produits = await Promise.all(
        produitIds.map(id => base44.asServiceRole.entities.ProduitCatalogue.filter({ id }))
      );
      produits = produits.flat();
    } else {
      produits = await base44.asServiceRole.entities.ProduitCatalogue.filter({ 
        actif: true, 
        visible_clients: true 
      });
    }

    // Récupérer les tarifs personnalisés
    const tarifs = await base44.asServiceRole.entities.TarifsClients.filter({ client_id: clientData.id });

    // Calculer les prix
    const produitsAvecPrix = produits.map(p => {
      const tarif = tarifs.find(t => t.produit_id === p.id);
      let prixFinal = p.prix_unitaire;

      if (tarif) {
        if (tarif.prix_client) {
          prixFinal = tarif.prix_client;
        } else if (tarif.remise_pct) {
          prixFinal = p.prix_unitaire * (1 - tarif.remise_pct / 100);
        }
      } else if (clientData.remise_globale_pct) {
        prixFinal = p.prix_unitaire * (1 - clientData.remise_globale_pct / 100);
      }

      return { ...p, prix_client: prixFinal };
    });

    // Créer le PDF
    const doc = new jsPDF();
    
    // En-tête
    doc.setFontSize(20);
    doc.setTextColor(30, 64, 175);
    doc.text('IMPRIMERIE OGOOUÉ', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Catalogue Produits', 105, 28, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Client: ${clientData.nom}`, 20, 40);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 46);

    // Ligne séparatrice
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 52, 190, 52);

    let y = 60;
    const pageHeight = doc.internal.pageSize.height;

    // Liste des produits
    produitsAvecPrix.forEach((produit, index) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${produit.nom}`, 20, y);
      
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      
      if (produit.description_courte) {
        const splitDesc = doc.splitTextToSize(produit.description_courte, 170);
        doc.text(splitDesc, 25, y);
        y += splitDesc.length * 5;
      }

      // Prix
      doc.setFontSize(11);
      doc.setTextColor(30, 64, 175);
      const prixFormate = Math.round(produit.prix_client).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      doc.text(`Prix: ${prixFormate} FCFA`, 25, y);
      
      y += 6;
      
      if (produit.delai_estime) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Délai: ${produit.delai_estime}`, 25, y);
        y += 5;
      }

      y += 8;
    });

    // Pied de page
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Imprimerie Ogooué - Carrefour Fina, Moanda, Gabon', 105, pageHeight - 10, { align: 'center' });
      doc.text(`Page ${i} / ${totalPages}`, 190, pageHeight - 10, { align: 'right' });
    }

    // Générer le PDF en base64
    const pdfBytes = doc.output('arraybuffer');
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    // Upload vers le stockage
    const fileName = `catalogue_${clientData.nom.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({
      file: new Blob([pdfBytes], { type: 'application/pdf' })
    });

    return Response.json({
      success: true,
      pdf_url: uploadResult.file_url,
      client: clientData.nom,
      produits_count: produitsAvecPrix.length
    });

  } catch (error) {
    console.error('Erreur génération PDF:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});