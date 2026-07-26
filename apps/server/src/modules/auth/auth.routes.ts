import { Router, type IRouter } from 'express';
import { authRateLimit } from '../../shared/middleware/rate-limit.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from './auth.schema.js';
import {
  register,
  login,
  logout,
  refresh,
  forgotPasswordHandler,
  resetPasswordHandler,
  getMe,
  updateProfile,
  deleteAccount,
} from './auth.controller.js';

export const authRouter: IRouter = Router();

authRouter.post('/register', authRateLimit, validate(registerSchema), register);
authRouter.post('/login', authRateLimit, validate(loginSchema), login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', authRateLimit, refresh);
authRouter.post(
  '/forgot-password',
  authRateLimit,
  validate(forgotPasswordSchema),
  forgotPasswordHandler,
);
authRouter.post(
  '/reset-password',
  authRateLimit,
  validate(resetPasswordSchema),
  resetPasswordHandler,
);

// Protected routes under /me and /profile
authRouter.get('/me', authenticate, getMe);
authRouter.patch('/profile', authenticate, validate(updateProfileSchema), updateProfile);
authRouter.delete('/account', authenticate, deleteAccount);
