import { User, ChatThread, Message } from '../types';

const API_BASE = 'http://localhost:3001/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('authToken');
    }
    return this.token;
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  async signup(username: string, email: string, password: string) {
    const response = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async verifyToken(): Promise<{ user: User }> {
    return this.request('/auth/verify');
  }

  async getThreads(): Promise<ChatThread[]> {
    return this.request('/threads');
  }

  async createThread(title?: string): Promise<ChatThread> {
    return this.request('/threads', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async updateThread(threadId: string, title: string): Promise<ChatThread> {
    return this.request(`/threads/${threadId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    });
  }

  async deleteThread(threadId: string) {
    return this.request(`/threads/${threadId}`, {
      method: 'DELETE',
    });
  }

  async getMessages(threadId: string): Promise<Message[]> {
    return this.request(`/threads/${threadId}/messages`);
  }

  async updateUserPreferences(preferences: User['preferences']) {
    return this.request('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    });
  }

  async updateMessageReactions(messageId: string, reactionType: 'like' | 'dislike' | null) {
    return this.request(`/messages/${messageId}/reactions`, {
      method: 'PUT',
      body: JSON.stringify({ reactionType }),
    });
  }

  async clearAllConversations() {
    return this.request('/user/clear-conversations', {
      method: 'DELETE',
    });
  }

  async deleteAccount() {
    return this.request('/user/account', {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService();