import Sequelize from 'sequelize';
import mongoose from 'mongoose';

// database's connection data
import databaseConfig from '../config/database';

import User from '../app/models/User';
import File from '../app/models/File';
import Appointment from '../app/models/Appointment';

const models = [User, File, Appointment];

class Database {
  constructor() {
    this.init();
    this.mongo();
  }

  init() {
    this.connection = new Sequelize(databaseConfig);

    // The 2nd map run 'associate' method only if exists
    models
      .map(model => model.init(this.connection))
      .map(model => model.associate && model.associate(this.connection.models));
  }

  // The last option was proposed by the DeprecationWarning
  mongo() {
    this.mongoConnection = mongoose.connect(
      'mongodb://localhost:27017/gobarberpratica',
      {
        useNewUrlParser: true,
        useFindAndModify: true,
        useUnifiedTopology: true,
      }
    );
  }
}

export default new Database();
