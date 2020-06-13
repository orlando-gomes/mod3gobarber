import 'dotenv/config';

import express from 'express';
import path from 'path';
import cors from 'cors';
import Youch from 'youch';
// Sentry is a Exception handler
import * as Sentry from '@sentry/node';
import sentryConfig from './config/sentry';

// That's for Sentry handlering asyncronous req/res
import 'express-async-errors';

import routs from './routes';

import './database/databaseloader';

class App {
  constructor() {
    this.server = express();

    // Sentry is a Exception handler
    Sentry.init(sentryConfig);

    this.middlewares();

    this.routes();

    this.exceptionHandler();
  }

  middlewares() {
    // Sentry is a Exception handler
    this.server.use(Sentry.Handlers.requestHandler());

    // O cors gera controle de acesso
    this.server.use(cors());
    // Em ambiente de produção, poderíamos setar
    // this.server.use(cors({ origin: 'https://rocketseat.com.br' }));

    this.server.use(express.json());
    this.server.use(
      '/files',
      express.static(path.resolve(__dirname, '..', 'tmp', 'uploads'))
    );
  }

  routes() {
    this.server.use(routs);
    // Sentry is a Exception handler
    this.server.use(Sentry.Handlers.errorHandler());
  }

  exceptionHandler() {
    this.server.use(async (err, req, res, next) => {
      if (process.env.NODE_ENV === 'development') {
        const errors = await new Youch(err, req).toJSON();

        return res.status(500).json(errors);
      }

      return res.status(500).json({ error: 'Internal server error' });
    });
  }
}

export default new App().server;
