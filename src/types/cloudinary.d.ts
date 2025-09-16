// Ambient declaration for the 'cloudinary' package to satisfy TypeScript in environments
// where the package's type declarations are not available.
// This is intentionally permissive (`any`) — replace with stronger types if desired.

declare module 'cloudinary' {
  export const v2: any;
  const cloudinary: any;
  export default cloudinary;
}
