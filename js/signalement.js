/*
 * Enregistrement des signalements dans Supabase
 * ---------------------------------------------
 * Ce fichier récupère les valeurs du formulaire et les coordonnées
 * sélectionnées sur la carte, puis les enregistre dans la table signalements.
 */

/* =========================================================================
 * 1. FORMULAIRE DE SIGNALEMENT
 * ========================================================================= */

const formSignalement = document.getElementById('formulaire')

formSignalement.addEventListener('submit', async function(event){
    event.preventDefault();

    // Récupère les valeurs saisies dans le formulaire
    const categorieSignalement = document.getElementById('categorie').value
    const descriptionSignalement = document.getElementById('description').value

    // Extrait la latitude et la longitude du texte affiché sous la carte
    const texteLocalisation = document.getElementById('info-endroit').textContent
    const coordonnees = texteLocalisation.match(/-?\d+(?:\.\d+)?/g) || []
    const latitudeSignalement = Number(coordonnees[0])
    const longitudeSignalement = Number(coordonnees[1])

    // Empêche l'envoi si aucun emplacement valide n'a été sélectionné
    if (coordonnees.length < 2) {
        console.error("Erreur : emplacement invalide")
        return
    }

    // Envoie le signalement dans la table Supabase
    const { error } = await supabaseClient
    .from('signalements')
    .insert([{
        categorie : categorieSignalement,
        description : descriptionSignalement,
        lat : latitudeSignalement,
        lng : longitudeSignalement
    }]);

    // Signale le résultat de l'enregistrement dans la console
    if(error){
        console.error("Erreur : ", error.message)
    } else {
        console.log("Réussi ! ");
    }
}, true);