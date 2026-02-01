import { NewRecipe } from '@/lib/types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockDownload(url: string): Promise<void> {
  // Simulate 2 second video download
  await delay(2000);
}

export async function mockExtract(): Promise<string> {
  // Simulate extracting audio from video
  await delay(1500);
  return 'extracted_audio';
}

export async function mockTranscribe(): Promise<string> {
  // Simulate transcription
  await delay(2000);
  return `Here's how to make this delicious creamy garlic tuscan shrimp.
First, season your shrimp with salt and pepper.
Then melt two tablespoons of butter in a large skillet over medium-high heat.
Add the shrimp and cook for about two minutes per side until pink.
Remove the shrimp and set aside.
Add the garlic and cook for one minute until fragrant.
Pour in the heavy cream and parmesan, stirring until combined.
Add the sun-dried tomatoes and spinach.
Return the shrimp to the pan and let everything simmer together.
Season with Italian herbs and serve over pasta or rice.`;
}

export async function mockStructure(transcript: string): Promise<NewRecipe> {
  // Simulate AI structuring the transcript into a recipe
  await delay(1500);
  return {
    title: 'Creamy Garlic Tuscan Shrimp',
    ingredients: [
      '1 lb large shrimp, peeled and deveined',
      '2 tbsp butter',
      '4 cloves garlic, minced',
      '1 cup heavy cream',
      '1/2 cup parmesan cheese, grated',
      '1/2 cup sun-dried tomatoes, chopped',
      '2 cups fresh spinach',
      '1 tsp Italian seasoning',
      'Salt and pepper to taste',
    ],
    steps: [
      'Season shrimp with salt and pepper.',
      'Melt butter in a large skillet over medium-high heat.',
      'Add shrimp and cook 2 minutes per side until pink. Remove and set aside.',
      'Add garlic to the pan and cook for 1 minute until fragrant.',
      'Pour in heavy cream and parmesan, stirring until combined.',
      'Add sun-dried tomatoes and spinach, cooking until spinach wilts.',
      'Return shrimp to the pan and simmer for 2 minutes.',
      'Season with Italian herbs and serve over pasta or rice.',
    ],
    sourceUrl: null,
    thumbnailUrl: null,
  };
}
