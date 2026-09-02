import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import {
  createDuelHandler,
  createDuelSubmissionHandler,
  getDuelHandler,
  joinDuelHandler,
  listDuels,
} from './duel.controller.js';

export const duelRouter: IRouter = Router();
duelRouter.use(authenticate);
duelRouter.get('/', asyncHandler(listDuels));
duelRouter.post('/', asyncHandler(createDuelHandler));
duelRouter.get('/:duelId', asyncHandler(getDuelHandler));
duelRouter.post('/:duelId/join', asyncHandler(joinDuelHandler));
duelRouter.post('/:duelId/submissions', asyncHandler(createDuelSubmissionHandler));
