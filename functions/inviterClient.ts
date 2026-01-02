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