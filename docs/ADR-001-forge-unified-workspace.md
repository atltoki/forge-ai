# ADR-001 : Fusion native ATLOS et JARVIS dans FORGE AI

**Statut :** Accepté  
**Date :** 2026-08-11  
**Décideurs :** FORGE AI / ATLYN

## Contexte

ATLOS et JARVIS existaient comme applications Cloudflare Pages statiques distinctes. ATLOS conservait principalement ses données dans le navigateur. JARVIS mélangeait interface, configuration locale et intégrations potentielles. FORGE possède déjà l’authentification, Supabase, les missions, la mémoire et le Worker Cloudflare.

## Décision

FORGE devient l’application unique. Les fonctions d’ATLOS sont intégrées au nouvel accueil **Pilotage**. Les fonctions de JARVIS sont intégrées au **Cockpit**, qui commande les agents et missions existants. Les deux modules utilisent la session utilisateur, les politiques RLS et les tables FORGE actuelles.

## Options considérées

### Intégrer les anciens sites par iframe

- Complexité initiale faible.
- Données, navigation et authentification restent fragmentées.
- Les secrets et données locales demeurent difficiles à sécuriser.

### Maintenir trois applications connectées par API

- Déploiements indépendants.
- Coût de maintenance et synchronisation élevés pour une petite équipe.

### Fusion native dans FORGE — retenue

- Une seule authentification et une seule source de vérité.
- Réutilisation du pipeline de missions opérationnel.
- Migration progressive des fonctions CRM et projets sans dette d’intégration temporaire.

## Conséquences

- FORGE devient le point d’entrée unique.
- Les anciens domaines restent consultables pendant la migration, mais ne sont plus la source de vérité.
- Les futurs objets CRM et projets devront être ajoutés à Supabase avec RLS avant d’afficher des métriques commerciales.
