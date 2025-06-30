import express from 'express';
import authRoutes from './routes/auth.routes';

const app = express();

app.use(express.json());

app.use('/auth', authRoutes);
console.log('Registered routes:');
authRoutes.stack.forEach((layer) => {
  if (layer.route) {
    console.log(`${layer.route.stack[0].method.toUpperCase()} /auth${layer.route.path}`);
  }
});

export default app;