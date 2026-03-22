import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { sheetType, data } = await req.json();

    // Récupérer le token Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // ID de la feuille principale (à configurer)
    const SPREADSHEET_ID = Deno.env.get('GOOGLE_SHEETS_ID');

    if (!SPREADSHEET_ID) {
      return Response.json({ 
        error: 'GOOGLE_SHEETS_ID non configuré dans les variables d\'environnement' 
      }, { status: 400 });
    }

    // Mapping des types vers les noms d'onglets
    const sheetNames = {
      'commandes': 'Commandes',
      'devis': 'Devis',
      'factures': 'Factures',
      'chiffre_affaires': 'Chiffre d\'Affaires'
    };

    const sheetName = sheetNames[sheetType] || 'Données';

    // Préparer les données pour l'insertion
    const values = Array.isArray(data) ? data : [data];
    
    // Ajouter une ligne avec les données
    const appendResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:Z:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: values
        })
      }
    );

    const result = await appendResponse.json();

    return Response.json({
      success: true,
      sheetType: sheetType,
      rowsAdded: result.updates.updatedRows
    });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});