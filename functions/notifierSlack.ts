import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, type, data } = await req.json();

    // Récupérer le token Slack
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('slack');

    // Canal par défaut (à configurer)
    const SLACK_CHANNEL = Deno.env.get('SLACK_CHANNEL') || '#commandes-imprimerie';

    // Formater le message selon le type
    let formattedMessage = message;
    let color = '#36a64f'; // vert par défaut

    if (type === 'nouvelle_commande') {
      color = '#2196F3'; // bleu
      formattedMessage = `🆕 *Nouvelle commande*\n\n` +
        `📝 Référence: ${data.reference}\n` +
        `👤 Client: ${data.client_nom}\n` +
        `💰 Montant: ${data.montant} FCFA\n` +
        `📅 Date: ${data.date}`;
    } else if (type === 'commande_prete') {
      color = '#4CAF50'; // vert
      formattedMessage = `✅ *Commande prête*\n\n` +
        `📝 Référence: ${data.reference}\n` +
        `👤 Client: ${data.client_nom}\n` +
        `🎉 La commande est prête pour le retrait`;
    } else if (type === 'commande_livree') {
      color = '#8BC34A'; // vert clair
      formattedMessage = `🚚 *Commande livrée*\n\n` +
        `📝 Référence: ${data.reference}\n` +
        `👤 Client: ${data.client_nom}\n` +
        `✅ Livraison effectuée`;
    } else if (type === 'retard_detecte') {
      color = '#FF9800'; // orange
      formattedMessage = `⚠️ *Retard détecté*\n\n` +
        `📝 Référence: ${data.reference}\n` +
        `👤 Client: ${data.client_nom}\n` +
        `📅 Date prévue: ${data.date_prevue}\n` +
        `⏰ Retard: ${data.jours_retard} jours`;
    }

    // Envoyer le message à Slack
    const slackResponse = await fetch(
      'https://slack.com/api/chat.postMessage',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          channel: SLACK_CHANNEL,
          attachments: [{
            color: color,
            text: formattedMessage,
            footer: 'Imprimerie Ogooué',
            footer_icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/e66e417ff_LOGO-BON-FINAL1.png',
            ts: Math.floor(Date.now() / 1000)
          }]
        })
      }
    );

    const slackResult = await slackResponse.json();

    if (!slackResult.ok) {
      throw new Error(slackResult.error || 'Erreur Slack');
    }

    return Response.json({
      success: true,
      channel: SLACK_CHANNEL,
      type: type
    });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});