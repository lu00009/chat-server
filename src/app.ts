import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import "reflect-metadata";
import { upload } from './middlewares/message/upload';
import authRoutes from './routes/auth.routes';
import groupRoutes from './routes/group.routes';
import memberRoutes from './routes/member.routes';
import topicRoutes from './routes/topic.routes';
import topicMessageRoutes from './routes/topic_message.routes';

import path from 'path';
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from 'swagger-ui-express';
import { env } from './env';
import messageRoutes from './routes/messages.routes';
import { swaggerOptions } from "./swagger/swaggerOptions";

const app = express();

app.use(express.json());
app.use(cookieParser());
const allowedOrigins = ["http://localhost:3000", "http://localhost:3002"];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));


const specs = swaggerJsdoc(swaggerOptions);
app.use(env.SWAGGER_PATH, swaggerUi.serve, swaggerUi.setup(specs));

app.use('/auth', authRoutes);
app.use('/group', groupRoutes);
app.use('/group', memberRoutes);
app.use('/group', topicRoutes);
app.use('/messages', topicMessageRoutes);

// Serve uploaded files
// Align the static serve directory with Multer's storage path (see middlewares/message/upload.ts)
// upload.ts stores files at projectRoot/uploads (../../../ from its location),
// so from here (src/app.ts) we also need to serve from projectRoot/uploads which is two levels up from dist/app.js
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

app.post("/upload", upload.single('file'), (req, res) => {
  res.json({ message: 'File uploaded successfully', file: req.file });
}); // serve media
app.use("/messages", messageRoutes)// dynamically import messages routes

// Test endpoint
app.get('/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'Server is working', timestamp: new Date().toISOString() });
});

// console.log('Registered routes:');
// authRoutes.stack.forEach((layer) => {
//   if (layer.route) {
//     console.log(`${layer.route.stack[0].method.toUpperCase()} /auth${layer.route.path}`);
//   }
// });
// groupRoutes.stack.forEach((layer) => {
//   if (layer.route) {
//     console.log(`${layer.route.stack[0].method.toUpperCase()} /group${layer.route.path}`);
//   }
// });
// memberRoutes.stack.forEach((layer) => {
//   if (layer.route) {
//     console.log(`${layer.route.stack[0].method.toUpperCase()} /group${layer.route.path}`);
//   }
// });
// topicRoutes.stack.forEach((layer) => {
//   if (layer.route) {
//     console.log(`${layer.route.stack[0].method.toUpperCase()} /group${layer.route.path}`);
//   }
// });
// messageRoutes.stack.forEach((layer) => {
//   if (layer.route) {
//     console.log(`${layer.route.stack[0].method.toUpperCase()} /messages${layer.route.path}`);
//   }
// });

export default app;
