// src/types/express/index.d.ts
import { User } from '@prisma/client'; // or from your models

declare global {
  namespace Express {
    interface Request {
      user?: User & { id: string }; // Add any custom JWT claims here if needed
    }
  }
}

export {}; // <-- important to make it a module
