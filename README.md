# SafeMap — Carte collaborative de signalements

SafeMap est un site Web qui permet de signaler sur une carte les problèmes de son quartier : un trottoir glacé, un lampadaire éteint, un nid-de-poule… Chaque signalement apparaît sous la forme d'une épingle colorée selon sa catégorie, il est enregistré dans une base de données partagée et il s'affiche en direct chez toutes les personnes qui consultent la carte.

Projet libre du cours **8WEB101 — Conception et programmation de sites Web** (UQAC, automne 2026).
Équipe : Abdelaali Kaina, Gilbrin Matheis, Gibert Kilyan.

Technologie explorée : **[Leaflet.js](https://leafletjs.com)**, avec les tuiles **[OpenStreetMap](https://www.openstreetmap.org)**. Base de données : **[Supabase](https://supabase.com)**.

## Fonctionnalités

| Fonction | Détails | Notions Leaflet / Web |
|---|---|---|
| Carte | Centrée sur l'UQAC, déplacement et zoom | `L.map`, `L.tileLayer` |
| Choix de l'emplacement | Clic sur la carte, marqueur déplaçable, bulle d'aide | `carte.on("click")`, `draggable`, `dragend` |
| « Ma position » | Géolocalisation, cercle de précision, gestion du refus | `carte.locate()`, `locationfound`, `locationerror`, `L.circle` |
| Formulaire de signalement | Catégorie, description (5 à 500 caractères), validation, fenêtre d'information | `<form>`, `preventDefault()`, `bindPopup`, `textContent` |
| Marqueurs colorés | Une épingle de couleur et un symbole par catégorie | `L.divIcon`, `iconAnchor`, `popupAnchor` |
| Filtres et compteurs | Afficher ou masquer une catégorie, « Tout afficher », total et signalements affichés | un `L.layerGroup` par catégorie, `addTo` / `removeLayer` |
| Sauvegarde partagée | Signalements enregistrés dans Supabase et rechargés à l'ouverture du site | `supabase-js` : `insert`, `select`, `order` |
| Temps réel | Un signalement publié par une autre personne apparaît sans recharger la page | Supabase Realtime : `channel`, `postgres_changes` |
| Regroupement des marqueurs | Les signalements proches forment une bulle de la couleur de leur catégorie, avec leur nombre ; un clic sur la bulle zoome dessus | Plugin [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) : `L.markerClusterGroup`, `iconCreateFunction`, `zoomToShowLayer` |
| Validation et erreurs | Données invalides ignorées, mode local de secours, formulaire conservé si l'envoi échoue | `try` / `catch` / `finally`, `async` / `await` |
| Adaptation et accessibilité | Ordinateur et téléphone, navigation au clavier, messages lus par les lecteurs d'écran | `@media`, lien d'évitement, `aria-live` |

## Lancer le site

1. Ouvrir le dossier dans VS Code (ou VSCodium).
2. Avec l'extension **Live Preview** (Microsoft), ouvrir `index.html` puis cliquer sur l'icône d'aperçu.
3. Une connexion Internet est nécessaire (Leaflet, Supabase et les tuiles sont chargés en ligne).

> Ne pas ouvrir `index.html` directement (`file://`) : les tuiles OpenStreetMap peuvent être refusées, et la géolocalisation exige HTTPS ou `localhost`.

L'indicateur en haut à droite montre l'état de la connexion :

| Indicateur | Signification |
|---|---|
| Mode partagé · Supabase | Les signalements sont chargés, enregistrés et reçus en temps réel |
| Mode local (secours) | Supabase ne répond pas : la carte fonctionne, mais les signalements ne sont pas enregistrés |
| Mode local | La bibliothèque Supabase n'a pas pu être chargée (pas d'Internet, bloqueur…) |

## Base de données (Supabase)

La base est déjà créée et le site y est connecté (`js/spclient.js`). Pour recréer la base dans un autre projet Supabase :

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor**, coller le contenu de `supabase.sql`, puis cliquer sur **Run**. Le script crée la table `signalements`, ses règles de sécurité et active le temps réel.
3. Dans **Project Settings > API**, copier la **Project URL** et la clé publique (**publishable** / **anon**).
4. Les coller dans `js/spclient.js`.

### Sécurité

