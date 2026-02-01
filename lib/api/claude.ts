/**
 * Anthropic Claude recipe structuring service.
 * Converts transcribed text into structured recipe format.
 */
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { StructuringError } from './errors';
import { NewRecipe } from '@/lib/types';

/**
 * Zod schema for recipe extraction.
 * Defines the structure Claude will output.
 */
const RecipeSchema = z.object({
  title: z.string().describe('The name of the dish'),
  ingredients: z.array(z.string()).describe('List of ingredients with quantities'),
  steps: z.array(z.string()).describe('Numbered cooking steps in order'),
});

/**
 * System prompt for recipe extraction.
 * Guides Claude to extract structured recipe data from transcripts.
 */
const SYSTEM_PROMPT = `You are a culinary expert that extracts recipes from cooking video transcripts.

Your task:
1. Identify the dish name from the transcript
2. Extract ALL ingredients mentioned, with specific quantities where stated
3. Extract cooking steps in the correct order
4. If quantities aren't specified, make reasonable estimates based on context

Be thorough - don't miss any ingredients or steps mentioned in the transcript.`;

/**
 * Structures a transcript into a recipe using Claude API.
 *
 * Uses tool_choice pattern for structured output, which guarantees
 * valid JSON matching the RecipeSchema.
 *
 * @param transcript - The transcribed text from a cooking video
 * @param apiKey - Anthropic API key
 * @returns Structured recipe with title, ingredients, and steps
 * @throws StructuringError on API failure or invalid response
 *
 * @example
 * ```typescript
 * const recipe = await structureRecipe(
 *   "Today we're making pasta carbonara. You'll need 400g spaghetti...",
 *   'sk-ant-...'
 * );
 * // => { title: 'Pasta Carbonara', ingredients: [...], steps: [...] }
 * ```
 */
export async function structureRecipe(
  transcript: string,
  apiKey: string
): Promise<NewRecipe> {
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Extract the recipe from this cooking video transcript:\n\n${transcript}`,
        },
      ],
      tools: [
        {
          name: 'extract_recipe',
          description: 'Extract structured recipe from transcript',
          input_schema: z.toJSONSchema(RecipeSchema) as Anthropic.Tool['input_schema'],
        },
      ],
      tool_choice: { type: 'tool', name: 'extract_recipe' },
    });

    // Check for issues with the response
    if (response.stop_reason === 'max_tokens') {
      throw new StructuringError('Response truncated - transcript may be too long');
    }

    // Find the tool use block in the response
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUse) {
      throw new StructuringError('Claude did not return a structured recipe');
    }

    // Parse and validate the recipe data
    const recipeData = toolUse.input as z.infer<typeof RecipeSchema>;

    // Validate with Zod schema
    const parsed = RecipeSchema.safeParse(recipeData);
    if (!parsed.success) {
      throw new StructuringError(
        `Invalid recipe format: ${parsed.error.message}`
      );
    }

    return {
      title: parsed.data.title,
      ingredients: parsed.data.ingredients,
      steps: parsed.data.steps,
      sourceUrl: null,
      thumbnailUrl: null,
    };
  } catch (error) {
    // Re-throw StructuringError as-is
    if (error instanceof StructuringError) {
      throw error;
    }

    // Handle Anthropic SDK errors
    if (error instanceof Anthropic.APIError) {
      throw new StructuringError(error.message, error.status);
    }

    // Wrap unknown errors
    throw new StructuringError(
      error instanceof Error ? error.message : 'Unknown structuring error'
    );
  }
}
