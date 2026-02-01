import { SQLiteDatabase } from 'expo-sqlite';
import { Recipe, RecipeRow, NewRecipe } from './types';
import { generateId } from './utils';

const DATABASE_VERSION = 1;

export async function initDatabase(db: SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        steps TEXT NOT NULL,
        source_url TEXT,
        thumbnail_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_recipes_created
      ON recipes(created_at DESC);
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export function parseRecipeRow(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    ingredients: JSON.parse(row.ingredients),
    steps: JSON.parse(row.steps),
    sourceUrl: row.source_url,
    thumbnailUrl: row.thumbnail_url,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getAllRecipes(db: SQLiteDatabase): Promise<Recipe[]> {
  const rows = await db.getAllAsync<RecipeRow>(
    'SELECT * FROM recipes ORDER BY created_at DESC'
  );
  return rows.map(parseRecipeRow);
}

export async function getRecipeById(
  db: SQLiteDatabase,
  id: string
): Promise<Recipe | null> {
  const row = await db.getFirstAsync<RecipeRow>(
    'SELECT * FROM recipes WHERE id = ?',
    [id]
  );
  return row ? parseRecipeRow(row) : null;
}

export async function saveRecipe(
  db: SQLiteDatabase,
  recipe: NewRecipe
): Promise<string> {
  const id = generateId();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO recipes (id, title, ingredients, steps, source_url, thumbnail_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      recipe.title,
      JSON.stringify(recipe.ingredients),
      JSON.stringify(recipe.steps),
      recipe.sourceUrl,
      recipe.thumbnailUrl,
      now,
      now,
    ]
  );

  return id;
}

export async function deleteRecipe(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
}
