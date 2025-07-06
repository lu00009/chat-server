import express from 'express';
import authRoutes from './routes/auth.routes';
import groupRoutes from './routes/group.routes';

const app = express();

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/group', groupRoutes);

// Test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

console.log('Registered routes:');
authRoutes.stack.forEach((layer) => {
  if (layer.route) {
    console.log(`${layer.route.stack[0].method.toUpperCase()} /auth${layer.route.path}`);
  }
});
groupRoutes.stack.forEach((layer) => {
  if (layer.route) {
    console.log(`${layer.route.stack[0].method.toUpperCase()} /group${layer.route.path}`);
  }
});

export default app;