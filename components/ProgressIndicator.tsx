import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface ProgressIndicatorProps {
  progress: number; // 0-1
  stage: string;
}

export function ProgressIndicator({ progress, stage }: ProgressIndicatorProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(progress * 100, { duration: 300 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View className="w-full">
      <View className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <Animated.View
          className="h-full bg-blue-500 rounded-full"
          style={animatedStyle}
        />
      </View>
      <Text className="text-sm text-gray-600 text-center mt-2">{stage}</Text>
    </View>
  );
}
