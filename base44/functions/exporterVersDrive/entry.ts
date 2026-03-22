import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 });
    }

    // Récupérer toutes les données
    const [
      clients,
      commandes,
      factures,
      devis,
      produits,
      rapports,
      pointages,
      demandes
    ] = await Promise.all([
      base44.asServiceRole.entities.Client.list(),
      base44.asServiceRole.entities.Commande.list(),
      base44.asServiceRole.entities.Facture.list(),
      base44.asServiceRole.entities.Devis.list(),
      base44.asServiceRole.entities.ProduitCatalogue.list(),
      base44.asServiceRole.entities.RapportJournalier.list(),
      base44.asServiceRole.entities.Pointage.list(),
      base44.asServiceRole.entities.DemandeClient.list()
    ]);

    // Préparer les données pour export
    const exportData = {
      date_export: new Date().toISOString(),
      exporte_par: user.email,
      statistiques: {
        total_clients: clients.length,
        total_commandes: commandes.length,
        total_factures: factures.length,
        total_devis: devis.length,
        total_produits: produits.length,
        total_rapports: rapports.length,
        total_pointages: pointages.length,
        total_demandes: demandes.length
      },
      donnees: {
        clients,
        commandes,
        factures,
        devis,
        produits,
        rapports: rapports.slice(0, 100), // Limiter les rapports
        pointages: pointages.slice(0, 500), // Limiter les pointages
        demandes
      }
    };

    // Créer le fichier JSON
    const jsonContent = JSON.stringify(exportData, null, 2);
    const fileName = `Imprimerie_OGOOUE_Export_${new Date().toISOString().split('T')[0]}.json`;

    // Obtenir le token Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Créer les métadonnées du fichier
    const metadata = {
      name: fileName,
      mimeType: 'application/json'
    };

    // Upload vers Google Drive
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', new Blob([jsonContent], { type: 'application/json' }));

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      throw new Error(`Erreur upload Google Drive: ${error}`);
    }

    const fileInfo = await uploadResponse.json();

    return Response.json({
      success: true,
      message: 'Données exportées avec succès vers Google Drive',
      file: {
        id: fileInfo.id,
        name: fileInfo.name,
        url: `https://drive.google.com/file/d/${fileInfo.id}/view`
      },
      statistiques: exportData.statistiques
    });

  } catch (error) {
    console.error('Erreur export:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});