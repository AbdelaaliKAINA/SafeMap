/*
 * SafeMap — carte collaborative de signalements
 * ---------------------------------------------
 * Fonctionnalités de cette version :
 *   1. Carte Leaflet avec les tuiles OpenStreetMap
 *   2. Choix d'un emplacement par clic sur la carte (marqueur déplaçable)
 *   3. « Ma position » : géolocalisation avec carte.locate() et gestion du refus
 *   4. Formulaire de signalement (catégorie, description, emplacement)
 *   5. Marqueurs colorés : une épingle et un symbole par catégorie (L.divIcon)
 *   6. Chargement des signalements déjà enregistrés dans Supabase
 *   7. Temps réel : les signalements des autres apparaissent sans recharger la page
 *   8. Regroupement des signalements proches en bulles (plugin Leaflet.markercluster)
 *
 * Les nouveaux signalements sont enregistrés dans Supabase (voir signalement.js).
 * Si Supabase n'est pas disponible, ils sont gardés pendant la visite seulement.
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
  compteurVisibles: document.querySelector("#compteur-visibles"),
  mode:          document.querySelector("#mode"),
  formulaire:    document.querySelector("#formulaire"),
  categorie:     document.querySelector("#categorie"),
  description:   document.querySelector("#description"),
  nbCaracteres:  document.querySelector("#nb-caracteres"),
  infoEndroit:   document.querySelector("#info-endroit"),
  aideCarte:     document.querySelector("#aide-carte"),
  btnEnvoyer:    document.querySelector("#btn-envoyer"),
  notification:  document.querySelector("#notification")
};

const casesFiltres = Array.from(document.querySelectorAll(".filtres input[type='checkbox']"));


/* =========================================================================
 * 4. CARTE LEAFLET
 * ========================================================================= */

const carte = L.map("carte").setView(POSITION_DEPART, ZOOM_DEPART);
const groupesCategories = {};   // Un groupe de marqueurs par catégorie (sert aux filtres et au regroupement)
const iconesCategories = {};    // Une icône par catégorie, partagée par tous ses marqueurs

// Crée l'icône d'une catégorie : une épingle de couleur avec le symbole de la catégorie.
// L.divIcon dessine le marqueur en HTML/CSS au lieu d'une image.
function creerIcone(categorie) {
  const infos = CATEGORIES[categorie];
  return L.divIcon({
    // Remplace la classe par défaut de Leaflet, la classe de catégorie donne la couleur
    className: "marqueur " + categorie,
    html:
      '<span class="marqueur-epingle" aria-hidden="true">' +
        '<span class="marqueur-symbole">' + infos.emoji + "</span>" +
      "</span>" +
      '<span class="visuellement-cache">Signalement ' + infos.nom + "</span>",
    iconSize: [34, 34],    // taille de la tête de l'épingle, en pixels
    iconAnchor: [17, 41],  // point posé sur la coordonnée : la pointe (centre + 34 × √2 / 2 ≈ 24 px)
    popupAnchor: [0, -38]  // la fenêtre d'information s'ouvre au-dessus de l'épingle
  });
}

// Crée le groupe de marqueurs d'une catégorie.
// Avec le plugin Leaflet.markercluster, les signalements proches sont réunis
// dans une bulle qui affiche leur nombre ; un clic sur la bulle zoome dessus.
// Chaque catégorie a son propre groupe : les bulles gardent la couleur de leur
// catégorie, et les filtres continuent d'afficher ou de masquer un groupe entier.
// Si le plugin n'a pas pu être chargé, on garde un simple L.layerGroup.
function creerGroupe(categorie) {
  if (typeof L.markerClusterGroup !== "function") {
    return L.layerGroup();
  }
  return L.markerClusterGroup({
    maxClusterRadius: 45,         // distance (en pixels) sous laquelle les marqueurs sont regroupés
    showCoverageOnHover: false,   // pas de polygone de zone au survol
    iconCreateFunction: function (grappe) {
      const nombre = grappe.getChildCount(); // nombre de signalements dans la bulle
      return L.divIcon({
        className: "grappe " + categorie,  // la classe de catégorie donne la couleur (voir style.css)
        html: '<span aria-hidden="true">' + nombre + "</span>" +
              '<span class="visuellement-cache">' + nombre + " signalements " + CATEGORIES[categorie].nom + "</span>",
        iconSize: [38, 38]
      });
    }
  });
}

