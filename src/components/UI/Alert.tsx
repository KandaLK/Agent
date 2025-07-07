import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X, AlertTriangle, Info } from 'lucide-react';

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Alert: React.FC<AlertProps> = ({ type, message, onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getAlertStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50/95 dark:bg-green-900/90 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50/95 dark:bg-red-900/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50/95 dark:bg-yellow-900/90 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50/95 dark:bg-blue-900/90 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
      default:
        return 'bg-gray-50/95 dark:bg-gray-900/90 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const getIconStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-100 dark:bg-green-800';
      case 'error':
        return 'bg-red-100 dark:bg-red-800';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-800';
      case 'info':
        return 'bg-blue-100 dark:bg-blue-800';
      default:
        return 'bg-gray-100 dark:bg-gray-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getHoverStyles = () => {
    switch (type) {
      case 'success':
        return 'hover:bg-green-100 dark:hover:bg-green-800 text-green-600 dark:text-green-400';
      case 'error':
        return 'hover:bg-red-100 dark:hover:bg-red-800 text-red-600 dark:text-red-400';
      case 'warning':
        return 'hover:bg-yellow-100 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'hover:bg-blue-100 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-400';
      default:
        return 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 duration-300">
      <div className={`
        flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-lg min-w-[300px] max-w-md
        ${getAlertStyles()}
      `}>
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${getIconStyles()}
        `}>
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-relaxed">{message}</p>
        </div>
        
        <button
          onClick={onClose}
          className={`
            p-1 rounded-lg transition-colors flex-shrink-0
            ${getHoverStyles()}
          `}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};