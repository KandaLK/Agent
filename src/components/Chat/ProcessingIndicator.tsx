import React, { useEffect, useState } from 'react';
import { Bot } from 'lucide-react';

const PROCESSING_WORDS = [
  'Thinking', 'Analyzing', 'Computing', 'Reasoning', 'Evaluating', 'Finalizing'
];

interface ProcessingIndicatorProps {
  isVisible: boolean;
}

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ isVisible }) => {
  const [currentWord, setCurrentWord] = useState(PROCESSING_WORDS[0]);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setWordIndex(prev => {
        const nextIndex = (prev + 1) % PROCESSING_WORDS.length;
        setCurrentWord(PROCESSING_WORDS[nextIndex]);
        return nextIndex;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="flex gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      
      <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-gray-700 dark:text-gray-300 font-medium">{currentWord}...</span>
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};