import { Router, type IRouter } from 'express';
import { getHealth } from './health.controller.js';

export const healthRouter: IRouter = Router();

healthRouter.get('/', getHealth);
