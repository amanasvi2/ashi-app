import { callApi } from './api';
import type { Item, SessionMode, DifficultyState, LevelState, PracticePresentation } from './types';

export async function generateItems(
  mode: SessionMode,
  difficulty: DifficultyState,
  levels: LevelState,
  count: number,
  interests: string[] = [],
  presentation: PracticePresentation = 'animated',
): Promise<Item[]> {
  const { items } = await callApi<{ items: Item[] }>('/api/items/generate', {
    mode,
    difficulty,
    levels,
    count,
    interests,
    presentation,
  });
  return items;
}
