import { apiClient } from '@/shared/lib/api-client';

export interface SceneState {
  playerPosition: { x: number; y: number; z: number };
  unlockedObjects: string[];
  sceneProgress: Record<string, unknown>;
}
export interface SceneDefinition {
  id: string;
  levelId: string;
  modelUrl: string | null;
  objects: unknown;
  settings: unknown;
}
function data<T>(response: { data: { data: T } }): T {
  return response.data.data;
}
export const sceneApi = {
  load: (levelId: string) =>
    apiClient
      .get(`/player/levels/${encodeURIComponent(levelId)}/scene`)
      .then(data<{ definition: SceneDefinition | null; state: SceneState }>),
  save: (levelId: string, state: SceneState) =>
    apiClient
      .put(`/player/levels/${encodeURIComponent(levelId)}/scene/state`, state)
      .then(data<{ state: SceneState }>),
};
