import * as Sentry from '@sentry/node';
import cors from 'cors';
import express, { Express, NextFunction, Response } from 'express';
import helmet from 'helmet';

import { createVincentUserMiddleware } from '@lit-protocol/vincent-app-sdk/expressMiddleware';
import { getAppInfo, getPKPInfo, isAppUser } from '@lit-protocol/vincent-app-sdk/jwt';

import { handleGetHealthFactorRoute } from './healthFactor';
import {
  handleCreateProtectionRuleRoute,
  handleDeleteProtectionRuleRoute,
  handleDisableProtectionRuleRoute,
  handleEditProtectionRuleRoute,
  handleEnableProtectionRuleRoute,
  handleListProtectionRulesRoute,
  handleTestRepayRoute,
} from './protectionRules';
import { handleListPurchasesRoute } from './purchases';
import { router } from './rules';
import { VincentAuthenticatedRequest, userKey } from './types';
import { env } from '../env';
import { serviceLogger } from '../logger';

const { ALLOWED_AUDIENCE, CORS_ALLOWED_DOMAIN, IS_DEVELOPMENT, VINCENT_APP_ID } = env;

const { handler, middleware } = createVincentUserMiddleware({
  userKey,
  allowedAudience: ALLOWED_AUDIENCE,
  requiredAppId: VINCENT_APP_ID,
});

const corsConfig = {
  optionsSuccessStatus: 204,
  origin: IS_DEVELOPMENT ? true : [CORS_ALLOWED_DOMAIN],
};

const setSentryUserMiddleware = handler(
  (req: VincentAuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!isAppUser(req.user.decodedJWT)) {
      throw new Error('Vincent JWT is not an app user');
    }

    Sentry.setUser({
      app: getAppInfo(req.user.decodedJWT),
      ethAddress: getPKPInfo(req.user.decodedJWT).ethAddress,
    });
    next();
  }
);

export const registerRoutes = (app: Express) => {
  app.use(helmet());
  app.use(express.json());

  if (IS_DEVELOPMENT) {
    serviceLogger.info(`CORS is disabled for development`);
  } else {
    serviceLogger.info(`Configuring CORS with allowed domain: ${CORS_ALLOWED_DOMAIN}`);
  }
  app.use(cors(corsConfig));

  app.get('/purchases', middleware, setSentryUserMiddleware, handler(handleListPurchasesRoute));
  app.post(
    '/health-factor',
    middleware,
    setSentryUserMiddleware,
    handler(handleGetHealthFactorRoute)
  );

  // Protection Rules routes (HealthGuard)
  app.get(
    '/protection-rules',
    middleware,
    setSentryUserMiddleware,
    handler(handleListProtectionRulesRoute)
  );
  app.post(
    '/protection-rule',
    middleware,
    setSentryUserMiddleware,
    handler(handleCreateProtectionRuleRoute)
  );
  app.put(
    '/protection-rules/:scheduleId',
    middleware,
    setSentryUserMiddleware,
    handler(handleEditProtectionRuleRoute)
  );
  app.put(
    '/protection-rules/:scheduleId/enable',
    middleware,
    setSentryUserMiddleware,
    handler(handleEnableProtectionRuleRoute)
  );
  app.put(
    '/protection-rules/:scheduleId/disable',
    middleware,
    setSentryUserMiddleware,
    handler(handleDisableProtectionRuleRoute)
  );
  app.delete(
    '/protection-rules/:scheduleId',
    middleware,
    setSentryUserMiddleware,
    handler(handleDeleteProtectionRuleRoute)
  );

  app.post('/test-repay', middleware, setSentryUserMiddleware, handler(handleTestRepayRoute));

  app.use('/api/v1/rules', middleware, setSentryUserMiddleware, router);
  serviceLogger.info(`Routes registered`);
};
