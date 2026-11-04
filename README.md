# SafeMap — Carte collaborative de signalements

SafeMap est un site Web qui permet de signaler sur une carte les problèmes de son quartier : un trottoir glacé, un lampadaire éteint, un nid-de-poule…

Projet libre du cours **8WEB101 — Conception et programmation de sites Web** (UQAC, automne 2026).
Équipe : Abdelaali Kaina, Gilbrin Matheis, Gibert Kilyan.

Technologie explorée : **[Leaflet.js](https://leafletjs.com)**, avec les tuiles **[OpenStreetMap](https://www.openstreetmap.org)**.

**Version actuelle : Étape 5 — Sauvegarde, validation et gestion des erreurs**

## Fonctionnalités

| Fonction | Détails | Notions Leaflet / Web |
|---|---|---|
| Carte | Centrée sur l'UQAC, déplacement et zoom | `L.map`, `L.tileLayer` |
| Choix de l'emplacement | Clic sur la carte, marqueur déplaçable, bulle d'aide | `carte.on("click")`, `draggable`, `dragend` |
| « Ma position » | Géolocalisation, cercle de précision, gestion du refus | `carte.locate()`, `locationfound`, `locationerror`, `L.circle` |
| Formulaire de signalement | Catégorie, description (5 à 500 caractères), validation, marqueur et fenêtre d'information | `<form>`, `preventDefault()`, `L.marker`, `bindPopup`, `textContent` |
| Marqueurs colorés | Une épingle de couleur et un symbole par catégorie | `L.divIcon`, `iconAnchor`, `popupAnchor` |
| Filtres | Afficher ou masquer une catégorie, « Tout afficher », compteurs | un `L.layerGroup` par catégorie, `addLayer` / `removeLayer` |
| Sauvegarde locale | Signalements conservés après rechargement de la page | `localStorage`, `JSON.stringify` / `JSON.parse` |
| Sauvegarde partagée (facultative) | Signalements visibles par tout le monde, en temps réel | Supabase (`supabase-js`), RLS, Realtime |
| Validation et erreurs | Données invalides ignorées, mode local de secours, formulaire conservé en cas d'échec | `try` / `catch` / `finally`, `async` / `await` |

## À venir

- Liste des signalements (voir, modifier, supprimer) et export
- Tests complémentaires sur navigateurs et appareils

## Lancer le site

1. Ouvrir le dossier dans VS Code (ou VSCodium).
2. Avec l'extension **Live Preview** (Microsoft), ouvrir `index.html` puis cliquer sur l'icône d'aperçu.
3. Une connexion Internet est nécessaire (Leaflet, Supabase et les tuiles sont chargés en ligne).

> Sans configuration, le site fonctionne en **mode local** : les signalements sont gardés dans le navigateur.

> Ne pas ouvrir `index.html` directement (`file://`) : les tuiles OpenStreetMap peuvent être refusées, et la géolocalisation exige HTTPS ou `localhost`.

## Activer le mode partagé (Supabase, facultatif)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor**, coller le contenu de `supabase.sql`, puis cliquer sur **Run**.
3. Dans **Project Settings > API**, copier la **Project URL** et la clé **anon public**.
4. Les coller dans `js/config.js`.
5. Recharger le site : l'indicateur en haut affiche « Mode partagé · Supabase ».

Si Supabase ne répond pas, le site affiche « Mode local (secours) » et continue de fonctionner avec les données du navigateur.

### Sécurité

- **RLS reste activée.** Avec la clé publique, il est seulement possible de *lire* et d'*ajouter* des signalements, jamais de modifier ou supprimer ceux des autres.
- Les contraintes `CHECK` de la table valident les données côté serveur, même si quelqu'un contourne le formulaire.
- Les données lues (navigateur ou Supabase) sont revérifiées par `estSignalementValide()` avant d'être affichées.
- Les textes saisis sont insérés avec `textContent` (jamais `innerHTML`) : impossible d'injecter du code dans la page.
- Ne **jamais** placer la clé `service_role` dans `js/config.js`.

## Comment fonctionnent les filtres

Chaque catégorie a son propre groupe de couches Leaflet (`L.layerGroup`). Un nouveau signalement est ajouté au groupe de sa catégorie. Décocher une catégorie retire tout son groupe de la carte avec `carte.removeLayer(groupe)` ; la recocher le remet avec `carte.addLayer(groupe)`. Les marqueurs ne sont jamais supprimés ni recréés.

## Organisation du code

```
SafeMap/
├── index.html     Structure de la page (HTML sémantique)
├── css/style.css  Apparence et adaptation mobile
├── js/
│   ├── config.js  Paramètres Supabase (facultatifs)
│   └── app.js     Logique de l'application, en 12 sections commentées
└── supabase.sql   Table, politiques de sécurité (RLS) et temps réel
```

## Crédits

- [Leaflet](https://leafletjs.com) — bibliothèque de cartographie (licence BSD-2).
- © [Contributeurs OpenStreetMap](https://www.openstreetmap.org/copyright) — fond de carte.
- [Supabase](https://supabase.com) — base de données et temps réel.

## Utilisation de l'IA

Avec l'autorisation du professeur, un assistant d'IA (Claude) a été utilisé pour relire le code, le restructurer en sections commentées et rédiger cette documentation.
