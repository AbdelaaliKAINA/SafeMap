/*
 * SafeMap — carte collaborative de signalements
 * ---------------------------------------------
 * Fonctionnalités de cette version :
 *   1. Carte Leaflet avec les tuiles OpenStreetMap
 *   2. Choix d'un emplacement par clic sur la carte (marqueur déplaçable)
 *   3. « Ma position » : géolocalisation avec carte.locate() et gestion du refus
 *   4. Formulaire de signalement (catégorie, description, emplacement)
 *
 * Les signalements sont gardés en mémoire pendant la visite seulement :
 * la sauvegarde est prévue à une étape suivante.
 */

"use strict";


/* =========================================================================
 * 1. CONSTANTES
 * ========================================================================= */

// Centre de départ de la carte : campus de l'UQAC, Chicoutimi [latitude, longitude]
const POSITION_DEPART = [48.4204, -71.0527];
const ZOOM_DEPART = 14;
const ZOOM_DETAIL = 16;

// Catégories : la clé correspond à la valeur du <select>
const CATEGORIES = {
  voirie:    { nom: "Voirie",    emoji: "🚧" },
  eclairage: { nom: "Éclairage", emoji: "💡" },
  securite:  { nom: "Sécurité",  emoji: "🛡️" },
  autre:     { nom: "Autre",     emoji: "📍" }
};

const DESCRIPTION_MIN = 5;
const DESCRIPTION_MAX = 500;

// Durée d'affichage des notifications (millisecondes)
const DUREE_NOTIFICATION = 5000;


/* =========================================================================
 * 2. ÉTAT DE L'APPLICATION
 * ========================================================================= */

const signalements = [];        // Signalements publiés pendant la visite { id, categorie, description, lat, lng, created_at }
let endroitChoisi = null;       // Emplacement sélectionné pour le prochain signalement (L.LatLng)
let marqueurChoisi = null;      // Marqueur temporaire (déplaçable) de l'emplacement sélectionné
let cerclePosition = null;      // Cercle de précision de la géolocalisation
let minuterieNotification = null;


/* =========================================================================
 * 3. RÉFÉRENCES VERS LES ÉLÉMENTS DU DOM
 * ========================================================================= */

const elements = {
  btnPosition:   document.querySelector("#btn-position"),
  compteurTotal: document.querySelector("#compteur-total"),
  formulaire:    document.querySelector("#formulaire"),
  categorie:     document.querySelector("#categorie"),
  description:   document.querySelector("#description"),
  nbCaracteres:  document.querySelector("#nb-caracteres"),
  infoEndroit:   document.querySelector("#info-endroit"),
  aideCarte:     document.querySelector("#aide-carte"),
  btnEnvoyer:    document.querySelector("#btn-envoyer"),
  notification:  document.querySelector("#notification")
};


/* =========================================================================
 * 4. CARTE LEAFLET
 * ========================================================================= */

const carte = L.map("carte").setView(POSITION_DEPART, ZOOM_DEPART);

// Tuiles OpenStreetMap ({z} = zoom, {x} et {y} = position de la tuile).
// L'attribution est obligatoire selon la politique d'utilisation d'OpenStreetMap.
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(carte);


/* =========================================================================
 * 5. OUTILS
 * ========================================================================= */

// Affiche un message temporaire en bas de l'écran (annoncé aussi aux lecteurs d'écran)
function notifier(message) {
  elements.notification.textContent = message;
  elements.notification.hidden = false;
  clearTimeout(minuterieNotification);
  minuterieNotification = setTimeout(function () {
    elements.notification.hidden = true;
  }, DUREE_NOTIFICATION);
}

// Formate des coordonnées avec 5 décimales (environ 1 mètre de précision)
function formaterCoordonnees(lat, lng) {
  return lat.toFixed(5) + ", " + lng.toFixed(5);
}

