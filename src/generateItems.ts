import { callApi } from './api';
import type { Item, SessionMode, DifficultyState } from './types';

export async function generateItems(
  mode: SessionMode,
  difficulty: DifficultyState,
  count: number,
  interests: string[] = [],
): Promise<Item[]> {
  const { items } = await callApi<{ items: Item[] }>('/api/items/generate', {
    mode,
    difficulty,
    count,
    interests,
  });
  return items;
}