- **RLS reste activée.** Avec la clé publique, il est seulement possible de *lire* et d'*ajouter* des signalements, jamais de modifier ou supprimer ceux des autres. La modération se fait depuis le tableau de bord Supabase.
- La clé présente dans `js/spclient.js` est la clé **publique** prévue pour le navigateur. Ne **jamais** y placer la clé secrète (`service_role`).
- Les contraintes `CHECK` de la table valident les données côté serveur, même si quelqu'un contourne le formulaire.
- Les données reçues de Supabase sont revérifiées par `estSignalementValide()` avant d'être affichées.
- Les textes saisis sont insérés avec `textContent` (jamais `innerHTML`) : impossible d'injecter du code dans la page.

## Comment fonctionnent les filtres

Chaque catégorie a son propre groupe de couches Leaflet (`L.layerGroup`). Chaque signalement, ancien ou nouveau, est ajouté au groupe de sa catégorie. Décocher une catégorie retire tout son groupe de la carte avec `carte.removeLayer(groupe)` ; la recocher le remet avec `groupe.addTo(carte)`. Les marqueurs ne sont jamais supprimés ni recréés.

## Comment fonctionne le regroupement des marqueurs

Quand beaucoup de signalements sont proches, la carte devient illisible. Le plugin **Leaflet.markercluster** remplace alors les marqueurs proches par une bulle qui indique leur nombre. En zoomant, ou en cliquant sur la bulle, les marqueurs se séparent.

Chaque catégorie a son propre groupe `L.markerClusterGroup` (au lieu d'un simple `L.layerGroup`). Ce groupe s'utilise exactement comme un groupe de couches : les filtres l'ajoutent ou le retirent de la carte de la même façon, et les bulles gardent la couleur de leur catégorie. Si le plugin ne se charge pas, le site revient automatiquement à un `L.layerGroup` sans regroupement.

## Comment fonctionne le temps réel

Après le chargement des signalements, le site ouvre un canal Supabase qui écoute les ajouts (`INSERT`) dans la table `signalements`. Quand quelqu'un publie un signalement, Supabase l'envoie immédiatement à tous les navigateurs ouverts, qui l'ajoutent à la carte.

Notre propre signalement nous revient aussi par ce canal. Pour ne pas l'afficher deux fois, chaque signalement est reconnu par l'identifiant (`id`) que la base lui donne, et un signalement déjà affiché est ignoré.

## Organisation du code

```
SafeMap/
├── index.html             Structure de la page (HTML sémantique)
├── css/style.css          Apparence, couleurs des catégories et adaptation mobile
├── js/
│   ├── spclient.js        Connexion à Supabase (URL et clé publique)
│   ├── signalement.js     Enregistrement d'un signalement dans la table
│   └── app.js             Logique de l'application, en 12 sections commentées
└── supabase.sql           Table, politiques de sécurité (RLS) et temps réel
```

## Contributions

| Membre | Contributions principales |
|---|---|
| Abdelaali Kaina | Mise en place du dépôt et de la structure HTML/CSS ; carte Leaflet et choix de l'emplacement ; géolocalisation « Ma position » ; formulaire de signalement ; temps réel Supabase ; regroupement des marqueurs (Leaflet.markercluster) ; mise en ligne sur GitHub Pages ; documentation |
| Gilbrin Matheis | Ajustements mobile et accessibilité ; premiers filtres par catégorie ; connexion à Supabase (`spclient.js`) ; enregistrement des signalements (`signalement.js`) |
| Gibert Kilyan | Marqueurs personnalisés par catégorie (`L.divIcon`) ; correction des filtres et des compteurs ; chargement et affichage des signalements enregistrés ; fiabilisation de l'enregistrement |

L'historique complet est visible dans les commits et les *pull requests* du dépôt.

## Limites connues

- Pas de comptes utilisateurs : la modification et la suppression d'un signalement se font par l'équipe dans le tableau de bord Supabase.
- Supabase renvoie au plus 1000 signalements par requête.
- Pas encore de recherche d'adresse (amélioration possible : plugin Leaflet *Control.Geocoder*).

## Crédits

- [Leaflet](https://leafletjs.com) — bibliothèque de cartographie (licence BSD-2).
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) — regroupement des marqueurs (licence MIT).
- © [Contributeurs OpenStreetMap](https://www.openstreetmap.org/copyright) — fond de carte.
- [Supabase](https://supabase.com) — base de données et temps réel.

## Utilisation de l'IA

Avec l'autorisation du professeur, un assistant d'IA (Claude) a été utilisé pour relire le code, le restructurer en sections commentées, aider à l'ajout du temps réel et rédiger cette documentation.
