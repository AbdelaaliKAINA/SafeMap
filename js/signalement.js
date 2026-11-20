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
// Retourne la ligne créée (avec son vrai id) : app.js s'en sert pour ne pas
// afficher deux fois le même signalement quand le temps réel le renvoie aussi.
// En cas d'échec, l'erreur est relancée : app.js l'attrape pour prévenir la personne.
async function enregistrerSignalement(signalement) {
    const { data, error } = await supabaseClient
    .from('signalements')
    .insert([{
        categorie : signalement.categorie,
        description : signalement.description,
        lat : signalement.lat,
        lng : signalement.lng
    }])
    .select()   // demande à Supabase de renvoyer la ligne créée
    .single();  // une seule ligne : on reçoit un objet plutôt qu'un tableau

    if (error) {
        throw error;
    }
    return data;
}

