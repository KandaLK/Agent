// Summary Service using LangGraph library
// For now, we'll use a mock implementation with print statements

export class SummaryService {
  constructor() {
    console.log('📝 Summary Service initialized with LangGraph');
  }

  async generateThreadSummary(messages, threadId, language = 'en') {
    console.log(`📊 THREAD SUMMARY GENERATION:`);
    console.log(`   Thread ID: ${threadId}`);
    console.log(`   Language: ${language}`);
    console.log(`   Message Count: ${messages.length}`);
    console.log(`   Messages Preview:`);
    
    messages.slice(0, 3).forEach((msg, index) => {
      console.log(`     ${index + 1}. [${msg.role}]: ${msg.content.substring(0, 50)}...`);
    });

    try {
      // Mock LangGraph implementation
      const summary = await this.mockLangGraphSummary(messages, language);
      
      console.log(`   Generated Summary: "${summary}"`);
      console.log(`✅ Summary generation completed\n`);

      return {
        success: true,
        summary: summary,
        messageCount: messages.length,
        language: language,
        threadId: threadId,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.log(`❌ Summary generation failed: ${error.message}\n`);
      return {
        success: false,
        error: error.message,
        threadId: threadId
      };
    }
  }

  async mockLangGraphSummary(messages, language) {
    // Simulate LangGraph processing
    console.log(`🔄 Processing with LangGraph...`);
    
    // Extract key topics and themes
    const topics = this.extractTopics(messages);
    const userQuestions = messages.filter(m => m.role === 'user').length;
    const assistantResponses = messages.filter(m => m.role === 'assistant').length;

    // Generate summary based on conversation flow
    let summary = '';
    
    if (language === 'en') {
      summary = `Conversation covering ${topics.join(', ')}. `;
      summary += `${userQuestions} user questions with ${assistantResponses} AI responses. `;
      
      if (topics.includes('greeting')) {
        summary += 'Started with introductions. ';
      }
      if (topics.includes('technical')) {
        summary += 'Discussed technical topics. ';
      }
      if (topics.includes('help')) {
        summary += 'User requested assistance. ';
      }
      
      summary += `Main focus: ${topics[0] || 'general conversation'}.`;
    } else {
      // Sinhala summary (mock)
      summary = `සංවාදය ${topics.join(', ')} ගැන. `;
      summary += `පරිශීලක ප්‍රශ්න ${userQuestions}ක් සහ AI පිළිතුරු ${assistantResponses}ක්.`;
    }

    return summary.trim();
  }

  extractTopics(messages) {
    const topics = [];
    const allText = messages.map(m => m.content.toLowerCase()).join(' ');

    // Simple keyword-based topic extraction
    const topicKeywords = {
      'greeting': ['hello', 'hi', 'hey', 'good morning', 'ආයුබෝවන්'],
      'technical': ['code', 'programming', 'software', 'computer', 'api'],
      'help': ['help', 'assist', 'support', 'how to', 'උදව්'],
      'weather': ['weather', 'temperature', 'rain', 'කාලගුණය'],
      'personal': ['name', 'age', 'family', 'work', 'නම'],
      'question': ['what', 'how', 'why', 'when', 'where', 'මොකක්ද', 'කොහොමද']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => allText.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics.length > 0 ? topics : ['general'];
  }

  async updateSummaryWithNewMessage(existingSummary, newMessage, threadId) {
    console.log(`🔄 UPDATING SUMMARY:`);
    console.log(`   Thread ID: ${threadId}`);
    console.log(`   Existing Summary: "${existingSummary}"`);
    console.log(`   New Message: [${newMessage.role}] "${newMessage.content.substring(0, 50)}..."`);

    try {
      // Mock incremental summary update
      let updatedSummary = existingSummary;
      
      // Add new topics if found
      const newTopics = this.extractTopics([newMessage]);
      newTopics.forEach(topic => {
        if (!existingSummary.toLowerCase().includes(topic)) {
          updatedSummary += ` Added discussion about ${topic}.`;
        }
      });

      console.log(`   Updated Summary: "${updatedSummary}"`);
      console.log(`✅ Summary update completed\n`);

      return {
        success: true,
        summary: updatedSummary,
        threadId: threadId
      };

    } catch (error) {
      console.log(`❌ Summary update failed: ${error.message}\n`);
      return {
        success: false,
        error: error.message,
        summary: existingSummary // Return original summary as fallback
      };
    }
  }
}

export const summaryService = new SummaryService();