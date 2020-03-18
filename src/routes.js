import { Router } from 'express';

import UserController from './app/controllers/UserController';
import SessionController from './app/controllers/SessionController';
import authMiddleware from './app/middlewares/auth';

const routs = new Router();

routs.post('/users', UserController.store);
routs.post('/sessions', SessionController.store);

routs.use(authMiddleware);

routs.put('/users', UserController.update);

export default routs;
