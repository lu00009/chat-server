    // src/types/express/index.d.ts

    declare global {
      namespace Express {
        interface Request {
          user?: {
            id: string;
            name: string | null;
          };
        }
      }
    }

    export { }; // Important for global augmentation to work
    