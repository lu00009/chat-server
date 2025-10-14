    import { Server } from 'socket.io';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string | null;
      };
      cookies?: Record<string, string>;
      file?: Express.Multer.File;
      files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
      io?: Server;
    }
  }
}

export { }; // Important for global augmentation to work

export function Router() {
  throw new Error('Function not implemented.');
}

