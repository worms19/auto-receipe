# Phase 04 — Raccourcis et pistes d'amélioration

## Raccourcis pris

### 1. Langue hardcodée `fr`
- **Fichier:** `server/src/extraction/extraction.service.ts`
- **Détail:** `language ?? 'fr'` — la langue de transcription est forcée en français
- **Risque:** Ne fonctionne pas pour les vidéos en anglais, espagnol, etc.

### 2. Nom du fichier `claude.service.ts` trompeur
- **Fichier:** `server/src/extraction/claude.service.ts`
- **Détail:** Le fichier s'appelle claude mais utilise Ollama/Mistral
- **Fix:** Renommer en `llm.service.ts` ou `structuring.service.ts`

### 3. Normalisation des réponses Mistral
- **Fichier:** `server/src/extraction/claude.service.ts`
- **Détail:** Hack pour convertir les objets en strings quand Mistral renvoie `{name, quantity}` au lieu de `"200g spaghetti"`
- **Risque:** Fragile, dépend de la structure des objets retournés

### 4. Pas de timeout sur Ollama
- **Fichier:** `server/src/extraction/claude.service.ts`
- **Détail:** L'appel HTTP à Ollama n'a pas de timeout, Mistral peut être lent (30s+)
- **Fix:** Ajouter `timeout` dans la config axios

### 5. Pas de retry
- **Fichiers:** Tous les services (`cobalt`, `whisper`, `claude`)
- **Détail:** Aucune logique de retry, un échec = erreur immédiate
- **Fix:** Retry avec backoff exponentiel sur les erreurs transitoires

### 6. Thumbnail en base64 dans le JSON
- **Fichier:** `server/src/extraction/extraction.service.ts`
- **Détail:** La thumbnail (~100KB base64) est incluse dans la réponse JSON
- **Fix:** Endpoint séparé `/thumbnail/:id` ou stockage serveur avec URL

### 7. Pas d'authentification sur le serveur
- **Fichier:** `server/src/main.ts`
- **Détail:** N'importe qui sur le réseau local peut appeler POST /extract
- **Fix:** API key simple ou auth bearer

### 8. Pas de health check
- **Détail:** Pas d'endpoint `/health` pour vérifier Cobalt + Whisper + Ollama
- **Fix:** Endpoint qui ping les 3 services et retourne leur statut

### 9. Port 3000 en dur
- **Fichier:** `server/src/main.ts`
- **Détail:** Conflits EADDRINUSE fréquents avec le watch mode NestJS
- **Fix:** Variable d'env `PORT`, ou `enableShutdownHooks()` dans NestJS

### 10. Code mort côté app
- **Fichiers:** `lib/api/whisper.ts`, `lib/api/claude.ts`
- **Détail:** Plus importés par le store depuis que tout passe par le serveur
- **Fix:** Supprimer ou garder derrière un flag pour le mode production (OpenAI/Claude direct)

### 11. `@anthropic-ai/sdk` dans le root package.json
- **Fichier:** `package.json`
- **Détail:** Plus utilisé côté app si tout passe par le serveur
- **Fix:** Supprimer la dépendance ou la garder pour un futur mode production

### 12. ffmpeg `acodec copy`
- **Fichier:** `server/src/extraction/media.service.ts`
- **Détail:** Copie le codec audio sans ré-encodage, suppose AAC
- **Risque:** Peut échouer sur des vidéos avec un codec audio non standard
- **Fix:** `-acodec aac` pour forcer le ré-encodage

### 13. Pas de limite de taille/durée
- **Détail:** Aucune validation avant téléchargement, une vidéo de 1h serait traitée
- **Fix:** Vérifier la durée via Cobalt metadata ou ffprobe avant traitement

### 14. Cleanup des fichiers temp
- **Fichier:** `server/src/extraction/extraction.service.ts`
- **Détail:** try/finally nettoie les fichiers, mais si le serveur crash ils restent dans `/tmp`
- **Fix:** Cleanup au démarrage des fichiers `wechef-*` dans `/tmp`

---

## Pistes d'amélioration

### Court terme
- [ ] Auto-détection de langue (premier pass whisper rapide, puis transcription)
- [ ] Renommer `claude.service.ts` → `structuring.service.ts`
- [ ] Supprimer le code mort (`lib/api/whisper.ts`, `lib/api/claude.ts`, `@anthropic-ai/sdk`)
- [ ] Ajouter timeout Ollama (60s)
- [ ] Endpoint `/health` avec statut des 3 services

### Moyen terme
- [ ] Streaming de la progression via SSE (cobalt → download → ffmpeg → whisper → structuring)
- [ ] Cache par URL Instagram (éviter de re-traiter la même vidéo)
- [ ] Tests unitaires et d'intégration sur le serveur NestJS
- [ ] Modèle plus gros pour le structuring (mixtral, llama3, ou retour à Claude)
- [ ] Sélection de la langue dans l'UI de l'app

### Long terme
- [ ] Queue de jobs (Bull/BullMQ) pour gérer plusieurs extractions en parallèle
- [ ] Mode production : choix entre Ollama local et API cloud (Claude/GPT)
- [ ] Support d'autres plateformes (TikTok, YouTube) via Cobalt
- [ ] Validation de la durée vidéo avant traitement
