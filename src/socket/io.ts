import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setIO(instance: Server) {
  ioInstance = instance;
}

export function getIO(): Server | null {
  return ioInstance;
}
