# Feature Landscape: WeChef

**Domain:** Personal recipe extraction and collection app (iOS)
**Focus:** Instagram video to structured recipe
**Researched:** 2026-02-01
**Confidence:** HIGH (verified across multiple commercial apps and industry sources)

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Share sheet integration** | This IS the core use case. User shares Instagram URL from Instagram app. Without this, app is useless. | Medium | iOS Share Extension required |
| **Structured recipe display** | Users expect ingredients list separate from instructions. Raw transcript is not a recipe. | Low | AI/LLM does the structuring |
| **Recipe list view** | Must see all saved recipes at a glance. Every recipe app has this. | Low | Simple scrollable list |
| **Recipe detail view** | Tap recipe to see full details: title, photo, ingredients, steps | Low | Standard detail screen |
| **Original source link** | Users want to return to original video. Also proves provenance. | Low | Store and display URL |
| **Recipe photo/thumbnail** | Visual memory aid. "Which recipe was that pasta?" Users scan visually. | Low | Extract from video or Instagram |
| **Persistent local storage** | Recipes must survive app restart. This is basic. | Low | Core Data or SwiftData |
| **Delete recipe** | Users need to remove mistakes or unwanted recipes | Low | Swipe to delete or edit mode |
| **Offline access** | Kitchen has bad WiFi. Users cook offline. Every competitor supports this. | Low | Local-first by design |

## Differentiators

Features that set product apart. Not expected in v1, but add value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Serving size scaling** | Adjust "serves 4" to "serves 2" and recalculate all ingredients | Medium | Requires parsing quantities |
| **Cook mode** | Large text, keep screen on, step-by-step navigation | Medium | Mela, Paprika have this |
| **Timer integration** | Detect "cook for 5 minutes" and offer timer | High | Requires parsing + Live Activities |
| **Ingredient unit conversion** | Cups to grams, F to C | Medium | Useful but not expected |
| **Recipe categories/tags** | Organize by "Dinner", "Quick", "Italian" | Medium | Useful at scale (50+ recipes) |
| **Search** | Find recipe by name or ingredient | Medium | Not needed for small collections |
| **Meal planning calendar** | Plan recipes for the week | High | Major feature, post-v1 |
| **Grocery list generation** | Generate shopping list from recipe | High | Major feature, post-v1 |
| **Manual recipe entry** | Add recipes from other sources | Medium | Expands beyond Instagram |
| **Web recipe import** | Import from recipe blogs/websites | High | Many competitors do this |
| **Multi-platform sync** | iPad, Mac versions synced | High | iCloud sync, multiple apps |
| **Recipe sharing** | Send recipe to friend | Low | Share sheet export |
| **Nutrition information** | Calories, macros per serving | High | Requires ingredient database |
| **Voice commands in cook mode** | "Next step" hands-free | High | Speech recognition |
| **TikTok/YouTube support** | Expand beyond Instagram | Medium | Similar extraction pipeline |

## Anti-Features

Features to explicitly NOT build for v1. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **User accounts / login** | Personal tool. No need for cloud auth. Adds complexity, privacy concerns. | Use local storage only. iCloud for backup later. |
| **Social features / sharing to feed** | This is a personal tool, not a social network. Community features are scope explosion. | Just store locally. Export via share sheet if needed later. |
| **Recipe discovery / browse** | You're not building Allrecipes. User already has Instagram for discovery. | Focus purely on save-what-you-found. |
| **Hard-coded categories** | "One developer's Big Mistake was hard-coding categories... disaster for discovery." Forces user into your mental model. | If categories added later, use flexible tags user defines. |
| **Aggressive onboarding** | Users hate tutorials. They want to save a recipe NOW. | Minimal or zero onboarding. First action = share a recipe. |
| **Subscription paywall on core features** | "A frustrating, crippled free tier doesn't encourage upgrades; it encourages uninstalls." | If monetizing, make core use case work free. |
| **AI-generated recipes** | Users want to save THAT creator's recipe, not AI's interpretation. Defeats purpose. | AI structures existing recipe, doesn't create new ones. |
| **Complex filtering UI** | User said no search/filtering for v1. Keep it simple. | Simple chronological list is fine for < 50 recipes. |
| **Multi-language parsing** | Instagram videos are mostly in user's language. International support is scope creep. | Support one language well (English) first. |
| **Sync complexity early** | "Your data should work offline" but multi-device sync is hard. | Local-first. Consider iCloud later if needed. |

