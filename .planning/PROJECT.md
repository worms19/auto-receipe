# WeChef

## What This Is

A personal iOS app that rescues recipes from Instagram videos. Share a video link to the app, and it extracts the audio, transcribes it, and structures it into a readable recipe with ingredients and steps. Saved recipes live in a simple scrollable collection.

## Core Value

Turn messy spoken recipe videos into structured, readable recipes you can actually cook from.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Receive Instagram URL via iOS share sheet
- [ ] Extract audio from Instagram video
- [ ] Transcribe audio to text
- [ ] Structure transcript into recipe format (ingredients, steps)
- [ ] Display structured recipe with photo and original URL
- [ ] Save recipes to local collection
- [ ] Browse saved recipes in scrollable list

### Out of Scope

- Multi-user / accounts — personal tool only
- Search or filtering — simple scroll for now
- Manual recipe entry — Instagram import only
- Other platforms (TikTok, YouTube) — Instagram only for v1
- Sharing recipes with others — personal collection
- Meal planning / shopping lists — just the recipes

## Context

- React Native with Expo (specified by user)
- shadcn/ui for components (specified by user)
- iOS only
- Will need: video download capability, audio extraction, transcription API (likely Whisper), AI for structuring (likely Claude or GPT)
- Instagram doesn't provide official API for video download — will need workaround

## Constraints

- **Platform**: iOS only — no Android for v1
- **Tech stack**: React Native + Expo + shadcn — user preference
- **Scope**: Personal use — no backend user management needed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| iOS share sheet for input | Natural UX - share from Instagram directly | — Pending |
| Local storage only | Personal tool, no need for cloud sync | — Pending |
| Instagram only | Focused scope for v1 | — Pending |

---
*Last updated: 2025-02-01 after initialization*
