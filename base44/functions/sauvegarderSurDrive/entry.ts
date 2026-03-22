import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pdfBlob, fileName, folderType, metadata } = await req.json();

    // Récupérer le token Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Mapping des types de dossiers
    const folderNames = {
      'catalogues': 'Catalogues',
      'devis': 'Devis',
      'commandes': 'Commandes',
      'contrats': 'Contrats',
      'factures': 'Factures'
    };

    const folderName = folderNames[folderType] || 'Documents';

    // Créer l'arborescence si elle n'existe pas
    const rootFolderName = 'Imprimerie Ogooue';
    
    // Rechercher ou créer le dossier racine
    const searchRootResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${rootFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const rootResults = await searchRootResponse.json();
    let rootFolderId;

    if (rootResults.files && rootResults.files.length > 0) {
      rootFolderId = rootResults.files[0].id;
    } else {
      // Créer le dossier racine
      const createRootResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: rootFolderName,
            mimeType: 'application/vnd.google-apps.folder'
          })
        }
      );
      const rootFolder = await createRootResponse.json();
      rootFolderId = rootFolder.id;
    }

    // Rechercher ou créer le sous-dossier
    const searchSubResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const subResults = await searchSubResponse.json();
    let folderId;

    if (subResults.files && subResults.files.length > 0) {
      folderId = subResults.files[0].id;
    } else {
      // Créer le sous-dossier
      const createSubResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [rootFolderId]
          })
        }
      );
      const subFolder = await createSubResponse.json();
      folderId = subFolder.id;
    }

    // Uploader le fichier PDF
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileMetadata = {
      name: fileName,
      parents: [folderId]
    };

    // Convertir le blob base64 en bytes
    const pdfBytes = Uint8Array.from(atob(pdfBlob), c => c.charCodeAt(0));

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(fileMetadata) +
      delimiter +
      'Content-Type: application/pdf\r\n\r\n' +
      new TextDecoder().decode(pdfBytes) +
      closeDelimiter;

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      }
    );

    const uploadResult = await uploadResponse.json();

    return Response.json({
      success: true,
      fileId: uploadResult.id,
      fileName: fileName,
      folderType: folderType,
      webViewLink: uploadResult.webViewLink
    });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});