// Génère un identifiant unique (crypto.randomUUID n'existe qu'en HTTPS ou localhost)
function genererId() {
  if (window.crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}


/* =========================================================================
 * 6. CHOIX DE L'EMPLACEMENT (clic sur la carte)
 * ========================================================================= */

// Sélectionne un emplacement pour le signalement.
// Appelée par le clic sur la carte, par « Ma position » et par le déplacement du marqueur.
function choisirEndroit(latlng) {
  endroitChoisi = latlng;

  if (marqueurChoisi === null) {
    // Marqueur déplaçable : on peut ajuster l'emplacement en le faisant glisser
    marqueurChoisi = L.marker(latlng, { draggable: true, alt: "Emplacement choisi" }).addTo(carte);
    marqueurChoisi.on("dragend", function () {
      choisirEndroit(marqueurChoisi.getLatLng());
    });
  } else {
    marqueurChoisi.setLatLng(latlng);
  }

  elements.infoEndroit.textContent =
    "Emplacement choisi : " + formaterCoordonnees(latlng.lat, latlng.lng) + " (marqueur déplaçable)";

  // L'emplacement est choisi : la bulle d'aide n'est plus utile
  elements.aideCarte.hidden = true;
}

carte.on("click", function (evenement) {
  choisirEndroit(evenement.latlng);
});


/* =========================================================================
 * 7. GÉOLOCALISATION (« Ma position ») avec carte.locate()
 * ========================================================================= */

elements.btnPosition.addEventListener("click", function () {
  elements.btnPosition.disabled = true;
  notifier("Recherche de votre position…");
  // Nécessite un contexte sécurisé (HTTPS ou localhost) et l'autorisation de la personne.
  carte.locate({ setView: false, enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
});

carte.on("locationfound", function (evenement) {
  elements.btnPosition.disabled = false;
  carte.setView(evenement.latlng, ZOOM_DETAIL);

  // Cercle dont le rayon correspond à la précision annoncée (en mètres)
  if (cerclePosition !== null) {
    carte.removeLayer(cerclePosition);
  }
  cerclePosition = L.circle(evenement.latlng, {
    radius: Math.max(evenement.accuracy, 10),
    color: "#087b73",
    fillOpacity: 0.08
  }).addTo(carte);

  // La position trouvée devient l'emplacement du signalement
  choisirEndroit(evenement.latlng);
  notifier("Position trouvée. Vous pouvez déplacer le marqueur pour ajuster.");
});

// Les codes d'erreur viennent de l'API GeolocationPositionError du navigateur
carte.on("locationerror", function (evenement) {
  elements.btnPosition.disabled = false;
  let message;
  if (evenement.code === 1) {
    message = "Accès à la position refusé.";
  } else if (evenement.code === 3) {
    message = "La recherche a pris trop de temps.";
  } else {
    message = "Position indisponible.";
  }
  notifier(message + " Cliquez sur la carte pour choisir l'emplacement.");
  console.warn("Géolocalisation :", evenement.message);
});


/* =========================================================================
 * 8. FORMULAIRE DE SIGNALEMENT
 * ========================================================================= */

// Compteur de caractères de la description
elements.description.addEventListener("input", function () {
  elements.nbCaracteres.textContent = elements.description.value.length;
});

// Remet le formulaire et la sélection dans leur état initial
function reinitialiserFormulaire() {
  elements.formulaire.reset();
  elements.nbCaracteres.textContent = "0";

  endroitChoisi = null;
  if (marqueurChoisi !== null) {
    carte.removeLayer(marqueurChoisi);
    marqueurChoisi = null;
  }
  elements.infoEndroit.textContent = "Aucun emplacement sélectionné. Cliquez sur la carte.";
  elements.aideCarte.hidden = false; // on réaffiche la bulle d'aide pour le prochain signalement
}

// Vérifie les champs et retourne un message d'erreur (ou null si tout est correct)
function validerFormulaire(categorie, description) {
  if (endroitChoisi === null) {
    return "Choisissez d'abord un emplacement sur la carte.";
  }
  if (!Object.hasOwn(CATEGORIES, categorie)) {
    elements.categorie.focus();
    return "Choisissez une catégorie.";
  }
  if (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX) {
    elements.description.focus();
    return "La description doit contenir de " + DESCRIPTION_MIN + " à " + DESCRIPTION_MAX + " caractères.";
  }
  return null;
}

// Crée le contenu de la fenêtre d'information d'un marqueur.
// On utilise textContent (et non innerHTML) : un texte saisi ne peut pas injecter de code.
function creerContenuPopup(signalement) {
  const categorie = CATEGORIES[signalement.categorie];
  const contenu = document.createElement("div");
  const titre = document.createElement("strong");
  titre.textContent = categorie.emoji + " " + categorie.nom;
  const texte = document.createElement("p");
  texte.textContent = signalement.description;
  contenu.append(titre, texte);
  return contenu;
}

elements.formulaire.addEventListener("submit", function (evenement) {
  evenement.preventDefault(); // Empêche le rechargement de la page

  const categorie = elements.categorie.value;
  const description = elements.description.value.trim();

  const erreur = validerFormulaire(categorie, description);
  if (erreur !== null) {
    notifier(erreur);
    return;
  }

  const signalement = {
    id: genererId(),
    categorie: categorie,
    description: description,
    lat: endroitChoisi.lat,
    lng: endroitChoisi.lng,
    created_at: new Date().toISOString()
  };
  signalements.push(signalement);

  // Marqueur permanent du signalement
  L.marker([signalement.lat, signalement.lng], { alt: "Signalement " + CATEGORIES[categorie].nom })
    .addTo(carte)
    .bindPopup(creerContenuPopup(signalement))
    .openPopup();

  elements.compteurTotal.textContent = signalements.length;
  reinitialiserFormulaire();
  notifier("Signalement publié (non sauvegardé pour l'instant).");
});
