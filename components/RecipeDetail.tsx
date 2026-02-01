import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Recipe } from '@/lib/types';

interface RecipeDetailProps {
  recipe: Recipe;
  onDelete: () => void;
}

export function RecipeDetail({ recipe, onDelete }: RecipeDetailProps) {
  const handleOpenSource = async () => {
    if (!recipe.sourceUrl) return;

    const canOpen = await Linking.canOpenURL(recipe.sourceUrl);
    if (canOpen) {
      await Linking.openURL(recipe.sourceUrl);
    } else {
      Alert.alert('Error', 'Cannot open this URL');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Recipe',
      'Are you sure you want to delete this recipe?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Hero Image */}
      {recipe.thumbnailUrl && (
        <Image
          source={recipe.thumbnailUrl}
          style={{ width: '100%', height: 250 }}
          contentFit="cover"
          cachePolicy="disk"
        />
      )}

      <View className="p-4">
        {/* Title */}
        <Text className="text-2xl font-bold text-gray-900">
          {recipe.title}
        </Text>

        {/* Source Link */}
        {recipe.sourceUrl && (
          <Pressable
            onPress={handleOpenSource}
            className="mt-2 py-2"
          >
            <Text className="text-blue-600 underline">
              View original on Instagram
            </Text>
          </Pressable>
        )}

        {/* Ingredients Section */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Ingredients
          </Text>
          {recipe.ingredients.map((ingredient, index) => (
            <View key={index} className="flex-row mb-2">
              <Text className="text-gray-400 mr-2">•</Text>
              <Text className="text-gray-700 flex-1">{ingredient}</Text>
            </View>
          ))}
        </View>

        {/* Steps Section */}
        <View className="mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Instructions
          </Text>
          {recipe.steps.map((step, index) => (
            <View key={index} className="flex-row mb-4">
              <View className="w-6 h-6 rounded-full bg-sky-500 items-center justify-center mr-3 mt-0.5">
                <Text className="text-white text-sm font-medium">
                  {index + 1}
                </Text>
              </View>
              <Text className="text-gray-700 flex-1">{step}</Text>
            </View>
          ))}
        </View>

        {/* Delete Button */}
        <Pressable
          onPress={handleDelete}
          className="mt-8 mb-8 py-3 px-4 bg-red-50 rounded-lg border border-red-200 active:bg-red-100"
        >
          <Text className="text-red-600 text-center font-medium">
            Delete Recipe
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
