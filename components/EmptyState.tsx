import { View, Text } from 'react-native';

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <Text className="text-xl font-semibold text-gray-900 text-center">
        {title}
      </Text>
      <Text className="text-gray-500 text-center mt-2">
        {message}
      </Text>
    </View>
  );
}
