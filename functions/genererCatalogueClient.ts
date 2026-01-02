import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Récupérer le client associé à l'utilisateur
    const clients = await base44.entities.Client.filter({ user_id: user.id });
    if (clients.length === 0) {
      return Response.json({ error: 'Profil client non trouvé' }, { status: 404 });
    }

    const client = clients[0];

    // Récupérer tous les produits actifs
    const produits = await base44.entities.ProduitCatalogue.filter({ actif: true, visible_clients: true });
    
    // Récupérer les tarifs personnalisés
    const tarifs = await base44.entities.TarifsClients.filter({ client_id: client.id });

    // Calculer les prix personnalisés
    const produitsAvecPrix = produits.map(p => {
      const tarif = tarifs.find(t => t.produit_id === p.id);
      let prixFinal = p.prix_unitaire;

      if (tarif) {
        if (tarif.prix_client) {
          prixFinal = tarif.prix_client;
        } else if (tarif.remise_pct) {
          prixFinal = p.prix_unitaire * (1 - tarif.remise_pct / 100);
        }
      } else if (client.remise_globale_pct) {
        prixFinal = p.prix_unitaire * (1 - client.remise_globale_pct / 100);
      }

      return {
        ...p,
        prix_client: prixFinal
      };
    });

    return Response.json({
      success: true,
      client: client,
      produits: produitsAvecPrix
    });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});