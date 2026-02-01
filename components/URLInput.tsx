import { useState } from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';

interface URLInputProps {
  onSubmit: (url: string) => void;
  disabled?: boolean;
}

export function URLInput({ onSubmit, disabled = false }: URLInputProps) {
  const [url, setUrl] = useState('');

  const handleSubmit = () => {
    if (url.trim() && !disabled) {
      onSubmit(url.trim());
      setUrl('');
    }
  };

  const isButtonDisabled = !url.trim() || disabled;

  return (
    <View className="flex-row items-center gap-2 px-4 py-3">
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="Paste Instagram URL..."
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        editable={!disabled}
        className="flex-1 h-12 px-4 border border-gray-300 rounded-lg bg-white text-gray-900"
      />
      <Pressable
        onPress={handleSubmit}
        disabled={isButtonDisabled}
        className={`h-12 px-6 rounded-lg items-center justify-center ${
          isButtonDisabled ? 'bg-gray-300' : 'bg-blue-500 active:bg-blue-600'
        }`}
      >
        <Text
          className={`font-semibold ${
            isButtonDisabled ? 'text-gray-500' : 'text-white'
          }`}
        >
          Process
        </Text>
      </Pressable>
    </View>
  );
}
