// src/swagger/swaggerOptions.ts
import { Options } from "swagger-jsdoc";

export const swaggerOptions: Options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Chat Server API", // Matches your title
      version: "1.0.0",         // Matches your version
      description: "API documentation for your Chat Server application.",
    },
    servers: [
      {
        url: "http://localhost:3002", // Make sure this matches your API base path
        description: "Development server",
      },
    ],
    // --- IMPORTANT: Ensure these schemas are defined if you reference them ---
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // Example User Schema (if you have one)
        User: {
          type: "object",
          required: ["username", "email", "password"],
          properties: {
            id: {
              type: "string",
              format: "uuid",
              readOnly: true,
            },
            username: {
              type: "string",
              description: "User's unique username",
            },
            email: {
              type: "string",
              format: "email",
              description: "User's email address",
            },
            password: {
              type: "string",
              format: "password",
              description: "User's password (hashed)",
            },
          },
        },
        Group: {
          type: "object",
          required: ["name", "description"],
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
          },
        },
        // Add other schemas for Chat messages, rooms, etc.
        
      },
    },
  },
  // --- THIS IS THE MOST CRITICAL PART ---
  // Ensure these paths correctly point to your compiled JavaScript files or source TypeScript files
  // that contain the JSDoc @swagger comments.
  apis: [
    "./src/routes/auth.routes.ts",
    "./src/routes/group.routes.ts",
    "./src/controllers/group.controller.ts",
    "./src/controllers/auth.controller.ts",
    "./dist/routes/*.js",
    "./dist/controllers/*.js"
  ],
};