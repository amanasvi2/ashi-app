import { callApi } from './api';
import type { Item, SessionMode, DifficultyState, LevelState } from './types';

export async function generateItems(
  mode: SessionMode,
  difficulty: DifficultyState,
  levels: LevelState,
  count: number,
  interests: string[] = [],
): Promise<Item[]> {
  const { items } = await callApi<{ items: Item[] }>('/api/items/generate', {
    mode,
    difficulty,
    levels,
    count,
    interests,
  });
  return items;
}
