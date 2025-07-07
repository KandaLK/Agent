import React, { useState, useEffect, useCallback } from 'react';
import { ChatThread, Message, TypingIndicator } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { Sidebar } from './Sidebar';
import { ChatArea } from './ChatArea';
import { WelcomePage } from './WelcomePage';

export const ChatApp: React.FC = () => {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingIndicator, setTypingIndicator] = useState<TypingIndicator | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isProcessing) {
        loadThreads();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isProcessing]);

  // Load threads
  const loadThreads = useCallback(async () => {
    try {
      const fetchedThreads = await apiService.getThreads();
      setThreads(fetchedThreads);
      
      // Determine if we should show welcome page
      if (fetchedThreads.length === 0) {
        setShowWelcome(true);
        setActiveThread(null);
        setMessages([]);
      } else {
        // If we have an active thread, check if it still exists
        if (activeThread) {
          const threadExists = fetchedThreads.some(t => t.thread_id === activeThread.thread_id);
          if (!threadExists) {
            // Active thread was deleted, show welcome page
            setActiveThread(null);
            setMessages([]);
            setShowWelcome(true);
          }
        } else if (!showWelcome) {
          // If not showing welcome and no active thread, select first thread
          setActiveThread(fetchedThreads[0]);
          setShowWelcome(false);
        }
      }
    } catch (error) {
      console.error('Failed to load threads:', error);
    } finally {
      setLoading(false);
    }
  }, [activeThread, showWelcome]);

  // Load messages for active thread
  const loadMessages = useCallback(async (threadId: string) => {
    try {
      const fetchedMessages = await apiService.getMessages(threadId);
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  // Initialize data
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Load messages when active thread changes
  useEffect(() => {
    if (activeThread) {
      loadMessages(activeThread.thread_id);
      socketService.joinThread(activeThread.thread_id);
      setShowWelcome(false);
      
      return () => {
        socketService.leaveThread(activeThread.thread_id);
      };
    }
  }, [activeThread, loadMessages]);

  // Setup socket event listeners
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    const handleMessageUpdated = (updatedMessage: Message) => {
      setMessages(prev => prev.map(msg => 
        msg.message_id === updatedMessage.message_id ? updatedMessage : msg
      ));
    };

    const handleMessageDeleted = (messageId: string) => {
      setMessages(prev => prev.filter(msg => msg.message_id !== messageId));
    };

    const handleProcessingStart = () => {
      setIsProcessing(true);
    };

    const handleProcessingComplete = () => {
      setIsProcessing(false);
    };

    const handleTypingStart = (data: TypingIndicator) => {
      setTypingIndicator(data);
    };

    const handleTypingStop = () => {
      setTypingIndicator(null);
    };

    const handleError = (error: { message: string }) => {
      console.error('Socket error:', error.message);
      setIsProcessing(false);
    };

    socketService.on('message', handleNewMessage);
    socketService.on('message_updated', handleMessageUpdated);
    socketService.on('message_deleted', handleMessageDeleted);
    socketService.on('processing_start', handleProcessingStart);
    socketService.on('processing_complete', handleProcessingComplete);
    socketService.on('typing_start', handleTypingStart);
    socketService.on('typing_stop', handleTypingStop);
    socketService.on('error', handleError);

    return () => {
      socketService.off('message', handleNewMessage);
      socketService.off('message_updated', handleMessageUpdated);
      socketService.off('message_deleted', handleMessageDeleted);
      socketService.off('processing_start', handleProcessingStart);
      socketService.off('processing_complete', handleProcessingComplete);
      socketService.off('typing_start', handleTypingStart);
      socketService.off('typing_stop', handleTypingStop);
      socketService.off('error', handleError);
    };
  }, []);

  const handleThreadSelect = (threadId: string) => {
    const thread = threads.find(t => t.thread_id === threadId);
    if (thread) {
      setActiveThread(thread);
      setShowWelcome(false);
      setSidebarOpen(false); // Close sidebar on mobile when thread is selected
    }
  };

  const handleNewThread = async () => {
    try {
      const newThread = await apiService.createThread();
      setThreads(prev => [newThread, ...prev]);
      setActiveThread(newThread);
      setShowWelcome(false);
      setMessages([]);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleStartChatFromWelcome = async (message: string) => {
    try {
      // Create new thread
      const newThread = await apiService.createThread();
      setThreads(prev => [newThread, ...prev]);
      setActiveThread(newThread);
      setShowWelcome(false);
      setMessages([]);
      
      // Send the message after a brief delay to ensure thread is set up
      setTimeout(() => {
        if (user) {
          socketService.sendMessage(newThread.thread_id, message, user.uuid);
        }
      }, 100);
    } catch (error) {
      console.error('Failed to start chat:', error);
    }
  };

  const handleSendMessage = (content: string) => {
    if (activeThread && user) {
      socketService.sendMessage(activeThread.thread_id, content, user.uuid);
    }
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    if (activeThread && user) {
      socketService.sendMessage(activeThread.thread_id, newContent, user.uuid, true, messageId);
    }
  };

  const handleTypingStart = () => {
    if (activeThread) {
      socketService.startTyping(activeThread.thread_id);
    }
  };

  const handleTypingStop = () => {
    if (activeThread) {
      socketService.stopTyping(activeThread.thread_id);
    }
  };

  const handleThreadUpdate = async () => {
    await loadThreads();
  };

  const handleDataRefresh = () => {
    // Force refresh all data
    setActiveThread(null);
    setMessages([]);
    setShowWelcome(true);
    loadThreads();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 dark:bg-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-2xl text-white">🤖</span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900">
      <Sidebar
        threads={threads}
        activeThread={activeThread?.thread_id || null}
        onThreadSelect={handleThreadSelect}
        onNewThread={handleNewThread}
        onThreadUpdate={handleThreadUpdate}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      {showWelcome ? (
        <WelcomePage onStartChat={handleStartChatFromWelcome} />
      ) : (
        <ChatArea
          activeThread={activeThread}
          messages={messages}
          onSendMessage={handleSendMessage}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          typingIndicator={typingIndicator}
          onEditMessage={handleEditMessage}
          onMessagesUpdate={() => loadMessages(activeThread?.thread_id || '')}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
};