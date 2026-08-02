import { Router, type IRouter } from 'express';
import { authRateLimit } from '../../shared/middleware/rate-limit.js';
import { validate } from '../../shared/middleware/validate.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import { asyncHandler } from '../../shared/middleware/error-handler.js';
import { env } from '../../config/index.js';
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
import {
  startGoogleOAuth,
  googleOAuthCallback,
  startGithubOAuth,
  githubOAuthCallback,
} from './oauth.controller.js';

export const authRouter: IRouter = Router();

authRouter.post('/register', authRateLimit, validate(registerSchema), asyncHandler(register));
authRouter.post('/login', authRateLimit, validate(loginSchema), asyncHandler(login));
authRouter.post('/logout', asyncHandler(logout));
authRouter.post('/refresh', authRateLimit, asyncHandler(refresh));
authRouter.post(
  '/forgot-password',
  authRateLimit,
  validate(forgotPasswordSchema),
  asyncHandler(forgotPasswordHandler),
);
authRouter.post(
  '/reset-password',
  authRateLimit,
  validate(resetPasswordSchema),
  asyncHandler(resetPasswordHandler),
);

// Protected routes under /me and /profile
authRouter.get('/me', authenticate, asyncHandler(getMe));
authRouter.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  asyncHandler(updateProfile),
);
authRouter.delete('/account', authenticate, asyncHandler(deleteAccount));

// OAuth — only register routes when credentials are configured
if (env.googleClientId) {
  authRouter.get('/google', startGoogleOAuth);
  authRouter.get('/google/callback', (req, res) => {
    void googleOAuthCallback(req, res);
  });
}

if (env.githubClientId) {
  authRouter.get('/github', startGithubOAuth);
  authRouter.get('/github/callback', (req, res) => {
    void githubOAuthCallback(req, res);
  });
}
