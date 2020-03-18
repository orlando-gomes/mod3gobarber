module.exports = {
  dialect: 'postgres',
  host: 'localhost',
  username: 'postgres',
  password: 'docker',
  database: 'pratica',
  define: {
    timestamps: true,
    underscored: true,
    undescoredAll: true,
  },
};
