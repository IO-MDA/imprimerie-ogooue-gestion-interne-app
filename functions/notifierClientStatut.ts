import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { factureId, nouveauStatut, commentaire, noteInterne } = await req.json();

    if (!factureId || !nouveauStatut) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Récupérer la facture
    const factures = await base44.asServiceRole.entities.Facture.filter({ id: factureId });
    if (factures.length === 0) {
      return Response.json({ error: 'Facture not found' }, { status: 404 });
    }

    const facture = factures[0];

    // Créer l'entrée d'historique
    const nouvelHistorique = {
      statut: nouveauStatut,
      date: new Date().toISOString(),
      modifie_par: user.full_name,
      commentaire: commentaire || '',
      note_interne: noteInterne || ''
    };

    const historique = [...(facture.historique_statuts || []), nouvelHistorique];

    // Mettre à jour la facture avec note interne
    const updateData = {
      statut_commande: nouveauStatut,
      historique_statuts: historique
    };
    
    if (noteInterne) {
      updateData.notes_internes = (facture.notes_internes || '') + `\n[${new Date().toISOString()}] ${user.full_name}: ${noteInterne}`;
    }

    await base44.asServiceRole.entities.Facture.update(factureId, updateData);

    // Envoyer notification par email au client
    if (facture.client_email) {
      const statutLabels = {
        'en_attente': 'En attente',
        'en_preparation': 'En préparation',
        'prete': 'Prête pour retrait',
        'expediee': 'Expédiée',
        'livree': 'Livrée',
        'annulee': 'Annulée'
      };

      const emailBody = `
Bonjour ${facture.client_nom},

Le statut de votre commande ${facture.numero} a été mis à jour.

Nouveau statut: ${statutLabels[nouveauStatut] || nouveauStatut}
${commentaire ? `\nCommentaire: ${commentaire}` : ''}

Merci de votre confiance,
Imprimerie Ogooué
`;

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: facture.client_email,
          subject: `Mise à jour de votre commande ${facture.numero}`,
          body: emailBody,
          from_name: 'Imprimerie Ogooué'
        });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Continue même si l'email échoue
      }
    }

    return Response.json({
      success: true,
      message: 'Statut mis à jour et notification envoyée',
      historique: nouvelHistorique
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});