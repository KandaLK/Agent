// Router Service for handling language detection, translation, and routing logic

import { translationService } from './translationService.js';
import { summaryService } from './summaryService.js';
import { dbOperations } from '../database.js';

export class RouterService {
  constructor() {
    console.log('🚀 Router Service initialized');
  }

  async processMessage(messageData) {
    const { content, threadId, userId, language, webSearchEnabled } = messageData;
    
    console.log(`🔀 ROUTER PROCESSING:`);
    console.log(`   Thread ID: ${threadId}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Language: ${language}`);
    console.log(`   Web Search: ${webSearchEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   Original Message: "${content}"`);

    try {
      let processedContent = content;
      let translationData = null;

      // Step 1: Handle Sinhala language processing
      if (language === 'si') {
        console.log(`🌐 Processing Sinhala message...`);
        
        // Translate to English for processing
        const translation = await translationService.translateText(content, 'si', 'en');
        
        if (translation.success) {
          processedContent = translation.translatedText;
          translationData = translation;
          
          console.log(`   Translated for processing: "${processedContent}"`);
        } else {
          console.log(`   Translation failed, using original text`);
        }
      }

      // Step 2: Get chat history for context
      const chatHistory = await this.getChatHistoryForSummary(threadId, language);
      
      // Step 3: Generate or update thread summary
      await this.updateThreadSummary(threadId, chatHistory);

      // Step 4: Prepare routing decision
      const routingDecision = {
        originalContent: content,
        processedContent: processedContent,
        language: language,
        webSearchEnabled: webSearchEnabled,
        translationData: translationData,
        chatHistory: chatHistory,
        shouldTranslate: language === 'si',
        useEnglishForProcessing: language === 'si'
      };

      console.log(`✅ Router processing completed`);
      console.log(`   Final processed content: "${processedContent}"`);
      console.log(`   Translation needed: ${routingDecision.shouldTranslate}`);
      console.log(`   Web search enabled: ${webSearchEnabled}\n`);

      return routingDecision;

    } catch (error) {
      console.log(`❌ Router processing failed: ${error.message}\n`);
      return {
        originalContent: content,
        processedContent: content,
        language: language,
        webSearchEnabled: webSearchEnabled,
        error: error.message
      };
    }
  }

  async getChatHistoryForSummary(threadId, language) {
    console.log(`📚 Getting chat history for summary...`);
    
    try {
      if (language === 'si') {
        // For Sinhala, get translated messages for better summary
        const translatedMessages = await dbOperations.getTranslatedMessages(threadId);
        console.log(`   Found ${translatedMessages.length} translated messages`);
        return translatedMessages;
      } else {
        // For English, get regular messages
        const messages = await dbOperations.getMessagesByThreadId(threadId);
        console.log(`   Found ${messages.length} regular messages`);
        return messages;
      }
    } catch (error) {
      console.log(`   Error getting chat history: ${error.message}`);
      return [];
    }
  }

  async updateThreadSummary(threadId, messages) {
    console.log(`📝 Updating thread summary...`);
    
    try {
      if (messages.length > 0) {
        const summaryResult = await summaryService.generateThreadSummary(messages, threadId, 'en');
        
        if (summaryResult.success) {
          await dbOperations.saveThreadSummary(threadId, summaryResult.summary, messages.length);
          console.log(`   Summary saved: "${summaryResult.summary.substring(0, 50)}..."`);
        }
      }
    } catch (error) {
      console.log(`   Error updating summary: ${error.message}`);
    }
  }

  async saveTranslationIfNeeded(messageId, threadId, originalContent, translationData) {
    if (translationData && translationData.success) {
      console.log(`💾 Saving translation data...`);
      
      try {
        await dbOperations.saveTranslatedMessage({
          original_message_id: messageId,
          thread_id: threadId,
          original_content: originalContent,
          translated_content: translationData.translatedText,
          source_language: translationData.sourceLang,
          target_language: translationData.targetLang
        });
        
        console.log(`   Translation saved successfully`);
      } catch (error) {
        console.log(`   Error saving translation: ${error.message}`);
      }
    }
  }

  async detectLanguageChange(threadId, newLanguage, userId) {
    console.log(`🔄 Detecting language change...`);
    console.log(`   Thread ID: ${threadId}`);
    console.log(`   New Language: ${newLanguage}`);
    
    try {
      // Update thread language settings
      await dbOperations.updateThreadSettings(threadId, newLanguage, true);
      console.log(`   Thread language updated to: ${newLanguage}`);
      
      return {
        success: true,
        newLanguage: newLanguage,
        threadId: threadId
      };
    } catch (error) {
      console.log(`   Error updating language: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getThreadSettings(threadId) {
    try {
      const thread = await dbOperations.getThreadsByUserId(''); // This needs to be updated
      const threadData = thread.find(t => t.thread_id === threadId);
      
      return {
        language: threadData?.language || 'en',
        webSearchEnabled: threadData?.web_search_enabled || true
      };
    } catch (error) {
      console.log(`Error getting thread settings: ${error.message}`);
      return {
        language: 'en',
        webSearchEnabled: true
      };
    }
  }
}

export const routerService = new RouterService();