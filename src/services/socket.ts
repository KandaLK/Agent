import { io, Socket } from 'socket.io-client';
import { Message, TypingIndicator } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) return;

    this.socket = io('http://localhost:3001');

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('new_message', (message: Message) => {
      this.emit('message', message);
    });

    this.socket.on('message_updated', (message: Message) => {
      this.emit('message_updated', message);
    });

    this.socket.on('message_deleted', (messageId: string) => {
      this.emit('message_deleted', messageId);
    });

    this.socket.on('processing_start', () => {
      this.emit('processing_start');
    });

    this.socket.on('processing_complete', () => {
      this.emit('processing_complete');
    });

    this.socket.on('typing_start', (data: TypingIndicator) => {
      this.emit('typing_start', data);
    });

    this.socket.on('typing_stop', () => {
      this.emit('typing_stop');
    });

    this.socket.on('error', (error: { message: string }) => {
      this.emit('error', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinThread(threadId: string) {
    if (this.socket) {
      this.socket.emit('join_thread', threadId);
    }
  }

  leaveThread(threadId: string) {
    if (this.socket) {
      this.socket.emit('leave_thread', threadId);
    }
  }

  sendMessage(threadId: string, content: string, userId: string, isEdit: boolean = false, messageId?: string) {
    if (this.socket) {
      this.socket.emit('send_message', { threadId, content, userId, isEdit, messageId });
    }
  }

  startTyping(threadId: string) {
    if (this.socket) {
      this.socket.emit('typing_start', { threadId });
    }
  }

  stopTyping(threadId: string) {
    if (this.socket) {
      this.socket.emit('typing_stop', { threadId });
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }
}

export const socketService = new SocketService();