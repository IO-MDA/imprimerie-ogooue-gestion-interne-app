import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { email, nom } = await req.json();

    if (!email) {
      return Response.json({ 
        error: 'Email obligatoire' 
      }, { status: 400 });
    }

    // Vérifier si le client existe déjà
    const existingClients = await base44.asServiceRole.entities.Client.filter({ email });
    if (existingClients.length > 0) {
      return Response.json({ 
        error: 'Un client existe déjà avec cet email' 
      }, { status: 400 });
    }

    // Inviter l'utilisateur avec rôle 'user' (sera client)
    try {
      await base44.asServiceRole.users.inviteUser(email, 'user');
    } catch (e) {
      console.log('User may already exist:', e);
    }

    // Récupérer l'user créé
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length === 0) {
      return Response.json({ 
        error: 'Erreur lors de la création du compte' 
      }, { status: 500 });
    }

    const newUser = users[0];

    // Créer le profil client
    const client = await base44.asServiceRole.entities.Client.create({
      user_id: newUser.id,
      nom: nom || email.split('@')[0],
      email: email,
      telephone: '',
      adresse: '',
      type: 'particulier',
      statut: 'actif',
      date_inscription: new Date().toISOString()
    });

    // Envoyer un email de bienvenue avec logo
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Imprimerie Ogooué',
        to: email,
        subject: '🎉 Bienvenue à l\'Imprimerie Ogooué',
        body: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc">
  <div style="max-width:600px;margin:20px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1)">
    <div style="background:linear-gradient(135deg,#2563eb,#4f46e5);padding:40px 30px;text-align:center">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6952719092a5c4248c27c512/c22c6636f_LOGO-BON-FINAL1.png" style="width:80px;height:80px;border-radius:15px;background:white;padding:10px;margin-bottom:15px">
      <h1 style="color:white;font-size:28px;margin:0;font-weight:bold">Bienvenue ${nom || 'cher client'} ! 👋</h1>
      <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:10px 0 0">Nous sommes ravis de vous compter parmi nos clients</p>
    </div>
    
    <div style="padding:30px">
      <div style="background:#f8fafc;padding:20px;border-radius:12px;margin:20px 0">
        <h3 style="color:#1e293b;margin:0 0 15px;font-size:16px">🚀 Vos avantages</h3>
        <div style="margin:10px 0;display:flex;align-items:start">
          <span style="color:#10b981;margin-right:10px;font-size:18px">✓</span>
          <span style="color:#475569;font-size:14px">Accès à votre espace client personnalisé</span>
        </div>
        <div style="margin:10px 0;display:flex;align-items:start">
          <span style="color:#10b981;margin-right:10px;font-size:18px">✓</span>
          <span style="color:#475569;font-size:14px">Suivi en temps réel de vos commandes</span>
        </div>
        <div style="margin:10px 0;display:flex;align-items:start">
          <span style="color:#10b981;margin-right:10px;font-size:18px">✓</span>
          <span style="color:#475569;font-size:14px">Catalogue avec vos tarifs privilégiés</span>
        </div>
        <div style="margin:10px 0;display:flex;align-items:start">
          <span style="color:#10b981;margin-right:10px;font-size:18px">✓</span>
          <span style="color:#475569;font-size:14px">Service client dédié</span>
        </div>
      </div>

      <p style="color:#475569;font-size:14px;line-height:1.6">Pour toute demande de devis ou information, n'hésitez pas à nous contacter.</p>

      <div style="background:#1e293b;color:white;padding:20px;border-radius:12px;margin-top:20px">
        <strong style="font-size:18px;display:block;margin-bottom:12px">IMPRIMERIE OGOOUÉ</strong>
        <div style="margin:8px 0;font-size:14px">📞 Tel: +241 060 44 46 34 / 074 42 41 42</div>
        <div style="margin:8px 0;font-size:14px">📧 Email: imprimerieogooue@gmail.com</div>
        <div style="margin:8px 0;font-size:14px">📍 Carrefour Fina en face de Finam, Moanda - Gabon 🇬🇦</div>
      </div>
    </div>

    <div style="text-align:center;color:#94a3b8;font-size:12px;padding:20px">
      <p style="margin:5px 0">© ${new Date().getFullYear()} Imprimerie Ogooué. Tous droits réservés.</p>
      <p style="margin:5px 0">RCCM: RG/FCV 2023A0407 | Moanda, Haut-Ogooué, Gabon</p>
    </div>
  </div>
</body>
</html>
        `
      });
    } catch (e) {
      console.log('Erreur email bienvenue:', e);
    }

    return Response.json({
      success: true,
      message: 'Invitation client envoyée avec succès',
      clientId: client.id
    });

  } catch (error) {
    console.error('Erreur invitation client:', error);
    return Response.json({ 
      error: error.message || 'Erreur lors de l\'invitation'
    }, { status: 500 });
  }
});