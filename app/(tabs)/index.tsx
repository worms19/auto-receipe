import { useState, useCallback } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { getAllRecipes, saveRecipe } from '@/lib/db';
import { Recipe } from '@/lib/types';
import { seedDatabase } from '@/lib/mock-data';
import { RecipeCard } from '@/components/RecipeCard';
import { EmptyState } from '@/components/EmptyState';
import { URLInput } from '@/components/URLInput';
import { ProcessingModal } from '@/components/ProcessingModal';
import { usePipelineStore } from '@/lib/pipeline/store';

export default function RecipeList() {
  const db = useSQLiteContext();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const { stage, startProcessing, reset } = usePipelineStore();
  const isProcessing = !['idle', 'complete', 'error'].includes(stage);

  const loadRecipes = useCallback(async () => {
    // Seed mock data on first run
    await seedDatabase(db);
    const data = await getAllRecipes(db);
    setRecipes(data);
  }, [db]);

  const handleProcess = async (url: string) => {
    setModalVisible(true);
    const recipe = await startProcessing(url);
    if (recipe) {
      await saveRecipe(db, recipe);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    reset();
  };

  const handleRecipeSaved = () => {
    loadRecipes();
  };

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

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white border-b border-gray-200">
        <URLInput onSubmit={handleProcess} disabled={isProcessing} />
      </View>

      {recipes.length === 0 ? (
        <EmptyState
          title="No Recipes Yet"
          message="Share an Instagram video to add your first recipe"
        />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <RecipeCard recipe={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ flexGrow: 1 }}
          className="flex-1"
        />
      )}

      <ProcessingModal
        visible={modalVisible}
        onClose={handleModalClose}
        onRecipeSaved={handleRecipeSaved}
      />
    </View>
  );
}
