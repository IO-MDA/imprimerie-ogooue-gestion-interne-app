import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { destinataire, sujet, corps, clientId, commandeId, devisId, pieceJointe } = await req.json();

    // Envoyer l'email via l'intégration Core
    const emailResult = await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: 'Imprimerie Ogooué',
      to: destinataire,
      subject: sujet,
      body: corps
    });

    // Enregistrer le message dans la base de données
    const messageData = {
      expediteur: 'imprimerieogooue@gmail.com',
      expediteur_nom: 'Imprimerie Ogooué',
      destinataire: destinataire,
      contenu: corps,
      type_message: 'email',
      est_operateur: true,
      plateforme: 'interne',
      conversation_id: null
    };

    // Chercher ou créer une conversation pour ce client
    if (clientId) {
      const client = await base44.asServiceRole.entities.Client.filter({ id: clientId });
      if (client.length > 0) {
        // Chercher une conversation existante
        const conversations = await base44.asServiceRole.entities.ConversationClient.filter({
          client_id: clientId,
          plateforme: 'interne'
        });

        let conversationId;
        if (conversations.length > 0) {
          conversationId = conversations[0].id;
          // Mettre à jour la conversation
          await base44.asServiceRole.entities.ConversationClient.update(conversationId, {
            dernier_message: corps.substring(0, 200),
            dernier_message_date: new Date().toISOString(),
            non_lu: false
          });
        } else {
          // Créer une nouvelle conversation
          const newConv = await base44.asServiceRole.entities.ConversationClient.create({
            client_id: clientId,
            client_nom: client[0].nom,
            plateforme: 'interne',
            statut: 'en_cours',
            dernier_message: corps.substring(0, 200),
            dernier_message_date: new Date().toISOString(),
            non_lu: false,
            intention_detectee: commandeId ? 'commande' : devisId ? 'devis' : 'information'
          });
          conversationId = newConv.id;
        }

        messageData.conversation_id = conversationId;
      }
    }

    // Sauvegarder le message
    const message = await base44.asServiceRole.entities.MessageCanal.create(messageData);

    // Si pièce jointe, sauvegarder sur Drive
    if (pieceJointe && pieceJointe.url) {
      try {
        await base44.asServiceRole.functions.invoke('sauvegarderSurDrive', {
          pdfBlob: pieceJointe.blob,
          fileName: pieceJointe.nom,
          folderType: 'emails',
          metadata: {
            client_id: clientId,
            destinataire: destinataire,
            date: new Date().toISOString()
          }
        });
      } catch (e) {
        console.log('Erreur sauvegarde Drive:', e);
      }
    }

    return Response.json({
      success: true,
      messageId: message.id,
      conversationId: messageData.conversation_id,
      destinataire: destinataire
    });

  } catch (error) {
    console.error('Erreur envoi email:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});