Object.keys(CATEGORIES).forEach(function (categorie) {
  groupesCategories[categorie] = creerGroupe(categorie).addTo(carte);
  iconesCategories[categorie] = creerIcone(categorie);
});

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
  // Solution de repli : date actuelle + nombre aléatoire, en base 36
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Indique si le client Supabase (créé dans js/spclient.js) est utilisable
function supabaseDisponible() {
  return typeof supabaseClient !== "undefined" && supabaseClient !== null;
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

elements.formulaire.addEventListener("submit", async function (evenement) {
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

  // Enregistrement dans Supabase. Le bouton est désactivé pendant l'envoi
  // pour éviter qu'un double clic crée deux fois le même signalement.
  let aAfficher = signalement;
  if (supabaseDisponible()) {
    elements.btnEnvoyer.disabled = true;
    try {
      // On garde la ligne renvoyée par la base : elle porte le vrai id
      aAfficher = await enregistrerSignalement(signalement);
    } catch (erreurEnvoi) {
      console.error("Enregistrement Supabase impossible :", erreurEnvoi);
      notifier("Le signalement n'a pas pu être enregistré. Vérifiez votre connexion et réessayez.");
      return; // Le formulaire est conservé pour pouvoir réessayer
    } finally {
      elements.btnEnvoyer.disabled = false;
    }
  }

  // Le temps réel a peut-être déjà affiché ce signalement (s'il est arrivé
  // avant la réponse de la base) : on ne l'ajoute que s'il n'est pas déjà là.
  const marqueur = afficherSignalementEnregistre(aAfficher);
  if (marqueur !== null) {
    ouvrirFenetre(marqueur, aAfficher.categorie);
  }

  mettreAJourCompteurs();
  reinitialiserFormulaire();
  notifier(supabaseDisponible()
    ? "Signalement publié."
    : "Signalement ajouté pour cette visite seulement (mode local).");
});


/* =========================================================================
 * 9. FILTRES PAR CATÉGORIE ET COMPTEURS
 * ========================================================================= */

// Met à jour les deux compteurs : le total, et ceux des catégories cochées
function mettreAJourCompteurs() {
  elements.compteurTotal.textContent = signalements.length;
  const categoriesVisibles = new Set(
    casesFiltres.filter(function (caseFiltre) {
      return caseFiltre.checked;
    }).map(function (caseFiltre) {
      return caseFiltre.value;
    })
  );
  elements.compteurVisibles.textContent = signalements.filter(function (signalement) {
    return categoriesVisibles.has(signalement.categorie);
  }).length;
}

// Affiche ou masque tout le groupe de couches d'une catégorie.
// Les marqueurs restent dans leur groupe : on ne les supprime ni ne les recrée.
function appliquerFiltre(caseFiltre) {
  const groupe = groupesCategories[caseFiltre.value];
  if (caseFiltre.checked) {
    groupe.addTo(carte);
  } else {
    carte.removeLayer(groupe);
  }
  mettreAJourCompteurs();
}

casesFiltres.forEach(function (caseFiltre) {
  caseFiltre.addEventListener("change", function () {
    appliquerFiltre(caseFiltre);
  });
});

document.querySelector("#btn-tout-afficher").addEventListener("click", function () {
  casesFiltres.forEach(function (caseFiltre) {
    caseFiltre.checked = true;
    appliquerFiltre(caseFiltre);
  });
});

// Valeurs de départ des compteurs (0 au chargement)
mettreAJourCompteurs();


/* =========================================================================
 * 10. CHARGEMENT DES SIGNALEMENTS ENREGISTRÉS (Supabase)
 * ========================================================================= */

// Vérifie qu'une ligne reçue de Supabase est utilisable avant de l'afficher.
// La base a déjà ses contraintes CHECK, mais on ne fait jamais confiance
// aveuglément à des données venues de l'extérieur.
function estSignalementValide(signalement) {
  if (signalement === null || typeof signalement !== "object") {
    return false;
  }
  if (!Object.hasOwn(CATEGORIES, signalement.categorie)) {
    return false;
  }
  if (typeof signalement.description !== "string") {
    return false;
  }
  const longueur = signalement.description.trim().length;
  if (longueur < DESCRIPTION_MIN || longueur > DESCRIPTION_MAX) {
    return false;
  }
  return Number.isFinite(signalement.lat) && Math.abs(signalement.lat) <= 90 &&
         Number.isFinite(signalement.lng) && Math.abs(signalement.lng) <= 180;
}

// Ouvre la fenêtre d'information d'un marqueur.
// S'il est caché dans une bulle de regroupement, zoomToShowLayer zoome d'abord
// jusqu'à ce que le marqueur soit visible, puis ouvre sa fenêtre.
function ouvrirFenetre(marqueur, categorie) {
  const groupe = groupesCategories[categorie];
  if (typeof groupe.zoomToShowLayer === "function" && carte.hasLayer(groupe)) {
    groupe.zoomToShowLayer(marqueur, function () {
      marqueur.openPopup();
    });
  } else {
    marqueur.openPopup();
  }
}

// Indique si un signalement (reconnu par son id) est déjà sur la carte
function estDejaAffiche(id) {
  return signalements.some(function (signalement) {
    return signalement.id === id;
  });
}

// Place un signalement sur la carte, dans le groupe de sa catégorie
// (les filtres et les compteurs s'appliquent donc à tous les signalements).
// Retourne le marqueur créé, ou null si le signalement était déjà affiché.
function afficherSignalementEnregistre(signalement) {
  if (estDejaAffiche(signalement.id)) {
    return null;
  }
  signalements.push(signalement);
  return L.marker([signalement.lat, signalement.lng], { icon: iconesCategories[signalement.categorie] })
    .addTo(groupesCategories[signalement.categorie])
    .bindPopup(creerContenuPopup(signalement));
}

// Récupère tous les signalements de la table « signalements » et les affiche sur la carte.
async function chargerSignalements() {
  if (!supabaseDisponible()) {
    elements.mode.textContent = "Mode local";
    return;
  }

  elements.mode.textContent = "Chargement…";
  try {
    // Équivaut à : SELECT … FROM signalements ORDER BY created_at
    // (Supabase renvoie au plus 1000 lignes par défaut.)
    const { data, error } = await supabaseClient
      .from("signalements")
      .select("id, categorie, description, lat, lng, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    let ignores = 0;
    data.forEach(function (signalement) {
      if (estSignalementValide(signalement)) {
        afficherSignalementEnregistre(signalement);
      } else {
        ignores++;
      }
    });
    mettreAJourCompteurs();

    elements.mode.textContent = "Mode partagé · Supabase";
    ecouterNouveauxSignalements(); // à partir de maintenant, on reçoit les ajouts en direct
    const nbCharges = data.length - ignores;
    let message = nbCharges === 0
      ? "Aucun signalement enregistré pour l'instant."
      : nbCharges + " signalement(s) chargé(s).";
    if (ignores > 0) {
      message += " " + ignores + " ignoré(s) car invalide(s).";
      console.warn("Signalements ignorés (données invalides) :", ignores);
    }
    notifier(message);
  } catch (erreur) {
    // Réseau coupé, clé refusée, table absente… : le reste du site continue de fonctionner
    console.error("Chargement Supabase impossible :", erreur);
    elements.mode.textContent = "Mode local (secours)";
    notifier("Impossible de charger les signalements enregistrés.");
  }
}



/* =========================================================================
 * 11. TEMPS RÉEL (Supabase Realtime)
 * ========================================================================= */

// Ouvre un canal qui écoute les ajouts (INSERT) dans la table « signalements ».
// Quand une autre personne publie un signalement, Supabase nous l'envoie
// immédiatement et on l'ajoute à la carte, sans recharger la page.
// (Nécessite la ligne « alter publication supabase_realtime … » de supabase.sql.)
function ecouterNouveauxSignalements() {
  supabaseClient
    .channel("signalements-temps-reel")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "signalements" },
      function (changement) {
        const nouveau = changement.new; // la ligne qui vient d'être ajoutée
        if (!estSignalementValide(nouveau)) {
          return;
        }
        // null = déjà affiché (par exemple notre propre signalement) : on ne fait rien
        if (afficherSignalementEnregistre(nouveau) !== null) {
          mettreAJourCompteurs();
          notifier("Nouveau signalement : " + CATEGORIES[nouveau.categorie].nom);
        }
      }
    )
    .subscribe(function (etat) {
      // SUBSCRIBED = connecté ; les autres états signalent un problème de connexion
      if (etat !== "SUBSCRIBED") {
        console.warn("Temps réel :", etat);
      }
    });
}


/* =========================================================================
 * 12. DÉMARRAGE
 * ========================================================================= */

chargerSignalements();
