const connections = new Map<string, number>();

export function userConnected(userId: string) {
  const count = connections.get(userId) || 0;
  connections.set(userId, count + 1);
}

export function userDisconnected(userId: string) {
  const count = connections.get(userId) || 0;
  if (count <= 1) connections.delete(userId);
  else connections.set(userId, count - 1);
}

export function isOnline(userId: string): boolean {
  return (connections.get(userId) || 0) > 0;
}

export function getOnlineUsers(): string[] {
  return Array.from(connections.keys());
}
