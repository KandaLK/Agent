import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User } from '../types';
import { apiService } from '../services/api';
import { socketService } from '../services/socket';

interface AuthAction {
  type: 'LOGIN' | 'LOGOUT' | 'SET_USER' | 'SET_LOADING';
  payload?: any;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authReducer = (state: AuthState & { loading: boolean }, action: AuthAction) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
      };
    case 'SET_USER':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        loading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    default:
      return state;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    const initAuth = async () => {
      const token = apiService.getToken();
      if (token) {
        try {
          const response = await apiService.verifyToken();
          dispatch({ type: 'SET_USER', payload: response.user });
          socketService.connect();
        } catch (error) {
          apiService.clearToken();
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      dispatch({ type: 'LOGIN', payload: response });
      socketService.connect();
    } catch (error) {
      throw error;
    }
  };

  const signup = async (username: string, email: string, password: string) => {
    try {
      const response = await apiService.signup(username, email, password);
      dispatch({ type: 'LOGIN', payload: response });
      socketService.connect();
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    apiService.clearToken();
    socketService.disconnect();
    dispatch({ type: 'LOGOUT' });
    
    // Clear any cached data
    localStorage.removeItem('chatbot_cache');
    sessionStorage.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};