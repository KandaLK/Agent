import React from 'react';
import { X, User, Mail, Calendar, Settings, Shield, Globe, Languages } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 p-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/30">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.username}</h2>
              <p className="text-blue-100 text-sm">User Profile</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Personal Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email Address</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Preferences
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Languages className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Language</p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user.preferences.language === 'en' ? '🇺🇸 English' : '🇱🇰 සිංහල'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Theme</p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {user.preferences.theme}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Web Search</p>
                </div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user.preferences.webSearchEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                </div>
                <p className="font-medium text-green-600 dark:text-green-400">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
};