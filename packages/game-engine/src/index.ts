export const GAME_ENGINE_VERSION = '0.1.0';

export function createGameEnginePlaceholder(): { version: string; ready: boolean } {
  return {
    version: GAME_ENGINE_VERSION,
    ready: false,
  };
}
