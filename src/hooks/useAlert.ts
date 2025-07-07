import { useState, useCallback } from 'react';

interface AlertState {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  isVisible: boolean;
}

export const useAlert = () => {
  const [alert, setAlert] = useState<AlertState>({
    type: 'info',
    message: '',
    isVisible: false,
  });

  const showAlert = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string, duration = 4000) => {
    setAlert({ type, message, isVisible: true });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, isVisible: false }));
    }, duration);
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, isVisible: false }));
  }, []);

  return {
    alert,
    showAlert,
    hideAlert,
  };
};