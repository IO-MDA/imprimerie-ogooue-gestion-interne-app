import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authentification
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Seuls les admins et managers peuvent envoyer des notifications
    if (user.role !== 'admin' && user.role !== 'manager') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await req.json();
    const {
      destinataire_id,
      destinataire_nom,
      destinataire_email,
      type,
      titre,
      message,
      reference_id,
      reference_type,
      priorite = 'normale',
      action_url,
      envoyer_email = true,
      metadata
    } = body;

    // Validation
    if (!destinataire_id || !type || !titre || !message) {
      return Response.json({ 
        error: 'Champs requis manquants' 
      }, { status: 400 });
    }

    // Créer la notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      destinataire_id,
      destinataire_nom,
      destinataire_email,
      type,
      titre,
      message,
      reference_id,
      reference_type,
      priorite,
      action_url,
      metadata,
      lu: false,
      email_envoye: false
    });

    // Envoyer l'email si demandé
    if (envoyer_email && destinataire_email) {
      try {
        const prioriteEmoji = {
          'urgente': '🚨',
          'haute': '⚠️',
          'normale': 'ℹ️',
          'basse': '📝'
        };

        const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .logo { width: 60px; height: 60px; background: white; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; }
    .content { background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
    .notification-box { background: #f7fafc; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .priority-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
    .priority-urgente { background: #fee; color: #c53030; }
    .priority-haute { background: #fffaf0; color: #c05621; }
    .priority-normale { background: #ebf8ff; color: #2c5282; }
    .priority-basse { background: #f0fff4; color: #276749; }
    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #718096; font-size: 12px; }
    .contact-info { background: #f7fafc; padding: 15px; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <span style="font-size: 30px;">🖨️</span>
      </div>
      <h1 style="margin: 0; font-size: 24px;">Imprimerie Ogooué</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Moanda, Gabon</p>
    </div>
    
    <div class="content">
      <div class="notification-box">
        <span class="priority-badge priority-${priorite}">
          ${prioriteEmoji[priorite] || 'ℹ️'} ${priorite.toUpperCase()}
        </span>
        <h2 style="margin: 10px 0; color: #2d3748;">${titre}</h2>
        <p style="margin: 15px 0; color: #4a5568;">${message}</p>
        
        ${reference_type && reference_id ? `
          <p style="margin: 10px 0; font-size: 13px; color: #718096;">
            <strong>Référence:</strong> ${reference_type} #${reference_id}
          </p>
        ` : ''}
      </div>

      ${action_url ? `
        <div style="text-align: center;">
          <a href="${action_url}" class="button">
            Voir les détails
          </a>
        </div>
      ` : ''}

      <div class="contact-info">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #2d3748;">Besoin d'aide ?</p>
        <p style="margin: 5px 0; font-size: 13px;">
          📞 <strong>Tél:</strong> +241 060 44 46 34 / 074 42 41 42<br>
          📧 <strong>Email:</strong> imprimerieogooue@gmail.com<br>
          📍 <strong>Adresse:</strong> Carrefour Fina en face de Finam, Moanda
        </p>
      </div>
    </div>

    <div class="footer">
      <p>Vous recevez cet email car vous êtes client chez Imprimerie Ogooué.</p>
      <p style="margin-top: 10px;">
        <a href="https://wa.me/message/7WVKSVB3RHOUA1" style="color: #667eea; text-decoration: none;">
          💬 Contactez-nous sur WhatsApp
        </a>
      </p>
      <p style="margin-top: 15px; color: #a0aec0;">
        © ${new Date().getFullYear()} Imprimerie Ogooué - Tous droits réservés
      </p>
    </div>
  </div>
</body>
</html>
        `;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: destinataire_email,
          subject: `${prioriteEmoji[priorite] || 'ℹ️'} ${titre}`,
          body: emailHTML
        });

        // Marquer l'email comme envoyé
        await base44.asServiceRole.entities.Notification.update(notification.id, {
          email_envoye: true,
          date_email: new Date().toISOString()
        });
      } catch (emailError) {
        console.error('Erreur envoi email:', emailError);
        // Ne pas faire échouer la notification si l'email échoue
      }
    }

    return Response.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ 
      error: error.message || 'Erreur serveur' 
    }, { status: 500 });
  }
});