## Feature Dependencies

```
Share Sheet Extension
    |
    v
Audio Extraction -----> Transcription -----> Recipe Structuring (LLM)
    |                                              |
    v                                              v
Thumbnail Extraction                         Recipe Model
                                                   |
                                                   v
                                        Local Storage (Core Data/SwiftData)
                                                   |
                                                   v
                                  Recipe List View <---> Recipe Detail View
                                                   |
                                                   v
                                           Delete Recipe
```

Key dependency insight: Everything flows from the share sheet. Without working iOS Share Extension, app has no value.

## MVP Recommendation

Based on user requirements ("simple: scrollable list, structured recipe view with photo and original URL. No search, no filtering, no sharing for v1"):

### Must Build (v1 MVP)

1. **Share sheet extension** - Entry point for everything
2. **Instagram URL processing** - Extract video, get audio
3. **Audio transcription** - Speech-to-text
4. **LLM recipe structuring** - Turn transcript into ingredients + steps
5. **Recipe list view** - Scrollable, shows title + thumbnail
6. **Recipe detail view** - Title, photo, ingredients, steps, original URL
7. **Local persistence** - SwiftData or Core Data
8. **Delete recipe** - Basic CRUD

### Defer to Post-MVP

| Feature | Why Defer |
|---------|-----------|
| Search | User explicitly said not for v1. < 50 recipes don't need it. |
| Filtering | User explicitly said not for v1. |
| Categories/tags | Adds complexity. Not needed for small collection. |
| Serving scaling | Nice-to-have, not core value prop |
| Cook mode | Nice-to-have, not core value prop |
| Recipe editing | Can add after validating core flow works |
| Multi-platform | iOS first, expand if successful |
| Other video sources | Instagram first, expand if successful |

### Explicit Non-Goals

- User accounts
- Social features
- Recipe discovery
- Meal planning
- Grocery lists
- Sync (beyond device backup)

## Complexity Assessment

| Component | Complexity | Risk |
|-----------|------------|------|
| Share sheet extension | Medium | iOS extension development has quirks |
| Instagram video extraction | High | May require API or workarounds, potential TOS issues |
| Audio extraction from video | Medium | AVFoundation, well-documented |
| Transcription | Medium | Apple Speech or Whisper API |
| LLM structuring | Medium | OpenAI/Claude API, prompt engineering |
| Recipe list/detail UI | Low | Standard SwiftUI |
| Local storage | Low | SwiftData is straightforward |

**Highest risk:** Instagram video extraction. May need to research Instagram's current stance on third-party access.

## Sources

### Competitor Analysis
- [Honeydew - Social Media Recipe Imports 2026](https://honeydewcook.com/blog/recipe-apps-social-media-imports) - MEDIUM confidence
- [Recipe Manager Apps Comparison 2026](https://www.recipeone.app/blog/best-recipe-manager-apps) - MEDIUM confidence
- [Paprika App Review](https://www.paprikaapp.com/) - HIGH confidence (official)
- [Mela App Features](https://mela.recipes/) - HIGH confidence (official)
- [Flavorish AI Recipe Saver](https://www.flavorish.ai/) - MEDIUM confidence

### User Expectations
- [Recipe App UX Problems](https://moduscreate.com/blog/the-user-experience-on-recipe-sites-is-broken/) - MEDIUM confidence
- [Paprika Pros and Cons](https://www.plantoeat.com/blog/2023/07/paprika-app-review-pros-and-cons/) - MEDIUM confidence
- [Recipe App Common Complaints](https://justuseapp.com/en/app/974683711/recipe-keeper/reviews) - LOW confidence (user reviews)

### MVP Best Practices
- [Build a Recipe App Guide](https://www.recify.app/blog/build-a-recipe-app/) - MEDIUM confidence
- [Recipe App Development Features](https://www.echoinnovateit.com/blogs/developing-cooking-recipe-app) - MEDIUM confidence
