import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule); 
  app.enableCors({
    origin: '*', // Adjust this to your frontend URL
  });
  await app.listen(3000);
  console.log('Server listening on http://localhost:3000');
}
bootstrap();
