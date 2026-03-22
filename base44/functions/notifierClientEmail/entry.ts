import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, clientId, data } = await req.json();

    // Récupérer les infos du client
    const client = await base44.asServiceRole.entities.Client.filter({ id: clientId });
    if (client.length === 0) {
      throw new Error('Client introuvable');
    }

    const clientData = client[0];
    const destinataire = clientData.email;

    if (!destinataire) {
      throw new Error('Email client manquant');
    }

    let sujet = '';
    let corps = '';

    // Générer le contenu selon le type
    switch (type) {
      case 'nouveau_devis':
        sujet = `📄 Votre devis #${data.numero} - Imprimerie Ogooué`;
        corps = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0078d7;">Bonjour ${clientData.nom},</h2>
            <p>Nous avons le plaisir de vous transmettre votre devis personnalisé.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📋 Détails du devis</h3>
              <p><strong>Numéro:</strong> ${data.numero}</p>
              <p><strong>Date:</strong> ${data.date}</p>
              <p><strong>Montant total:</strong> ${data.total} FCFA</p>
            </div>

            <p>Pour toute question, n'hésitez pas à nous contacter.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                <strong>Imprimerie Ogooué</strong><br>
                Tél: +241 060 44 46 34 / 074 42 41 42<br>
                Email: imprimerieogooue@gmail.com<br>
                Carrefour Fina en face de Finam, Moanda - Gabon
              </p>
            </div>
          </div>
        `;
        break;

      case 'commande_creee':
        sujet = `✅ Commande confirmée #${data.reference} - Imprimerie Ogooué`;
        corps = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0078d7;">Bonjour ${clientData.nom},</h2>
            <p>Votre commande a bien été enregistrée et est en cours de traitement.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📦 Détails de la commande</h3>
              <p><strong>Référence:</strong> ${data.reference}</p>
              <p><strong>Type:</strong> ${data.type_prestation}</p>
              <p><strong>Montant:</strong> ${data.montant} FCFA</p>
              ${data.date_livraison ? `<p><strong>Livraison prévue:</strong> ${data.date_livraison}</p>` : ''}
            </div>

            <p>Nous vous tiendrons informé de l'avancement de votre commande.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                <strong>Imprimerie Ogooué</strong><br>
                Tél: +241 060 44 46 34 / 074 42 41 42<br>
                Email: imprimerieogooue@gmail.com
              </p>
            </div>
          </div>
        `;
        break;

      case 'statut_commande':
        const statuts = {
          'confirmee': '✅ Confirmée',
          'en_production': '🔨 En production',
          'prete': '🎉 Prête pour retrait',
          'livree': '✅ Livrée'
        };
        const statutLabel = statuts[data.statut] || data.statut;

        sujet = `${statutLabel} - Commande #${data.reference}`;
        corps = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0078d7;">Bonjour ${clientData.nom},</h2>
            <p>Le statut de votre commande a été mis à jour.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📦 Commande #${data.reference}</h3>
              <p><strong>Nouveau statut:</strong> ${statutLabel}</p>
              ${data.commentaire ? `<p><strong>Message:</strong> ${data.commentaire}</p>` : ''}
            </div>

            ${data.statut === 'prete' ? '<p><strong>Votre commande est prête ! Vous pouvez venir la récupérer.</strong></p>' : ''}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                <strong>Imprimerie Ogooué</strong><br>
                Tél: +241 060 44 46 34 / 074 42 41 42<br>
                Email: imprimerieogooue@gmail.com
              </p>
            </div>
          </div>
        `;
        break;

      case 'catalogue_personnalise':
        sujet = `📚 Votre catalogue personnalisé - Imprimerie Ogooué`;
        corps = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0078d7;">Bonjour ${clientData.nom},</h2>
            <p>Nous avons créé un catalogue personnalisé avec vos prix privilégiés.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📚 Votre catalogue</h3>
              <p>Découvrez nos produits et services avec vos tarifs personnalisés.</p>
              ${data.nb_produits ? `<p><strong>${data.nb_produits} produits</strong> disponibles</p>` : ''}
            </div>

            <p>Pour passer commande, connectez-vous à votre espace client ou contactez-nous directement.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                <strong>Imprimerie Ogooué</strong><br>
                Tél: +241 060 44 46 34 / 074 42 41 42<br>
                Email: imprimerieogooue@gmail.com
              </p>
            </div>
          </div>
        `;
        break;

      case 'bienvenue':
        sujet = `🎉 Bienvenue à l'Imprimerie Ogooué`;
        corps = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0078d7;">Bienvenue ${clientData.nom} ! 👋</h2>
            <p>Nous sommes ravis de vous compter parmi nos clients.</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">🚀 Vos avantages</h3>
              <ul>
                <li>Accès à votre espace client personnalisé</li>
                <li>Suivi en temps réel de vos commandes</li>
                <li>Catalogue avec vos tarifs privilégiés</li>
                <li>Service client dédié</li>
              </ul>
            </div>

            <p>Pour toute demande de devis ou information, n'hésitez pas à nous contacter.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p style="color: #666; font-size: 12px;">
                <strong>Imprimerie Ogooué</strong><br>
                Tél: +241 060 44 46 34 / 074 42 41 42<br>
                Email: imprimerieogooue@gmail.com<br>
                Carrefour Fina en face de Finam, Moanda - Gabon
              </p>
            </div>
          </div>
        `;
        break;

      default:
        throw new Error('Type de notification non reconnu');
    }

    // Envoyer l'email
    const result = await base44.asServiceRole.functions.invoke('envoyerEmail', {
      destinataire: destinataire,
      sujet: sujet,
      corps: corps,
      clientId: clientId,
      commandeId: data.commandeId,
      devisId: data.devisId
    });

    return Response.json({
      success: true,
      type: type,
      destinataire: destinataire,
      messageId: result.data.messageId
    });

  } catch (error) {
    console.error('Erreur notification email:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});