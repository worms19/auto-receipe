import { Text, View } from 'react-native';

export default function RecipeList() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-gray-900">WeChef</Text>
      <Text className="text-gray-500 mt-2">Your recipes will appear here</Text>
    </View>
  );
}
