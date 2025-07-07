import React, { useState, useEffect, useRef } from 'react';
import { Bot, User, ThumbsUp, ThumbsDown, Edit3, Check, X, Copy } from 'lucide-react';
import { Message } from '../../types';
import { useAlert } from '../../hooks/useAlert';

interface MessageBubbleProps {
  message: Message;
  isLastUserMessage?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onReaction?: (messageId: string, reaction: 'like' | 'dislike') => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isLastUserMessage = false,
  onEdit,
  onReaction 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copySuccess, setCopySuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const displayTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { showAlert } = useAlert();
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  // Auto-resize textarea function
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(60, textarea.scrollHeight) + 'px';
  };

  // Auto-resize on content change
  useEffect(() => {
    if (displayTextareaRef.current) {
      autoResize(displayTextareaRef.current);
    }
  }, [message.content]);

  useEffect(() => {
    if (textareaRef.current && isEditing) {
      autoResize(textareaRef.current);
    }
  }, [editContent, isEditing]);

  const handleEditStart = () => {
    setIsEditing(true);
    setEditContent(message.content);
  };

  const handleEditSave = () => {
    if (editContent.trim() && onEdit) {
      onEdit(message.message_id, editContent.trim());
      showAlert('success', 'Message updated successfully');
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopySuccess(true);
      showAlert('success', 'Message copied to clipboard');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showAlert('error', 'Failed to copy message');
    }
  };

  const handleReaction = (reaction: 'like' | 'dislike') => {
    if (onReaction) {
      onReaction(message.message_id, reaction);
      const currentReaction = message.reactions.userReaction;
      
      if (currentReaction === reaction) {
        showAlert('info', 'Reaction removed');
      } else {
        showAlert('success', `Message ${reaction}d`);
      }
    }
  };

  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'flex-row-reverse' : ''} max-w-5xl mx-auto`}>
      {/* Avatar */}
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
        ${isUser 
          ? 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700' 
          : 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700'
        }
      `}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} flex-1 group`}>
        {isEditing ? (
          <div className="w-full max-w-4xl">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => {
                setEditContent(e.target.value);
                autoResize(e.target);
              }}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px]"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEditSave}
                className="p-1 text-green-600 hover:text-green-700 transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleEditCancel}
                className="p-1 text-red-600 hover:text-red-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              className={`
                w-full max-w-4xl rounded-2xl shadow-sm relative
                ${isUser
                  ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-br-md'
                  : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 rounded-bl-md'
                }
              `}
            >
              <textarea
                ref={displayTextareaRef}
                value={message.content}
                readOnly
                className={`
                  w-full px-4 py-3 resize-none border-none outline-none bg-transparent text-sm leading-relaxed
                  ${isUser ? 'text-white placeholder-blue-200' : 'text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400'}
                `}
                style={{ 
                  minHeight: '60px',
                  overflow: 'hidden'
                }}
                onInput={(e) => autoResize(e.target as HTMLTextAreaElement)}
              />
            </div>

            {/* Message Actions */}
            <div className={`flex items-center gap-3 mt-2 text-xs ${isUser ? 'flex-row-reverse' : ''}`}>
              <span className="text-gray-500 dark:text-gray-400">{timestamp}</span>
              
              <div className="flex items-center gap-2">
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1 transition-colors p-1 rounded ${
                    copySuccess 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                  title={copySuccess ? 'Copied!' : 'Copy to clipboard'}
                >
                  <Copy className="w-3 h-3" />
                </button>

                {/* Edit Button - Only for last user message */}
                {isLastUserMessage && isUser && (
                  <button
                    onClick={handleEditStart}
                    className="flex items-center gap-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                    title="Edit message"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}

                {/* Like/Dislike Buttons - Only for assistant messages */}
                {!isUser && (
                  <>
                    <button
                      onClick={() => handleReaction('like')}
                      className={`flex items-center gap-1 transition-colors p-1 rounded ${
                        message.reactions.userReaction === 'like'
                          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                          : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      title="Like"
                    >
                      <ThumbsUp className={`w-3 h-3 ${
                        message.reactions.userReaction === 'like' ? 'fill-current' : ''
                      }`} />
                    </button>
                    <button
                      onClick={() => handleReaction('dislike')}
                      className={`flex items-center gap-1 transition-colors p-1 rounded ${
                        message.reactions.userReaction === 'dislike'
                          ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                          : 'text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      title="Dislike"
                    >
                      <ThumbsDown className={`w-3 h-3 ${
                        message.reactions.userReaction === 'dislike' ? 'fill-current' : ''
                      }`} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};