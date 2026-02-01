import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Recipe } from '@/lib/types';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link href={`/recipe/${recipe.id}`} asChild>
      <Pressable className="flex-row p-4 bg-white border-b border-gray-100 active:bg-gray-50">
        {recipe.thumbnailUrl ? (
          <Image
            source={recipe.thumbnailUrl}
            style={{ width: 80, height: 80, borderRadius: 8 }}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View
            className="w-20 h-20 rounded-lg bg-gray-200 items-center justify-center"
          >
            <Text className="text-gray-400 text-2xl">🍳</Text>
          </View>
        )}
        <View className="flex-1 ml-4 justify-center">
          <Text className="text-lg font-semibold text-gray-900" numberOfLines={2}>
            {recipe.title}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
