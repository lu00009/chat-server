    // src/types/express/index.d.ts

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
      file?: Express.Multer.File;
      files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
    }
  }
}

export { }; // Important for global augmentation to work

export function Router() {
  throw new Error('Function not implemented.');
}
