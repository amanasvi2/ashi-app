import { callApi } from './api';
import type { Item, SessionMode, DifficultyState, ItemType } from './types';

export async function generateItems(
  mode: SessionMode,
  difficulty: DifficultyState,
  count: number,
  interests: string[] = [],
  itemTypeWeights?: Partial<Record<ItemType, number>>,
): Promise<Item[]> {
  const { items } = await callApi<{ items: Item[] }>('/api/items/generate', {
    mode,
    difficulty,
    count,
    interests,
    itemTypeWeights,
  });
  return items;
}
