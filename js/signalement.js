/*
 * Enregistrement des signalements dans Supabase
 * ---------------------------------------------
 * Ce fichier reçoit un signalement déjà vérifié par le formulaire (voir app.js)
 * et l'enregistre dans la table signalements.
 */

/* =========================================================================
 * 1. ENREGISTREMENT D'UN SIGNALEMENT
 * ========================================================================= */

// Envoie le signalement { categorie, description, lat, lng } dans la table Supabase.
// La date (created_at) et l'identifiant (id) sont ajoutés par la base elle-même.
// En cas d'échec, l'erreur est relancée : app.js l'attrape pour prévenir la personne.
async function enregistrerSignalement(signalement) {
    const { error } = await supabaseClient
    .from('signalements')
    .insert([{
        categorie : signalement.categorie,
        description : signalement.description,
        lat : signalement.lat,
        lng : signalement.lng
    }]);

    if (error) {
        throw error
    }
}
