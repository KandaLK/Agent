import React, { useEffect, useRef, useState } from 'react';
import { Search, MoreHorizontal } from 'lucide-react';
import { Message, ChatThread, TypingIndicator } from '../../types';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ProcessingIndicator } from './ProcessingIndicator';
import { apiService } from '../../services/api';

interface ChatAreaProps {
  activeThread: ChatThread | null;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  typingIndicator: TypingIndicator | null;
  onEditMessage: (messageId: string, newContent: string) => void;
  onMessagesUpdate: () => void;
  isProcessing: boolean;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeThread,
  messages,
  onSendMessage,
  onTypingStart,
  onTypingStop,
  typingIndicator,
  onEditMessage,
  onMessagesUpdate,
  isProcessing,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingIndicator, isProcessing]);

  // Handle message reactions
  const handleReaction = async (messageId: string, reaction: 'like' | 'dislike') => {
    try {
      const message = messages.find(m => m.message_id === messageId);
      if (!message) return;

      const currentReaction = message.reactions.userReaction;
      let newReaction: 'like' | 'dislike' | null = reaction;
      
      // If clicking the same reaction, remove it
      if (currentReaction === reaction) {
        newReaction = null;
      }

      await apiService.updateMessageReactions(messageId, newReaction);
      onMessagesUpdate();
    } catch (error) {
      console.error('Failed to update reaction:', error);
    }
  };

  // Get last user message for edit functionality
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  const hasMessages = messages.length > 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!activeThread) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 dark:bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white">💬</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Welcome to ChatBot</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            Select a conversation from the sidebar or start a new chat to begin your AI-powered conversation experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{activeThread.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Modified {formatDate(activeThread.updated_at)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-lg transition-colors ${
              showSearch 
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
          <input
            type="text"
            placeholder="Search messages..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      )}

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto px-6 py-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}
      >
        <style jsx>{`
          .flex-1::-webkit-scrollbar {
            width: 6px;
          }
          .flex-1::-webkit-scrollbar-track {
            background: transparent;
          }
          .flex-1::-webkit-scrollbar-thumb {
            background: rgba(156, 163, 175, 0.3);
            border-radius: 3px;
          }
          .flex-1::-webkit-scrollbar-thumb:hover {
            background: rgba(156, 163, 175, 0.5);
          }
        `}</style>
        
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 dark:bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-xl text-white">🤖</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">Start a conversation!</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">Ask me anything to get started.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble 
                key={message.message_id} 
                message={message}
                isLastUserMessage={lastUserMessage?.message_id === message.message_id}
                onEdit={onEditMessage}
                onReaction={handleReaction}
              />
            ))}
            
            <ProcessingIndicator isVisible={isProcessing} />
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        onSendMessage={onSendMessage}
        onTypingStart={onTypingStart}
        onTypingStop={onTypingStop}
        disabled={isProcessing}
        hasMessages={hasMessages}
        isProcessing={isProcessing}
        activeThreadId={activeThread.thread_id}
      />
    </div>
  );
};