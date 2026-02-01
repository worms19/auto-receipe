import { NewRecipe } from './types';
import { SQLiteDatabase } from 'expo-sqlite';
import { saveRecipe, getAllRecipes } from './db';

export const mockRecipes: NewRecipe[] = [
  {
    title: "Creamy Garlic Tuscan Shrimp",
    ingredients: [
      "1 lb large shrimp, peeled and deveined",
      "4 cloves garlic, minced",
      "1 cup heavy cream",
      "1/2 cup sun-dried tomatoes, chopped",
      "2 cups fresh spinach",
      "1/2 cup parmesan cheese, grated",
      "2 tbsp olive oil",
      "Salt and pepper to taste",
      "Italian seasoning to taste"
    ],
    steps: [
      "Heat olive oil in a large skillet over medium-high heat.",
      "Season shrimp with salt, pepper, and Italian seasoning. Cook 2-3 minutes per side until pink. Remove and set aside.",
      "In the same pan, add garlic and cook for 30 seconds until fragrant.",
      "Pour in heavy cream and bring to a simmer.",
      "Add sun-dried tomatoes and parmesan cheese. Stir until cheese melts.",
      "Add spinach and cook until wilted, about 2 minutes.",
      "Return shrimp to the pan and toss to coat with sauce.",
      "Serve immediately over pasta or with crusty bread."
    ],
    sourceUrl: "https://www.instagram.com/p/example1/",
    thumbnailUrl: "https://picsum.photos/seed/shrimp/400/300"
  },
  {
    title: "One-Pan Lemon Herb Chicken",
    ingredients: [
      "4 chicken thighs, bone-in skin-on",
      "1 lb baby potatoes, halved",
      "1 lemon, sliced",
      "4 cloves garlic, smashed",
      "Fresh rosemary and thyme",
      "3 tbsp olive oil",
      "Salt and pepper"
    ],
    steps: [
      "Preheat oven to 425°F (220°C).",
      "Toss potatoes with 2 tbsp olive oil, salt, and pepper. Spread on a baking sheet.",
      "Season chicken thighs generously with salt and pepper.",
      "Nestle chicken among potatoes, skin-side up.",
      "Scatter garlic, lemon slices, and herbs around the pan.",
      "Drizzle remaining olive oil over chicken.",
      "Roast for 40-45 minutes until chicken is golden and potatoes are tender.",
      "Let rest 5 minutes before serving."
    ],
    sourceUrl: "https://www.instagram.com/p/example2/",
    thumbnailUrl: "https://picsum.photos/seed/chicken/400/300"
  },
  {
    title: "Quick Veggie Stir Fry",
    ingredients: [
      "2 cups broccoli florets",
      "1 red bell pepper, sliced",
      "1 cup snap peas",
      "3 cloves garlic, minced",
      "2 tbsp soy sauce",
      "1 tbsp sesame oil",
      "1 tbsp rice vinegar",
      "1 tsp fresh ginger, grated",
      "Sesame seeds for garnish"
    ],
    steps: [
      "Mix soy sauce, rice vinegar, and ginger in a small bowl. Set aside.",
      "Heat sesame oil in a wok or large skillet over high heat.",
      "Add broccoli and stir fry for 2 minutes.",
      "Add bell pepper and snap peas. Cook another 2 minutes.",
      "Add garlic and cook 30 seconds until fragrant.",
      "Pour sauce over vegetables and toss to coat.",
      "Cook 1 more minute until sauce thickens slightly.",
      "Garnish with sesame seeds and serve over rice."
    ],
    sourceUrl: "https://www.instagram.com/p/example3/",
    thumbnailUrl: "https://picsum.photos/seed/stirfry/400/300"
  }
];

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const existing = await getAllRecipes(db);
  if (existing.length > 0) {
    return; // Already seeded
  }

  for (const recipe of mockRecipes) {
    await saveRecipe(db, recipe);
  }
}
