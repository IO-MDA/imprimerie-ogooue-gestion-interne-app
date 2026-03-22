import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authentification requise
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { factureId } = await req.json();

    if (!factureId) {
      return Response.json({ error: 'Missing factureId' }, { status: 400 });
    }

    // Récupérer la facture
    const factures = await base44.asServiceRole.entities.Facture.filter({ id: factureId });
    if (factures.length === 0) {
      return Response.json({ error: 'Facture not found' }, { status: 404 });
    }

    const facture = factures[0];

    // Récupérer l'historique des commandes similaires pour l'analyse
    const toutesFactures = await base44.asServiceRole.entities.Facture.list('-created_date', 100);
    const facturesLivrees = toutesFactures.filter(f => f.statut_commande === 'livree' && f.historique_statuts?.length > 0);

    // Construire le prompt pour l'IA
    const prompt = `Tu es un assistant d'estimation de délais pour une imprimerie. 

Analyse la commande suivante et estime un délai de livraison réaliste :

Commande actuelle :
- Numéro : ${facture.numero}
- Client : ${facture.client_nom}
- Nombre d'articles : ${facture.lignes?.length || 0}
- Articles : ${facture.lignes?.map(l => `${l.description} (Qté: ${l.quantite})`).join(', ')}
- Statut actuel : ${facture.statut_commande || 'en_attente'}
- Total : ${facture.total} FCFA

Historique des commandes similaires (pour référence) :
${facturesLivrees.slice(0, 10).map(f => {
  const debut = new Date(f.historique_statuts[0].date);
  const fin = new Date(f.historique_statuts[f.historique_statuts.length - 1].date);
  const duree = Math.round((fin - debut) / (1000 * 60 * 60 * 24));
  return `- ${f.lignes?.length || 0} articles, délai: ${duree} jours`;
}).join('\n')}

Basé sur :
1. La complexité des produits commandés
2. La quantité d'articles
3. L'historique des délais similaires
4. Le statut actuel de la commande

Retourne une estimation détaillée avec :
- delai_jours : nombre de jours estimés
- date_livraison_estimee : date estimée au format YYYY-MM-DD
- niveau_confiance : "haute", "moyenne" ou "basse"
- facteurs : liste des facteurs pris en compte
- conseil_client : message personnalisé pour le client
- etapes : liste des étapes avec délais estimés`;

    // Appeler l'IA
    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          delai_jours: { type: "number" },
          date_livraison_estimee: { type: "string" },
          niveau_confiance: { type: "string", enum: ["haute", "moyenne", "basse"] },
          facteurs: { type: "array", items: { type: "string" } },
          conseil_client: { type: "string" },
          etapes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nom: { type: "string" },
                delai_jours: { type: "number" },
                description: { type: "string" }
              }
            }
          }
        }
      }
    });

    // Mettre à jour la facture avec l'estimation
    await base44.asServiceRole.entities.Facture.update(factureId, {
      notes_internes: `${facture.notes_internes || ''}\n\n[Estimation IA] Délai: ${response.delai_jours} jours, Livraison estimée: ${response.date_livraison_estimee}`
    });

    return Response.json({
      success: true,
      estimation: response
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});