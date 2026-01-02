import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { commandeId, nouveauStatut, commentaire } = await req.json();

    // Récupérer la commande
    const commande = await base44.asServiceRole.entities.Commande.filter({ id: commandeId });
    if (!commande || commande.length === 0) {
      return Response.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    const cmd = commande[0];

    // Mettre à jour le statut et l'historique
    const nouvelHistorique = {
      statut: nouveauStatut,
      date: new Date().toISOString(),
      modifie_par: user.full_name,
      commentaire: commentaire || ''
    };

    await base44.asServiceRole.entities.Commande.update(commandeId, {
      statut: nouveauStatut,
      historique_statuts: [...(cmd.historique_statuts || []), nouvelHistorique]
    });

    // Messages personnalisés selon le statut
    const messages = {
      'confirmee': {
        subject: '✅ Commande confirmée',
        body: `Bonjour ${cmd.client_nom},\n\nVotre commande ${cmd.reference_commande} a été confirmée et est en cours de traitement.\n\nDétails:\n- Produit: ${cmd.type_prestation}\n- Quantité: ${cmd.quantite}\n${cmd.date_livraison_prevue ? `- Livraison prévue: ${new Date(cmd.date_livraison_prevue).toLocaleDateString('fr-FR')}` : ''}\n\n${commentaire ? `Message: ${commentaire}\n\n` : ''}Nous vous tiendrons informé de l'avancement.\n\nCordialement,\nImprimerie OGOOUE`
      },
      'en_production': {
        subject: '🔧 Commande en production',
        body: `Bonjour ${cmd.client_nom},\n\nVotre commande ${cmd.reference_commande} est maintenant en production.\n\n${commentaire ? `Information: ${commentaire}\n\n` : ''}Nous travaillons activement sur votre commande.\n\nCordialement,\nImprimerie OGOOUE`
      },
      'prete': {
        subject: '✨ Commande prête',
        body: `Bonjour ${cmd.client_nom},\n\nBonne nouvelle ! Votre commande ${cmd.reference_commande} est prête.\n\nVous pouvez venir la récupérer à:\nCarrefour Fina en face de Finam, Moanda\n\n${commentaire ? `Note: ${commentaire}\n\n` : ''}Merci de nous contacter avant de passer: +241 060 44 46 34\n\nCordialement,\nImprimerie OGOOUE`
      },
      'livree': {
        subject: '🎉 Commande livrée',
        body: `Bonjour ${cmd.client_nom},\n\nVotre commande ${cmd.reference_commande} a été livrée avec succès.\n\n${commentaire ? `Message: ${commentaire}\n\n` : ''}Nous espérons que vous êtes satisfait de nos services.\n\nN'hésitez pas à nous laisser un avis !\n\nCordialement,\nImprimerie OGOOUE`
      },
      'annulee': {
        subject: '❌ Commande annulée',
        body: `Bonjour ${cmd.client_nom},\n\nVotre commande ${cmd.reference_commande} a été annulée.\n\n${commentaire ? `Raison: ${commentaire}\n\n` : ''}Si vous avez des questions, contactez-nous au +241 060 44 46 34.\n\nCordialement,\nImprimerie OGOOUE`
      }
    };

    const message = messages[nouveauStatut] || {
      subject: 'Mise à jour de votre commande',
      body: `Bonjour ${cmd.client_nom},\n\nVotre commande ${cmd.reference_commande} a été mise à jour.\n\nNouveau statut: ${nouveauStatut}\n\n${commentaire ? `Message: ${commentaire}\n\n` : ''}Cordialement,\nImprimerie OGOOUE`
    };

    // Envoyer l'email
    if (cmd.client_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'Imprimerie OGOOUE',
          to: cmd.client_email,
          subject: message.subject,
          body: message.body
        });
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
      }
    }

    // Note: SMS nécessiterait une intégration SMS (Twilio, etc.)
    // Pour l'instant, on laisse juste l'email

    return Response.json({ 
      success: true,
      message: 'Commande mise à jour et client notifié'
    });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});