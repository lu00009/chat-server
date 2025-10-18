import fs from "fs";
import multer from "multer";
import path from "path";

// Use a single uploads directory at the project root in both dev (ts-node) and prod (dist)
// __dirname here resolves to:
//  - dev:   <project>/chat-server/src/middlewares/message
//  - build: <project>/chat-server/dist/middlewares/message
// Going three levels up lands at <project>/chat-server, then append '/uploads'
const uploadDir = path.resolve(__dirname, "../../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

export const upload = multer({ storage });