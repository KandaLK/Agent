import React, { useState } from 'react';
import { Sparkles, ArrowRight, Send, Mic, Globe, Languages } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface WelcomePageProps {
  onStartChat: (message: string) => void;
}

const SUGGESTED_PROMPTS = [
  {
    title: "Overcome procrastination",
    subtitle: "give me tips",
    message: "Can you give me some effective tips to overcome procrastination and stay productive?",
    gradient: "from-blue-500 to-blue-600",
    icon: "💡"
  },
  {
    title: "Show me a code snippet",
    subtitle: "of a website's sticky header",
    message: "Can you show me a code snippet for creating a sticky header on a website?",
    gradient: "from-purple-500 to-purple-600",
    icon: "💻"
  },
  {
    title: "Grammar check",
    subtitle: "rewrite it for better readability",
    message: "Can you help me check grammar and rewrite text for better readability?",
    gradient: "from-green-500 to-green-600",
    icon: "✍️"
  },
  {
    title: "Tell me a fun fact",
    subtitle: "about the Roman Empire",
    message: "Tell me an interesting and fun fact about the Roman Empire.",
    gradient: "from-orange-500 to-orange-600",
    icon: "🏛️"
  },
  {
    title: "Explain quantum computing",
    subtitle: "in simple terms",
    message: "Can you explain quantum computing in simple terms that anyone can understand?",
    gradient: "from-indigo-500 to-indigo-600",
    icon: "⚛️"
  },
  {
    title: "Recipe suggestions",
    subtitle: "for a healthy dinner",
    message: "Can you suggest some healthy dinner recipes that are easy to make?",
    gradient: "from-red-500 to-red-600",
    icon: "🍽️"
  }
];

export const WelcomePage: React.FC<WelcomePageProps> = ({ onStartChat }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [webSearchEnabled, setWebSearchEnabled] = useState(user?.preferences.webSearchEnabled || true);
  const [language, setLanguage] = useState(user?.preferences.language || 'en');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onStartChat(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 dark:from-blue-600 dark:via-purple-600 dark:to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full animate-pulse"></div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-3">
            How can I help you today?
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Choose a suggestion below or start typing your own message
          </p>
        </div>

        {/* Compact Suggested Prompts */}
        <div className="w-full mb-8">
          <div className="flex items-center gap-2 mb-4 justify-center">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Suggested Prompts</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {SUGGESTED_PROMPTS.map((prompt, index) => (
              <div
                key={index}
                onClick={() => onStartChat(prompt.message)}
                className="group cursor-pointer"
              >
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 h-full shadow-sm hover:shadow-md transition-all duration-200 group-hover:scale-102 group-hover:border-blue-300 dark:group-hover:border-blue-600">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 bg-gradient-to-r ${prompt.gradient} rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0`}>
                      {prompt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-1 line-clamp-2">
                        {prompt.title}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed line-clamp-2">
                        {prompt.subtitle}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Integrated Message Input */}
        <div className="w-full max-w-4xl">
          {/* Settings Bar */}
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  webSearchEnabled
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Globe className="w-3 h-3" />
                Web Search
              </button>
              
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'si')}
                  className="appearance-none px-3 py-1.5 pr-8 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="si">🇱🇰 සිංහල</option>
                </select>
                <Languages className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Start your conversation
            </div>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            {/* Message Input Container */}
            <div className="flex-1 relative">
              <div className="relative border-2 border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-200 shadow-sm">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message here... (Enter to send, Shift + Enter for new line)"
                  className="w-full px-4 py-3 pr-12 resize-none focus:outline-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                
                {/* Voice Input Button */}
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Send Button */}
            <div className="flex-shrink-0">
              <button
                type="submit"
                disabled={!message.trim()}
                className={`
                  p-3 rounded-2xl transition-all duration-200 min-w-[48px] min-h-[48px] flex items-center justify-center
                  ${message.trim()
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transform hover:scale-105 shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
          
          <div className="text-center mt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Your conversations are private and secure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};