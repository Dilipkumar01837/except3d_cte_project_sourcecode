import { Router, type IRouter } from 'express';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { authorize } from '../../shared/middleware/authorize.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { validate } from '../../shared/middleware/validate.js';
import { assessmentSchema, attemptSchema, experimentSchema } from './learning.schema.js';
import {
  assessmentResultsHandler,
  assignExperimentsHandler,
  createAdminAssessmentHandler,
  createAdminExperimentHandler,
  deleteAdminAssessmentHandler,
  exportAnalyticsHandler,
  getAnalyticsHandler,
  listAdminAssessmentsHandler,
  listAdminExperimentsHandler,
  listAssessmentsHandler,
  submitAssessmentHandler,
  updateAdminAssessmentHandler,
  updateAdminExperimentHandler,
} from './learning.controller.js';

export const learningRouter: IRouter = Router();
learningRouter.use(authenticate);
learningRouter.get('/assessments', asyncHandler(listAssessmentsHandler));
learningRouter.post(
  '/assessments/:assessmentId/attempts',
  validate(attemptSchema),
  asyncHandler(submitAssessmentHandler),
);
learningRouter.get('/assessment-results', asyncHandler(assessmentResultsHandler));
learningRouter.post('/experiments/assign', asyncHandler(assignExperimentsHandler));

export const learningAdminRouter: IRouter = Router();
learningAdminRouter.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));
learningAdminRouter.get('/assessments', asyncHandler(listAdminAssessmentsHandler));
learningAdminRouter.post(
  '/assessments',
  validate(assessmentSchema),
  asyncHandler(createAdminAssessmentHandler),
);
learningAdminRouter.patch(
  '/assessments/:id',
  validate(assessmentSchema),
  asyncHandler(updateAdminAssessmentHandler),
);
learningAdminRouter.delete('/assessments/:id', asyncHandler(deleteAdminAssessmentHandler));
learningAdminRouter.get('/experiments', asyncHandler(listAdminExperimentsHandler));
learningAdminRouter.post(
  '/experiments',
  validate(experimentSchema),
  asyncHandler(createAdminExperimentHandler),
);
learningAdminRouter.patch(
  '/experiments/:id',
  validate(experimentSchema.partial()),
  asyncHandler(updateAdminExperimentHandler),
);
learningAdminRouter.get('/analytics', asyncHandler(getAnalyticsHandler));
learningAdminRouter.get('/analytics/export', asyncHandler(exportAnalyticsHandler));
