import { Modal, View, Text, Pressable } from 'react-native';
import { usePipelineStore } from '@/lib/pipeline/store';
import { STAGE_LABELS, STAGE_PROGRESS } from '@/lib/pipeline/types';
import { ProgressIndicator } from './ProgressIndicator';

interface ProcessingModalProps {
  visible: boolean;
  onClose: () => void;
  onRecipeSaved?: () => void;
}

export function ProcessingModal({
  visible,
  onClose,
  onRecipeSaved,
}: ProcessingModalProps) {
  const { stage, error, reset } = usePipelineStore();

  const progress = STAGE_PROGRESS[stage];
  const label = STAGE_LABELS[stage];

  const isComplete = stage === 'complete';
  const isError = stage === 'error';
  const isProcessing = !['idle', 'complete', 'error'].includes(stage);

  const handleViewRecipes = () => {
    onClose();
    onRecipeSaved?.();
  };

  const handleTryAgain = () => {
    reset();
    onClose();
  };

  // Only allow closing when complete or error
  const canClose = isComplete || isError;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canClose ? onClose : undefined}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-2xl p-6 mx-6 w-80">
          <Text className="text-lg font-semibold text-center mb-4">{label}</Text>

          <ProgressIndicator progress={progress} stage={label} />

          {isError && error && (
            <Text className="text-red-500 text-center mt-4">{error}</Text>
          )}

          {isComplete && (
            <Pressable
              onPress={handleViewRecipes}
              className="mt-6 bg-green-500 rounded-lg py-3 active:bg-green-600"
            >
              <Text className="text-white text-center font-semibold">
                View Recipes
              </Text>
            </Pressable>
          )}

          {isError && (
            <Pressable
              onPress={handleTryAgain}
              className="mt-6 bg-red-500 rounded-lg py-3 active:bg-red-600"
            >
              <Text className="text-white text-center font-semibold">
                Try Again
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}
