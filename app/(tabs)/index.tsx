import { useState, useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { getAllRecipes } from '@/lib/db';
import { Recipe } from '@/lib/types';
import { seedDatabase } from '@/lib/mock-data';
import { RecipeCard } from '@/components/RecipeCard';
import { EmptyState } from '@/components/EmptyState';

export default function RecipeList() {
  const db = useSQLiteContext();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecipes = useCallback(async () => {
    // Seed mock data on first run
    await seedDatabase(db);
    const data = await getAllRecipes(db);
    setRecipes(data);
  }, [db]);

  // Reload when screen comes into focus (after delete, etc.)
  useFocusEffect(
    useCallback(() => {
      loadRecipes();
    }, [loadRecipes])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  };

  if (recipes.length === 0) {
    return (
      <EmptyState
        title="No Recipes Yet"
        message="Share an Instagram video to add your first recipe"
      />
    );
  }

  return (
    <FlatList
      data={recipes}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <RecipeCard recipe={item} />}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={{ flexGrow: 1 }}
      className="flex-1 bg-gray-50"
    />
  );
}
