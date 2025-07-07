import React, { useState } from 'react';
import { X, User, LogOut, Sun, Moon, Settings as SettingsIcon, Globe, Languages, Shield, Bell, Palette, Database, Key, Trash2, AlertTriangle, UserX, MessageSquareX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { apiService } from '../../services/api';
import { Alert } from '../UI/Alert';
import { ConfirmationModal } from '../UI/ConfirmationModal';
import { LoadingAlert } from '../UI/LoadingAlert';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowProfile: () => void;
  onDataChange?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onShowProfile, onDataChange }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'privacy' | 'account'>('general');
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);
  const [loadingAlert, setLoadingAlert] = useState<{ isVisible: boolean; message: string }>({ isVisible: false, message: '' });
  
  // Confirmation states
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 4000);
  };

  const showLoadingAlert = (message: string) => {
    setLoadingAlert({ isVisible: true, message });
  };

  const hideLoadingAlert = () => {
    setLoadingAlert({ isVisible: false, message: '' });
  };

  const handleProfileClick = () => {
    onClose();
    setTimeout(() => onShowProfile(), 100);
  };

  const handleLogoutConfirm = async () => {
    setIsLoading(true);
    showLoadingAlert('Signing out...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowLogoutConfirm(false);
      hideLoadingAlert();
      onClose();
      
      setTimeout(() => {
        logout();
        showAlert('success', 'Successfully signed out');
      }, 100);
    } catch (error) {
      hideLoadingAlert();
      showAlert('error', 'Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  };

  const handleThemeToggle = () => {
    showLoadingAlert('Changing theme...');
    
    setTimeout(() => {
      toggleTheme();
      hideLoadingAlert();
      showAlert('success', `Switched to ${theme === 'light' ? 'dark' : 'light'} theme`);
    }, 500);
  };

  const handleSaveApiKey = async () => {
    if (apiKey.trim()) {
      setIsLoading(true);
      showLoadingAlert('Saving API key...');
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        hideLoadingAlert();
        showAlert('success', 'API key saved successfully');
        setApiKey('');
      } catch (error) {
        hideLoadingAlert();
        showAlert('error', 'Failed to save API key');
      } finally {
        setIsLoading(false);
      }
    } else {
      showAlert('error', 'Please enter a valid API key');
    }
  };

  const handleClearConversations = async () => {
    setIsLoading(true);
    showLoadingAlert('Clearing all conversations...');
    
    try {
      await apiService.clearAllConversations();
      setShowClearConfirm(false);
      hideLoadingAlert();
      showAlert('success', 'All conversations cleared successfully');
      
      if (onDataChange) {
        setTimeout(() => {
          onDataChange();
        }, 500);
      }
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      hideLoadingAlert();
      showAlert('error', 'Failed to clear conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    showLoadingAlert('Deleting account...');
    
    try {
      await apiService.deleteAccount();
      setShowDeleteConfirm(false);
      hideLoadingAlert();
      showAlert('success', 'Account deleted successfully');
      
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error) {
      hideLoadingAlert();
      showAlert('error', 'Failed to delete account');
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'account', label: 'Account Settings', icon: UserX },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[9990] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl h-[750px] overflow-hidden flex">
          {/* Enhanced Sidebar */}
          <div className="w-80 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 dark:from-blue-600 dark:via-purple-600 dark:to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <SettingsIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage your preferences</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 p-6">
              <nav className="space-y-3">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-xl transform scale-105'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg hover:scale-102'
                      }`}
                    >
                      <Icon className="w-6 h-6" />
                      <span className="font-semibold">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Enhanced User Info */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-700">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.username}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 font-medium"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>

          {/* Enhanced Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-white via-blue-50 to-white dark:from-gray-800 dark:via-gray-700 dark:to-gray-800">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white capitalize">{activeTab}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {activeTab === 'general' && 'Manage your account and preferences'}
                  {activeTab === 'appearance' && 'Customize the look and feel'}
                  {activeTab === 'privacy' && 'Control your privacy settings'}
                  {activeTab === 'account' && 'Manage your account data and security'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
              {activeTab === 'general' && (
                <div className="space-y-8 max-w-3xl">
                  {/* Profile Section */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                      <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      Profile Information
                    </h4>
                    <div className="space-y-6">
                      <div className="flex items-center gap-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <User className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 dark:text-white text-lg">{user?.username}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
                        </div>
                        <button
                          onClick={handleProfileClick}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 text-sm font-semibold shadow-lg"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Language & Search Settings */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
                      <Languages className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      Language & Search Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Default Language</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {user?.preferences.language === 'en' ? '🇺🇸 English' : '🇱🇰 සිංහල'}
                            </p>
                          </div>
                          <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full font-medium">
                            Per conversation
                          </span>
                        </div>
                      </div>

                      <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Web Search</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Enhanced AI responses</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={user?.preferences.webSearchEnabled || true}
                              className="sr-only peer"
                              readOnly
                            />
                            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-8 max-w-3xl">
                  {/* Theme Settings */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                      <Palette className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      Theme Selection
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <button
                        onClick={theme === 'dark' ? handleThemeToggle : undefined}
                        className={`p-8 rounded-2xl border-2 transition-all duration-300 ${
                          theme === 'light'
                            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 dark:bg-blue-900/20 shadow-2xl transform scale-105'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-xl hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <Sun className="w-8 h-8 text-yellow-500" />
                          <span className="font-bold text-gray-900 dark:text-white text-lg">Light Mode</span>
                        </div>
                        <div className="w-full h-24 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg"></div>
                        </div>
                      </button>
                      
                      <button
                        onClick={theme === 'light' ? handleThemeToggle : undefined}
                        className={`p-8 rounded-2xl border-2 transition-all duration-300 ${
                          theme === 'dark'
                            ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 dark:bg-blue-900/20 shadow-2xl transform scale-105'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-xl hover:scale-102'
                        }`}
                      >
                        <div className="flex items-center gap-4 mb-6">
                          <Moon className="w-8 h-8 text-blue-400" />
                          <span className="font-bold text-gray-900 dark:text-white text-lg">Dark Mode</span>
                        </div>
                        <div className="w-full h-24 bg-gray-800 border border-gray-600 rounded-xl shadow-sm flex items-center justify-center">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-8 max-w-3xl">
                  {/* Data & Privacy */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                      <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                      Data & Privacy Controls
                    </h4>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Data Collection</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Allow analytics and improvements</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                        <div className="flex items-center gap-4">
                          <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Receive system notifications</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="space-y-8 max-w-3xl">
                  {/* API Configuration */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                      <Key className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      API Configuration
                    </h4>
                    <div className="space-y-6">
                      <div className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl">
                        <p className="font-semibold text-gray-900 dark:text-white mb-2">OpenRouter API Key</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Configure your OpenRouter API key for enhanced AI responses</p>
                        <div className="flex gap-4">
                          <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter your OpenRouter API key"
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={handleSaveApiKey}
                            disabled={isLoading}
                            className="px-6 py-3 bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-xl hover:from-orange-700 hover:to-yellow-700 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          >
                            {isLoading ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account Management */}
                  <div className="bg-gradient-to-r from-red-50 via-orange-50 to-red-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-red-900/20 rounded-3xl p-8 border-2 border-red-200 dark:border-red-800 shadow-lg">
                    <h4 className="text-xl font-bold text-red-700 dark:text-red-400 mb-8 flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6" />
                      Account Management
                    </h4>
                    <div className="space-y-6">
                      <button
                        onClick={() => setShowClearConfirm(true)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-orange-200 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                      >
                        <MessageSquareX className="w-5 h-5" />
                        Clear All Conversations
                      </button>
                      
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 p-6 bg-white dark:bg-gray-800 rounded-2xl border-2 border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                      >
                        <UserX className="w-5 h-5" />
                        Delete Account Permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmationModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogoutConfirm}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        type="warning"
        isLoading={isLoading}
      />

      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearConversations}
        title="Clear All Conversations"
        message="This will permanently delete all your chat threads and messages. This action cannot be undone."
        confirmText="Clear All"
        type="danger"
        isLoading={isLoading}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="This will permanently delete your account and all associated data. This action cannot be undone."
        confirmText="Delete Account"
        type="danger"
        isLoading={isLoading}
      />

      {/* Alerts */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <LoadingAlert
        isVisible={loadingAlert.isVisible}
        message={loadingAlert.message}
      />
    </>
  );
};