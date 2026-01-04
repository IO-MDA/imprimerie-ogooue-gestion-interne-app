import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authentifier l'utilisateur (peut être appelé par une tâche planifiée)
    const user = await base44.auth.isAuthenticated();
    
    const notifications = [];
    const now = new Date();

    // 1. Vérifier les événements proches (7 jours avant)
    const evenements = await base44.asServiceRole.entities.Evenement.list();
    const evenementsProches = evenements.filter(evt => {
      if (!evt.date_debut) return false;
      const dateEvt = new Date(evt.date_debut);
      const diffJours = Math.ceil((dateEvt - now) / (1000 * 60 * 60 * 24));
      return diffJours > 0 && diffJours <= 7;
    });

    // 2. Vérifier les demandes RH sans réponse > 3 jours
    const demandesRH = await base44.asServiceRole.entities.DemandeRH.filter({ statut: 'en_attente' });
    const demandesAncienness = demandesRH.filter(d => {
      const dateCreation = new Date(d.created_date);
      const diffJours = Math.ceil((now - dateCreation) / (1000 * 60 * 60 * 24));
      return diffJours > 3;
    });

    // 3. Vérifier les anomalies de pointage non traitées
    const pointagesAnomalies = await base44.asServiceRole.entities.Pointage.filter({ statut: 'anomalie' });
    const anomaliesNonTraitees = pointagesAnomalies.filter(p => {
      // Vérifier si anomalie date d'aujourd'hui ou hier
      const datePointage = new Date(p.date);
      const diffJours = Math.ceil((now - datePointage) / (1000 * 60 * 60 * 24));
      return diffJours <= 2;
    });

    // 4. Vérifier les rappels RH (échéances)
    const rappels = await base44.asServiceRole.entities.RappelRH.filter({ statut: 'actif' });
    const rappelsATraiter = rappels.filter(r => {
      if (!r.date_echeance) return false;
      const dateEcheance = new Date(r.date_echeance);
      const joursAvant = r.jours_avant_rappel || 30;
      const diffJours = Math.ceil((dateEcheance - now) / (1000 * 60 * 60 * 24));
      return diffJours <= joursAvant && diffJours > 0;
    });

    // Récupérer tous les managers et admins
    const users = await base44.asServiceRole.entities.User.list();
    const managers = users.filter(u => u.role === 'admin' || u.role === 'manager');

    // Créer les notifications pour les événements proches
    for (const evt of evenementsProches) {
      const dateEvt = new Date(evt.date_debut);
      const diffJours = Math.ceil((dateEvt - now) / (1000 * 60 * 60 * 24));
      
      for (const manager of managers) {
        // Vérifier si notification déjà créée aujourd'hui
        const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
          destinataire_id: manager.id,
          reference_id: evt.id,
          reference_type: 'Evenement'
        });
        
        const todayNotif = existingNotifs.find(n => {
          const notifDate = new Date(n.created_date);
          return notifDate.toDateString() === now.toDateString();
        });

        if (!todayNotif) {
          await base44.asServiceRole.entities.Notification.create({
            destinataire_id: manager.id,
            destinataire_nom: manager.full_name || manager.email,
            destinataire_email: manager.email,
            type: 'systeme',
            titre: `📅 Événement dans ${diffJours} jour${diffJours > 1 ? 's' : ''}`,
            message: `L'événement "${evt.nom}" est prévu pour le ${new Date(evt.date_debut).toLocaleDateString('fr-FR')}`,
            reference_id: evt.id,
            reference_type: 'Evenement',
            priorite: diffJours <= 3 ? 'haute' : 'normale',
            action_url: '/Evenements'
          });
          notifications.push({ type: 'evenement', titre: evt.nom });
        }
      }
    }

    // Créer les notifications pour les demandes RH anciennes
    for (const demande of demandesAncienness) {
      const dateCreation = new Date(demande.created_date);
      const diffJours = Math.ceil((now - dateCreation) / (1000 * 60 * 60 * 24));
      
      for (const manager of managers) {
        const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
          destinataire_id: manager.id,
          reference_id: demande.id,
          reference_type: 'DemandeRH'
        });
        
        const todayNotif = existingNotifs.find(n => {
          const notifDate = new Date(n.created_date);
          return notifDate.toDateString() === now.toDateString();
        });

        if (!todayNotif) {
          await base44.asServiceRole.entities.Notification.create({
            destinataire_id: manager.id,
            destinataire_nom: manager.full_name || manager.email,
            destinataire_email: manager.email,
            type: 'systeme',
            titre: `⏰ Demande RH en attente depuis ${diffJours} jours`,
            message: `La demande "${demande.titre}" de ${demande.demandeur_nom} attend une réponse depuis ${diffJours} jours`,
            reference_id: demande.id,
            reference_type: 'DemandeRH',
            priorite: diffJours > 7 ? 'urgente' : 'haute',
            action_url: '/DemandesRH'
          });
          notifications.push({ type: 'demande_rh', titre: demande.titre });
        }
      }
    }

    // Créer les notifications pour les anomalies de pointage
    for (const anomalie of anomaliesNonTraitees) {
      for (const manager of managers) {
        const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
          destinataire_id: manager.id,
          reference_id: anomalie.id,
          reference_type: 'Pointage'
        });
        
        const todayNotif = existingNotifs.find(n => {
          const notifDate = new Date(n.created_date);
          return notifDate.toDateString() === now.toDateString();
        });

        if (!todayNotif) {
          await base44.asServiceRole.entities.Notification.create({
            destinataire_id: manager.id,
            destinataire_nom: manager.full_name || manager.email,
            destinataire_email: manager.email,
            type: 'systeme',
            titre: `⚠️ Anomalie pointage non traitée`,
            message: `Anomalie détectée pour ${anomalie.employe_nom} le ${new Date(anomalie.date).toLocaleDateString('fr-FR')}`,
            reference_id: anomalie.id,
            reference_type: 'Pointage',
            priorite: 'haute',
            action_url: '/Pointage'
          });
          notifications.push({ type: 'anomalie_pointage', employe: anomalie.employe_nom });
        }
      }
    }

    // Créer les notifications pour les rappels RH
    for (const rappel of rappelsATraiter) {
      const dateEcheance = new Date(rappel.date_echeance);
      const diffJours = Math.ceil((dateEcheance - now) / (1000 * 60 * 60 * 24));
      
      for (const manager of managers) {
        const existingNotifs = await base44.asServiceRole.entities.Notification.filter({
          destinataire_id: manager.id,
          reference_id: rappel.id,
          reference_type: 'RappelRH'
        });
        
        const recentNotif = existingNotifs.find(n => {
          const notifDate = new Date(n.created_date);
          const diffNotifJours = Math.ceil((now - notifDate) / (1000 * 60 * 60 * 24));
          return diffNotifJours < 7; // Ne pas notifier plus d'une fois par semaine
        });

        if (!recentNotif) {
          await base44.asServiceRole.entities.Notification.create({
            destinataire_id: manager.id,
            destinataire_nom: manager.full_name || manager.email,
            destinataire_email: manager.email,
            type: 'systeme',
            titre: `🔔 ${rappel.titre}`,
            message: `Échéance dans ${diffJours} jour${diffJours > 1 ? 's' : ''}: ${rappel.description || rappel.titre}${rappel.employe_nom ? ` (${rappel.employe_nom})` : ''}`,
            reference_id: rappel.id,
            reference_type: 'RappelRH',
            priorite: diffJours <= 7 ? 'haute' : 'normale',
            action_url: '/TableauBordRH'
          });
          notifications.push({ type: 'rappel_rh', titre: rappel.titre });
        }
      }
    }

    return Response.json({ 
      success: true, 
      notifications_created: notifications.length,
      details: {
        evenements_proches: evenementsProches.length,
        demandes_anciennes: demandesAncienness.length,
        anomalies_pointage: anomaliesNonTraitees.length,
        rappels_rh: rappelsATraiter.length
      },
      notifications
    });

  } catch (error) {
    console.error('Erreur notifications RH:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});