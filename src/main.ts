import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';

const server = express();

export async function createNestApp() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server)
  );
  app.enableCors();
  await app.init();
  return app;
}

// For local development
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  await app.listen(process.env.PORT || 3000);
}

// Only run bootstrap in local environment
if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}

// Export handler for Vercel
export default async function handler(req: any, res: any) {
  const app = await createNestApp();
  server(req, res);
}
