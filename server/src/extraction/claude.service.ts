import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';

const RecipeSchema = z.object({
  title: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
});

export type Recipe = z.infer<typeof RecipeSchema>;

const SYSTEM_PROMPT = `You are a culinary expert that extracts recipes from cooking video transcripts.
Return a JSON object with exactly these fields:
- "title": string, the name of the dish
- "ingredients": array of STRINGS like ["200g spaghetti", "2 eggs", "100g parmesan"]
- "steps": array of STRINGS like ["Boil water", "Cook pasta for 8 minutes"]

IMPORTANT: ingredients and steps must be arrays of plain strings, NOT objects.
IMPORTANT: Keep the same language as the transcript. If the transcript is in French, output in French.
If quantities aren't specified, make reasonable estimates. Be thorough.`;

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  constructor(private readonly http: HttpService) {}

  async structureRecipe(transcript: string): Promise<Recipe> {
    this.logger.log('Structuring recipe with Mistral...');

    const { data } = await firstValueFrom(
      this.http.post(OLLAMA_URL, {
        model: 'mistral',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Extract the recipe from this cooking video transcript:\n\n${transcript}`,
          },
        ],
        format: 'json',
        stream: false,
      }),
    );

    const raw = JSON.parse(data.message.content);

    // Normalize in case Mistral returns objects instead of strings
    if (Array.isArray(raw.ingredients)) {
      raw.ingredients = raw.ingredients.map((i: unknown) =>
        typeof i === 'string' ? i : Object.values(i as Record<string, string>).join(' '),
      );
    }
    if (Array.isArray(raw.steps)) {
      raw.steps = raw.steps.map((s: unknown) =>
        typeof s === 'string' ? s : Object.values(s as Record<string, string>).join(' '),
      );
    }

    const parsed = RecipeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid recipe format: ${parsed.error.message}`);
    }

    this.logger.log(`Structured recipe: ${parsed.data.title}`);
    return parsed.data;
  }
}
