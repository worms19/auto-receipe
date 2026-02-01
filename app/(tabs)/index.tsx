import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { getAllRecipes } from '@/lib/db';

export default function RecipeList() {
  const db = useSQLiteContext();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    getAllRecipes(db).then((recipes) => setCount(recipes.length));
  }, [db]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-gray-900">WeChef</Text>
      <Text className="text-gray-500 mt-2">{count} recipes in database</Text>
    </View>
  );
}
