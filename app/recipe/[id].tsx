import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getRecipeById, deleteRecipe } from '@/lib/db';
import { Recipe } from '@/lib/types';
import { RecipeDetail } from '@/components/RecipeDetail';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipe();
  }, [id]);

  const loadRecipe = async () => {
    if (!id) return;
    setLoading(true);
    const data = await getRecipeById(db, id);
    setRecipe(data);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteRecipe(db, id);
    router.back();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-8">
        <Text className="text-xl font-semibold text-gray-900">
          Recipe Not Found
        </Text>
        <Text className="text-gray-500 mt-2 text-center">
          This recipe may have been deleted
        </Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.title,
          headerBackTitle: 'Recipes',
        }}
      />
      <RecipeDetail recipe={recipe} onDelete={handleDelete} />
    </>
  );
}
