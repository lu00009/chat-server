    // src/types/express/index.d.ts

    declare global {
      namespace Express {
        interface Request {
          user?: {
            id: string;
          };
        }
      }
    }

    export { }; // Important for global augmentation to work
    