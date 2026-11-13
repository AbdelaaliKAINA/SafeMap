const formSignalement = document.getElementById('formulaire')

formSignalement.addEventListener('submit', async function(event){
    event.preventDefault();

    const categorieSignalement = document.getElementById('categorie').value
    const descriptionSignalement = document.getElementById('description').value
    const texteLocalisation = document.getElementById('info-endroit').textContent
    const coordonnees = texteLocalisation.match(/-?\d+(?:\.\d+)?/g) || []
    const latitudeSignalement = Number(coordonnees[0])
    const longitudeSignalement = Number(coordonnees[1])

    if (coordonnees.length < 2) {
        console.error("Erreur : emplacement invalide")
        return
    }

    const { error } = await supabaseClient
    .from('signalements')
    .insert([{
        categorie : categorieSignalement,
        description : descriptionSignalement,
        lat : latitudeSignalement,
        lng : longitudeSignalement
    }]);

    if(error){
        console.error("Erreur : ", error.message)
    } else {
        console.log("Réussi ! ");
    }
}, true);