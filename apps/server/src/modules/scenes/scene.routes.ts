import { Router, type IRouter } from 'express';
import { z } from 'zod';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { sendError, sendSuccess } from '../../shared/lib/response.js';
import {
  getSceneDefinition,
  listSceneDefinitions,
  loadSceneState,
  saveSceneDefinition,
  saveSceneState,
} from './scene.service.js';

const stateSchema = z.object({
  playerPosition: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  unlockedObjects: z.array(z.string().max(100)).max(100),
  sceneProgress: z.record(z.unknown()),
});
const definitionSchema = z.object({
  modelUrl: z.string().url().optional(),
  objects: z.unknown(),
  settings: z.unknown().optional(),
  isPublished: z.boolean().optional(),
});
const param = (value: string | string[] | undefined) => (typeof value === 'string' ? value : '');

export const sceneRouter: IRouter = Router();
sceneRouter.use(authenticate);
sceneRouter.get(
  '/levels/:levelId/scene',
  asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    const levelId = param(req.params['levelId']);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
      return;
    }
    const [definition, state] = await Promise.all([
      getSceneDefinition(levelId),
      loadSceneState(userId, levelId),
    ]);
    sendSuccess(res, { definition, state });
  }),
);
sceneRouter.put(
  '/levels/:levelId/scene/state',
  asyncHandler(async (req, res) => {
    const userId = req.user?.sub;
    const levelId = param(req.params['levelId']);
    if (!userId) {
      sendError(res, 401, 'UNAUTHORIZED', 'Not authenticated');
      return;
    }
    const state = stateSchema.parse(req.body);
    const saved = await saveSceneState(userId, levelId, state);
    if (!saved) {
      sendError(res, 404, 'NOT_FOUND', 'Level not found');
      return;
    }
    sendSuccess(res, { state: saved });
  }),
);

export const sceneAdminRouter: IRouter = Router();
sceneAdminRouter.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));
sceneAdminRouter.get(
  '/scenes',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, { scenes: await listSceneDefinitions() });
  }),
);
sceneAdminRouter.put(
  '/scenes/:levelId',
  asyncHandler(async (req, res) => {
    const value = definitionSchema.parse(req.body);
    sendSuccess(res, {
      scene: await saveSceneDefinition(
        param(req.params['levelId']),
        value as Parameters<typeof saveSceneDefinition>[1],
      ),
    });
  }),
);
