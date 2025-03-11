const path = require('path');
const { NestFactory } = require('@nestjs/core');
const { ExpressAdapter } = require('@nestjs/platform-express');
const express = require('express');

const server = express();
let cachedApp;

async function bootstrap() {
  if (cachedApp) {
    return cachedApp;
  }

  // Import the compiled AppModule
  const { AppModule } = require('../dist/src/app.module');
  
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    { logger: ['error', 'warn'] }
  );

  // Enable CORS
  app.enableCors();
  
  await app.init();
  cachedApp = app;
  return app;
}

module.exports = async (req, res) => {
  const app = await bootstrap();
  server(req, res);
};