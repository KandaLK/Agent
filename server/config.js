// Server configuration
export const config = {
  // OpenRouter API Configuration
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || 'your-openrouter-api-key-here',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: {
      en: {
        model: 'anthropic/claude-3-haiku',
        maxTokens: 1000,
        temperature: 0.7
      },
      si: {
        model: 'meta-llama/llama-3.1-8b-instruct',
        maxTokens: 1000,
        temperature: 0.7
      }
    }
  },
  
  // Database Configuration
  database: {
    path: './server/chatbot.db',
    options: {
      verbose: process.env.NODE_ENV === 'development'
    }
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: '24h'
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  }
};