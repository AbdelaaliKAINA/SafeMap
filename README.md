# SafeMap — Carte collaborative de signalements

SafeMap est un site Web qui permet de signaler sur une carte les problèmes de son quartier : un trottoir glacé, un lampadaire éteint, un nid-de-poule…

Projet libre du cours **8WEB101 — Conception et programmation de sites Web** (UQAC, automne 2026).
Équipe : Abdelaali Kaina, Gilbrin Matheis, Gibert Kilyan.

Technologie explorée : **[Leaflet.js](https://leafletjs.com)**, avec les tuiles **[OpenStreetMap](https://www.openstreetmap.org)**.

**Version actuelle : Étape 3 — Formulaire de signalement**

## Fonctionnalités

| Fonction | Détails | Notions Leaflet / Web |
|---|---|---|
| Carte | Centrée sur l'UQAC, déplacement et zoom | `L.map`, `L.tileLayer` |
| Choix de l'emplacement | Clic sur la carte, marqueur déplaçable, bulle d'aide | `carte.on("click")`, `draggable`, `dragend` |
| « Ma position » | Géolocalisation, cercle de précision, gestion du refus | `carte.locate()`, `locationfound`, `locationerror`, `L.circle` |
| Formulaire de signalement | Catégorie, description (5 à 500 caractères), validation, marqueur et fenêtre d'information | `<form>`, `preventDefault()`, `L.marker`, `bindPopup`, `textContent` |

## À venir

- Marqueurs colorés et filtres par catégorie
- Sauvegarde des signalements (pour l'instant, ils disparaissent au rechargement)

## Lancer le site

1. Ouvrir le dossier dans VS Code (ou VSCodium).
2. Avec l'extension **Live Preview** (Microsoft), ouvrir `index.html` puis cliquer sur l'icône d'aperçu.
3. Une connexion Internet est nécessaire (Leaflet et les tuiles sont chargés en ligne).

> Ne pas ouvrir `index.html` directement (`file://`) : les tuiles OpenStreetMap peuvent être refusées, et la géolocalisation exige HTTPS ou `localhost`.

## Organisation du code

```
SafeMap/
├── index.html     Structure de la page (HTML sémantique)
├── css/style.css  Apparence et adaptation mobile
└── js/app.js      Logique de la carte, en sections commentées
```

## Crédits

- [Leaflet](https://leafletjs.com) — bibliothèque de cartographie (licence BSD-2).
- © [Contributeurs OpenStreetMap](https://www.openstreetmap.org/copyright) — fond de carte.

## Utilisation de l'IA

Avec l'autorisation du professeur, un assistant d'IA (Claude) a été utilisé pour relire le code, le restructurer en sections commentées et rédiger cette documentation.
