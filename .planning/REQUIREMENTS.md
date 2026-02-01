# Requirements: WeChef

**Defined:** 2026-02-01
**Core Value:** Turn messy spoken recipe videos into structured, readable recipes you can actually cook from.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Input

- [ ] **INPUT-01**: User can share Instagram URL to app via iOS share sheet
- [ ] **INPUT-02**: App receives and validates Instagram video URL

### Extraction

- [ ] **EXTR-01**: App downloads video from Instagram URL
- [ ] **EXTR-02**: App extracts audio track from downloaded video
- [ ] **EXTR-03**: App extracts thumbnail image from video

### Processing

- [ ] **PROC-01**: App transcribes audio to text using speech-to-text API
- [ ] **PROC-02**: App structures transcript into recipe format using AI (ingredients list, steps)
- [ ] **PROC-03**: App displays processing status to user during extraction/transcription

### Display

- [ ] **DISP-01**: User can view structured recipe with ingredients list and numbered steps
- [ ] **DISP-02**: User can see recipe thumbnail/photo
- [ ] **DISP-03**: User can tap to open original Instagram URL

### Storage

- [ ] **STOR-01**: User can save recipe to local collection
- [ ] **STOR-02**: Saved recipes persist across app restarts
- [ ] **STOR-03**: User can delete recipe from collection
- [ ] **STOR-04**: Recipes are available offline after saving

### Collection

- [ ] **COLL-01**: User can browse all saved recipes in scrollable list
- [ ] **COLL-02**: Recipe list shows title and thumbnail for each recipe

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Editing

- **EDIT-01**: User can edit recipe title after extraction
- **EDIT-02**: User can edit ingredients after extraction
- **EDIT-03**: User can edit steps after extraction

### Scaling

- **SCAL-01**: User can adjust serving size
- **SCAL-02**: Ingredient quantities recalculate based on serving size

### Cook Mode

- **COOK-01**: User can enter cook mode with large text display
- **COOK-02**: Screen stays on during cook mode
- **COOK-03**: User can navigate step-by-step in cook mode

### Expansion

- **EXPN-01**: Support TikTok video URLs
- **EXPN-02**: Support YouTube video URLs
- **EXPN-03**: Manual recipe entry (non-video sources)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User accounts / login | Personal tool only — no cloud auth needed |
| Social features / sharing | Personal collection, not a social app |
| Recipe discovery / browse | User uses Instagram for discovery, app is for saving |
| Search / filtering | Not needed for small collection (<50 recipes) |
| Categories / tags | Adds complexity, defer until collection grows |
| Meal planning | Major feature, out of scope for recipe extraction app |
| Grocery lists | Major feature, out of scope for recipe extraction app |
| Multi-platform sync | iOS only for v1, local storage sufficient |
| Nutrition info | Requires ingredient database, high complexity |
| AI-generated recipes | App saves creator's recipe, doesn't generate new ones |
| Multi-language | English only for v1 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INPUT-01 | Phase 5 | Pending |
| INPUT-02 | Phase 5 | Pending |
| EXTR-01 | Phase 4 | Pending |
| EXTR-02 | Phase 4 | Pending |
| EXTR-03 | Phase 4 | Pending |
| PROC-01 | Phase 3 | Pending |
| PROC-02 | Phase 3 | Pending |
| PROC-03 | Phase 2 | Pending |
| DISP-01 | Phase 1 | Pending |
| DISP-02 | Phase 1 | Pending |
| DISP-03 | Phase 1 | Pending |
| STOR-01 | Phase 1 | Pending |
| STOR-02 | Phase 1 | Pending |
| STOR-03 | Phase 1 | Pending |
| STOR-04 | Phase 1 | Pending |
| COLL-01 | Phase 1 | Pending |
| COLL-02 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 17 total
- Mapped to phases: 17
- Unmapped: 0

---
*Requirements defined: 2026-02-01*
*Last updated: 2026-02-01 after roadmap creation*
