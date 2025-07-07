import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbOperations } from './database.js';
import { config } from './config.js';
import { routerService } from './services/routerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: config.server.cors
});

const JWT_SECRET = config.jwt.secret;
const PORT = config.server.port;

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Authentication Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await dbOperations.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with web search enabled by default
    const userId = uuidv4();
    const userData = {
      uuid: userId,
      username,
      email,
      password: hashedPassword,
      preferences: { theme: 'light', language: 'en', webSearchEnabled: true, languageChanged: false }
    };

    const user = await dbOperations.createUser(userData);

    // Generate token
    const token = jwt.sign({ userId, username, email }, JWT_SECRET, { expiresIn: config.jwt.expiresIn });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { uuid: userId, username, email, preferences: user.preferences }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await dbOperations.getUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.uuid, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    const user = await dbOperations.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        uuid: user.uuid,
        username: user.username,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Chat Thread Routes
app.get('/api/threads', authenticateToken, async (req, res) => {
  try {
    const threads = await dbOperations.getThreadsByUserId(req.user.userId);
    res.json(threads);
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/threads', authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    const user = await dbOperations.getUserById(req.user.userId);
    const threadId = uuidv4();
    
    const threadData = {
      thread_id: threadId,
      user_id: req.user.userId,
      title: title || 'New Chat',
      language: user?.preferences?.language || 'en',
      web_search_enabled: user?.preferences?.webSearchEnabled || true
    };

    const thread = await dbOperations.createThread(threadData);
    res.status(201).json(thread);
  } catch (error) {
    console.error('Create thread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/threads/:threadId', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { title } = req.body;
    
    const thread = await dbOperations.updateThread(threadId, title);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    res.json(thread);
  } catch (error) {
    console.error('Update thread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/threads/:threadId', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    
    await dbOperations.deleteThread(threadId);
    res.json({ message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Delete thread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Message Routes
app.get('/api/threads/:threadId/messages', authenticateToken, async (req, res) => {
  try {
    const { threadId } = req.params;
    const messages = await dbOperations.getMessagesByThreadId(threadId);
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user preferences
app.put('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const { preferences } = req.body;
    await dbOperations.updateUserPreferences(req.user.userId, preferences);
    res.json({ message: 'Preferences updated successfully' });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Message reactions
app.put('/api/messages/:messageId/reactions', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reactionType } = req.body;
    
    await dbOperations.updateMessageReactions(messageId, req.user.userId, reactionType);
    res.json({ message: 'Reaction updated successfully' });
  } catch (error) {
    console.error('Update reaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clear all conversations
app.delete('/api/user/clear-conversations', authenticateToken, async (req, res) => {
  try {
    await dbOperations.clearAllUserConversations(req.user.userId);
    res.json({ message: 'All conversations cleared successfully' });
  } catch (error) {
    console.error('Clear conversations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete account
app.delete('/api/user/account', authenticateToken, async (req, res) => {
  try {
    await dbOperations.deleteUserAccount(req.user.userId);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Enhanced Python backend function with router integration
async function callPythonBackend(userInput, language = 'en', webSearchEnabled = true) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'python_backend.py');
    
    // Set environment variables for the Python process
    const env = {
      ...process.env,
      OPENROUTER_API_KEY: config.openrouter.apiKey
    };
    
    const pythonProcess = spawn('python3', [pythonScript, userInput, language, webSearchEnabled.toString()], { env });
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim());
          if (result.success) {
            resolve(result.response);
          } else {
            reject(new Error(result.error));
          }
        } catch (parseError) {
          reject(new Error('Failed to parse Python response'));
        }
      } else {
        reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
  });
}

// Enhanced WebSocket handling with router integration
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_thread', (threadId) => {
    socket.join(threadId);
    console.log(`User ${socket.id} joined thread ${threadId}`);
  });

  socket.on('leave_thread', (threadId) => {
    socket.leave(threadId);
    console.log(`User ${socket.id} left thread ${threadId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { threadId, content, userId, isEdit, messageId } = data;
      
      console.log(`\n🚀 NEW MESSAGE RECEIVED:`);
      console.log(`   Thread ID: ${threadId}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Content: "${content}"`);
      console.log(`   Is Edit: ${isEdit}`);
      
      // Get user preferences and thread settings
      const user = await dbOperations.getUserById(userId);
      const userLanguage = user?.preferences?.language || 'en';
      const webSearchEnabled = user?.preferences?.webSearchEnabled || true;
      
      console.log(`   User Language: ${userLanguage}`);
      console.log(`   Web Search: ${webSearchEnabled ? 'Enabled' : 'Disabled'}`);

      // Process message through router
      const routingDecision = await routerService.processMessage({
        content,
        threadId,
        userId,
        language: userLanguage,
        webSearchEnabled
      });

      if (isEdit && messageId) {
        // Update existing message
        const updatedMessage = await dbOperations.updateMessage(messageId, content);
        io.to(threadId).emit('message_updated', updatedMessage);

        // Save translation if needed
        if (routingDecision.translationData) {
          await routerService.saveTranslationIfNeeded(messageId, threadId, content, routingDecision.translationData);
        }

        // Delete the last assistant message and generate a new one
        const lastAssistantMessage = await dbOperations.getLastAssistantMessage(threadId);
        if (lastAssistantMessage) {
          await dbOperations.deleteMessage(lastAssistantMessage.message_id);
          io.to(threadId).emit('message_deleted', lastAssistantMessage.message_id);
        }

        // Start processing indicator
        io.to(threadId).emit('processing_start');

        try {
          // Use processed content for AI response
          const systemResponse = await callPythonBackend(
            routingDecision.processedContent, 
            routingDecision.useEnglishForProcessing ? 'en' : userLanguage,
            webSearchEnabled
          );
          
          const botMessageId = uuidv4();
          const botMessageData = {
            message_id: botMessageId,
            thread_id: threadId,
            role: 'assistant',
            content: systemResponse,
            reactions: { likes: 0, dislikes: 0, userReaction: null }
          };

          const botMessage = await dbOperations.createMessage(botMessageData);
          await dbOperations.updateThreadTimestamp(threadId);
          
          io.to(threadId).emit('processing_complete');
          io.to(threadId).emit('new_message', botMessage);
        } catch (error) {
          console.error('Python backend error:', error);
          io.to(threadId).emit('processing_complete');
          
          // Fallback response
          const botMessageId = uuidv4();
          const botMessageData = {
            message_id: botMessageId,
            thread_id: threadId,
            role: 'assistant',
            content: "I apologize, but I'm having trouble processing your request right now. Please try again.",
            reactions: { likes: 0, dislikes: 0, userReaction: null }
          };

          const botMessage = await dbOperations.createMessage(botMessageData);
          await dbOperations.updateThreadTimestamp(threadId);
          io.to(threadId).emit('new_message', botMessage);
        }

      } else {
        // Create new user message
        const userMessageId = uuidv4();
        const userMessageData = {
          message_id: userMessageId,
          thread_id: threadId,
          role: 'user',
          content,
          reactions: { likes: 0, dislikes: 0, userReaction: null }
        };

        const userMessage = await dbOperations.createMessage(userMessageData);
        await dbOperations.updateThreadTimestamp(threadId);

        // Save translation if needed
        if (routingDecision.translationData) {
          await routerService.saveTranslationIfNeeded(userMessageId, threadId, content, routingDecision.translationData);
        }

        // Emit user message
        io.to(threadId).emit('new_message', userMessage);

        // Start processing indicator
        io.to(threadId).emit('processing_start');

        try {
          // Use processed content for AI response
          const systemResponse = await callPythonBackend(
            routingDecision.processedContent, 
            routingDecision.useEnglishForProcessing ? 'en' : userLanguage,
            webSearchEnabled
          );
          
          const botMessageId = uuidv4();
          const botMessageData = {
            message_id: botMessageId,
            thread_id: threadId,
            role: 'assistant',
            content: systemResponse,
            reactions: { likes: 0, dislikes: 0, userReaction: null }
          };

          const botMessage = await dbOperations.createMessage(botMessageData);
          await dbOperations.updateThreadTimestamp(threadId);
          
          io.to(threadId).emit('processing_complete');
          io.to(threadId).emit('new_message', botMessage);
        } catch (error) {
          console.error('Python backend error:', error);
          io.to(threadId).emit('processing_complete');
          
          // Fallback response
          const botMessageId = uuidv4();
          const botMessageData = {
            message_id: botMessageId,
            thread_id: threadId,
            role: 'assistant',
            content: "I apologize, but I'm having trouble processing your request right now. Please try again.",
            reactions: { likes: 0, dislikes: 0, userReaction: null }
          };

          const botMessage = await dbOperations.createMessage(botMessageData);
          await dbOperations.updateThreadTimestamp(threadId);
          io.to(threadId).emit('new_message', botMessage);
        }
      }

    } catch (error) {
      console.error('Send message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('typing_start', (data) => {
    socket.to(data.threadId).emit('typing_start', { role: 'user' });
  });

  socket.on('typing_stop', (data) => {
    socket.to(data.threadId).emit('typing_stop');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔑 OpenRouter API configured: ${config.openrouter.apiKey !== 'your-openrouter-api-key-here'}`);
  console.log(`🌐 Router Service: Initialized`);
  console.log(`🔄 Translation Service: Ready`);
  console.log(`📝 Summary Service: Ready with LangGraph`);
});