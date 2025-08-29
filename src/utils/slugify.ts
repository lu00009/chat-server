export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export function randomSuffix(len = 4): string {
  return Math.random().toString(36).slice(2, 2 + len);
}

export function generateInviteCode(): string {
  return 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}