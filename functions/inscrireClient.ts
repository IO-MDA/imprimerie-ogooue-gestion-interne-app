import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { email, nom, telephone, adresse, entreprise, motDePasse } = await req.json();

    if (!email || !nom || !telephone) {
      return Response.json({ 
        error: 'Email, nom et téléphone sont obligatoires' 
      }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Vérifier si l'email existe déjà
    const existingClients = await base44.asServiceRole.entities.Client.filter({ email });
    if (existingClients.length > 0) {
      return Response.json({ 
        error: 'Un compte client existe déjà avec cet email' 
      }, { status: 400 });
    }

    // Inviter l'utilisateur (crée un compte auth)
    try {
      await base44.asServiceRole.users.inviteUser(email, 'user');
    } catch (e) {
      // Si l'utilisateur existe déjà dans l'auth, c'est OK
      console.log('User may already exist:', e);
    }

    // Récupérer l'user créé
    const users = await base44.asServiceRole.entities.User.filter({ email });
    if (users.length === 0) {
      return Response.json({ 
        error: 'Erreur lors de la création du compte' 
      }, { status: 500 });
    }

    const user = users[0];

    // Créer le profil client
    const client = await base44.asServiceRole.entities.Client.create({
      user_id: user.id,
      nom: nom,
      email: email,
      telephone: telephone,
      adresse: adresse || '',
      entreprise: entreprise || '',
      type: entreprise ? 'entreprise' : 'particulier',
      statut: 'actif',
      date_inscription: new Date().toISOString()
    });

    // Envoyer un email de bienvenue
    try {
      await base44.asServiceRole.functions.invoke('notifierClientEmail', {
        type: 'bienvenue',
        clientId: client.id,
        data: {}
      });
    } catch (e) {
      console.log('Erreur email bienvenue:', e);
    }

    return Response.json({
      success: true,
      message: 'Compte client créé avec succès. Veuillez vérifier votre email pour activer votre compte.',
      clientId: client.id
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    return Response.json({ 
      error: error.message || 'Erreur lors de l\'inscription'
    }, { status: 500 });
  }
});