import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { commandeId } = await req.json();

    // Récupérer la commande
    const commandes = await base44.asServiceRole.entities.Commande.filter({ id: commandeId });
    if (!commandes || commandes.length === 0) {
      return Response.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    const commande = commandes[0];

    // Rechercher le produit dans le catalogue
    const produitsCatalogue = await base44.asServiceRole.entities.ProduitCatalogue.filter({ 
      nom: commande.type_prestation,
      gestion_stock: true
    });

    if (produitsCatalogue.length > 0) {
      const produit = produitsCatalogue[0];
      const nouveauStock = Math.max(0, (produit.stock_actuel || 0) - (commande.quantite || 0));

      await base44.asServiceRole.entities.ProduitCatalogue.update(produit.id, {
        stock_actuel: nouveauStock
      });

      // Vérifier si stock faible
      if (nouveauStock <= (produit.stock_minimum || 5)) {
        // Envoyer alerte stock faible à l'admin
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: 'Imprimerie OGOOUE - Alerte Stock',
            to: user.email,
            subject: '⚠️ Alerte stock faible',
            body: `Le produit "${produit.nom}" a un stock faible.\n\nStock actuel: ${nouveauStock}\nStock minimum: ${produit.stock_minimum || 5}\n\nCommande concernée: ${commande.reference_commande}\n\nMerci de réapprovisionner.`
          });
        } catch (emailError) {
          console.error('Erreur envoi alerte stock:', emailError);
        }
      }

      return Response.json({
        success: true,
        message: 'Stock mis à jour',
        nouveauStock: nouveauStock
      });
    }

    return Response.json({
      success: true,
      message: 'Produit non trouvé dans le catalogue ou gestion de stock désactivée'
    });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});