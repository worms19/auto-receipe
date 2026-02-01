// Database row shape (snake_case, JSON strings for arrays)
export interface RecipeRow {
  id: string;
  title: string;
  ingredients: string; // JSON string array
  steps: string; // JSON string array
  source_url: string | null;
  thumbnail_url: string | null;
  created_at: number; // Unix timestamp
  updated_at: number; // Unix timestamp
}

// Application shape (camelCase, parsed arrays)
export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// For creating new recipes (omit auto-generated fields)
export type NewRecipe = Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>;
