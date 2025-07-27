import cors from 'cors';
import express from 'express';
import "reflect-metadata";
import { upload } from './middlewares/message/upload';
import authRoutes from './routes/auth.routes';
import groupRoutes from './routes/group.routes';
import memberRoutes from './routes/member.routes';
import topicRoutes from './routes/topic.routes';

import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from 'swagger-ui-express';
import messageRoutes from './routes/messages.routes';
import { swaggerOptions } from "./swagger/swaggerOptions";

const app = express();

app.use(express.json());
app.use(cors());

const specs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use('/auth', authRoutes);
app.use('/group', groupRoutes);
app.use('/group', memberRoutes);
app.use('/group', topicRoutes);

app.post("/upload", upload.single('file'), (req, res) => {
  res.json({ message: 'File uploaded successfully', file: req.file });
}); // serve media
app.use("/message", messageRoutes)// dynamically import messages routes

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
memberRoutes.stack.forEach((layer) => {
  if (layer.route) {
    console.log(`${layer.route.stack[0].method.toUpperCase()} /group${layer.route.path}`);
  }
});
topicRoutes.stack.forEach((layer) => {
  if (layer.route) {
    console.log(`${layer.route.stack[0].method.toUpperCase()} /group${layer.route.path}`);
  }
});
messageRoutes.stack.forEach((layer) => {
  if (layer.route) {
    console.log(`${layer.route.stack[0].method.toUpperCase()} /message${layer.route.path}`);
  }
});

export default app;
