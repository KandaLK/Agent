import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingAlertProps {
  isVisible: boolean;
  message: string;
}

export const LoadingAlert: React.FC<LoadingAlertProps> = ({ isVisible, message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border backdrop-blur-lg min-w-[300px] max-w-md bg-blue-50/95 dark:bg-blue-900/90 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
          <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
};