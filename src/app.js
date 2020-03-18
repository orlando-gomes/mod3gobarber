import express from 'express';

import routs from './routes';

import './database/databaseloader';

class App {
  constructor() {
    this.server = express();

    this.middlewares();

    this.routes();
  }

  middlewares() {
    this.server.use(express.json());
  }

  routes() {
    this.server.use(routs);
  }
}

export default new App().server;
