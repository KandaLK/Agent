import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Globe, Languages } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { useAlert } from '../../hooks/useAlert';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
  hasMessages: boolean;
  isProcessing: boolean;
  activeThreadId?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onTypingStart,
  onTypingStop,
  disabled = false,
  hasMessages,
  isProcessing,
  activeThreadId,
}) => {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(user?.preferences.webSearchEnabled || false);
  const [language, setLanguage] = useState(user?.preferences.language || 'en');
  const [threadLanguageLocked, setThreadLanguageLocked] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Check if language can be changed for this thread
  useEffect(() => {
    const checkLanguageLock = async () => {
      if (activeThreadId && user) {
        try {
          // Check if user has sent any messages in this thread
          setThreadLanguageLocked(hasMessages);
        } catch (error) {
          console.error('Failed to check language lock:', error);
        }
      }
    };

    checkLanguageLock();
  }, [activeThreadId, hasMessages, user]);

  // Language can only be changed if:
  // 1. User hasn't sent any messages in this thread yet
  // 2. Thread language is not locked
  const canChangeLanguage = !hasMessages && !threadLanguageLocked;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Handle typing indicators
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      onTypingStart();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      onTypingStop();
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (message.trim() && !disabled && !isProcessing) {
      onSendMessage(message.trim());
      setMessage('');
      setIsTyping(false);
      onTypingStop();
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Lock language after first message
      if (canChangeLanguage && user && activeThreadId) {
        setThreadLanguageLocked(true);
        try {
          const updatedPreferences = {
            ...user.preferences,
            languageChanged: true
          };
          await apiService.updateUserPreferences(updatedPreferences);
        } catch (error) {
          console.error('Failed to update preferences:', error);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleLanguageChange = async (newLanguage: 'en' | 'si') => {
    if (!canChangeLanguage) return;
    
    setLanguage(newLanguage);
    
    if (user) {
      try {
        const updatedPreferences = {
          ...user.preferences,
          language: newLanguage
        };
        await apiService.updateUserPreferences(updatedPreferences);
        showAlert('success', `Language changed to ${newLanguage === 'en' ? 'English' : 'සිංහල'}`);
      } catch (error) {
        console.error('Failed to update language preference:', error);
        showAlert('error', 'Failed to update language preference');
      }
    }
  };

  const handleWebSearchToggle = async () => {
    const newValue = !webSearchEnabled;
    setWebSearchEnabled(newValue);
    
    if (user) {
      try {
        const updatedPreferences = {
          ...user.preferences,
          webSearchEnabled: newValue
        };
        await apiService.updateUserPreferences(updatedPreferences);
        showAlert('success', `Web search ${newValue ? 'enabled' : 'disabled'}`);
      } catch (error) {
        console.error('Failed to update web search preference:', error);
        showAlert('error', 'Failed to update web search preference');
      }
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Toggle Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={handleWebSearchToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              webSearchEnabled
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Globe className="w-3 h-3" />
            Web Search
          </button>
          
          <div className="relative">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'si')}
              disabled={!canChangeLanguage}
              className={`appearance-none px-3 py-1.5 pr-8 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                canChangeLanguage
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
              }`}
              title={canChangeLanguage ? 'Select language' : 'Language cannot be changed after sending messages'}
            >
              <option value="en">🇺🇸 English</option>
              <option value="si">🇱🇰 සිංහල</option>
            </select>
            <Languages className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {!canChangeLanguage && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Language locked after first message
          </span>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {/* Attachment Button */}
          <button
            type="button"
            className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={disabled || isProcessing}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Message Input Container */}
          <div className="flex-1 relative">
            <div className="relative border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Enter to send, Shift + Enter to wrap, / to search prompts, : to use commands"
                className="w-full px-4 py-3 pr-12 resize-none focus:outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={1}
                disabled={disabled || isProcessing}
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              
              {/* Voice Input Button - Inside textarea */}
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded"
                disabled={disabled || isProcessing}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Send Button */}
          <div className="flex-shrink-0">
            <button
              type="submit"
              disabled={!message.trim() || disabled || isProcessing}
              className={`
                p-3 rounded-full transition-all min-w-[48px] min-h-[48px] flex items-center justify-center
                ${message.trim() && !disabled && !isProcessing
                  ? 'bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-800 transform hover:scale-105 shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }
              `}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};