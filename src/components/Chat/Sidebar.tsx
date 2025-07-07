import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Edit3, Trash2, Check, X, Menu, LogOut, User, Settings, Globe, Sun, Moon, FileText } from 'lucide-react';
import { ChatThread } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { apiService } from '../../services/api';
import { ProfileModal } from '../Profile/ProfileModal';
import { SettingsModal } from '../Settings/SettingsModal';
import { Alert } from '../UI/Alert';

interface SidebarProps {
  threads: ChatThread[];
  activeThread: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  onThreadUpdate: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  threads,
  activeThread,
  onThreadSelect,
  onNewThread,
  onThreadUpdate,
  isOpen,
  onToggle,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [editingThread, setEditingThread] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleEditStart = (thread: ChatThread) => {
    setEditingThread(thread.thread_id);
    setEditTitle(thread.title);
  };

  const handleEditSave = async () => {
    if (editingThread && editTitle.trim()) {
      try {
        await apiService.updateThread(editingThread, editTitle.trim());
        onThreadUpdate();
        setEditingThread(null);
        setEditTitle('');
        showAlert('success', 'Thread title updated successfully');
      } catch (error) {
        console.error('Failed to update thread:', error);
        showAlert('error', 'Failed to update thread title');
      }
    }
  };

  const handleEditCancel = () => {
    setEditingThread(null);
    setEditTitle('');
  };

  const handleDelete = async (threadId: string) => {
    if (window.confirm('Are you sure you want to delete this chat?')) {
      try {
        await apiService.deleteThread(threadId);
        onThreadUpdate();
        showAlert('success', 'Chat deleted successfully');
      } catch (error) {
        console.error('Failed to delete thread:', error);
        showAlert('error', 'Failed to delete chat');
      }
    }
  };

  const handleWebRedirect = () => {
    window.open('https://www.google.com', '_blank');
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
    showAlert('success', 'Successfully signed out');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 2) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={onToggle}
        className="md:hidden fixed top-4 left-4 z-50 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 w-80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col
        transform transition-transform duration-300 ease-in-out shadow-xl md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">ChatBot</h1>
            <button
              onClick={onToggle}
              className="md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onNewThread}
              className="flex-1 bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-800 transition-all font-medium"
            >
              <FileText className="w-4 h-4" />
              New Chat
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all font-medium"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}>
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
          
          {threads.map((thread) => (
            <div
              key={thread.thread_id}
              className={`
                group relative p-3 rounded-lg cursor-pointer transition-all
                ${activeThread === thread.thread_id
                  ? 'bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50'
                  : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/50 border border-transparent'
                }
              `}
            >
              {editingThread === thread.thread_id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditSave();
                      if (e.key === 'Escape') handleEditCancel();
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleEditSave}
                    className="text-green-600 hover:text-green-700 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="text-red-600 hover:text-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => onThreadSelect(thread.thread_id)}
                    className="flex items-start gap-3"
                  >
                    <MessageSquare className="w-5 h-5 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate">{thread.title}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {formatDateTime(thread.updated_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditStart(thread);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(thread.thread_id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          {threads.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Start a new chat to begin!</p>
            </div>
          )}
        </div>

        {/* Bottom Action Icons */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            {/* Web Icon */}
            <button
              onClick={handleWebRedirect}
              className="p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
              title="Open Web Browser"
            >
              <Globe className="w-5 h-5" />
            </button>

            {/* Profile Icon */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="p-3 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
              title="Profile"
            >
              <User className="w-5 h-5" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-3 text-gray-400 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Sign Out */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-3 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        onShowProfile={() => setShowProfileModal(true)}
        onDataChange={onThreadUpdate}
      />

      {/* Profile Modal */}
      <ProfileModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <LogOut className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Sign Out</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Are you sure you want to sign out of your account?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={onToggle}
        />
      )}

      {/* Alert Component */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </>
  );
};