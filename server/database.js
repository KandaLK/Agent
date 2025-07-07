import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'chatbot.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Users table - for authentication and user data
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      uuid TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      preferences TEXT DEFAULT '{"theme": "light", "language": "en", "webSearchEnabled": true, "languageChanged": false}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chat threads table - for organizing conversations
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_threads (
      thread_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT DEFAULT '',
      language TEXT DEFAULT 'en',
      web_search_enabled BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (uuid) ON DELETE CASCADE
    )
  `);

  // Messages table - for storing all chat messages
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      message_id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reactions TEXT DEFAULT '{"likes": 0, "dislikes": 0, "userReaction": null}',
      FOREIGN KEY (thread_id) REFERENCES chat_threads (thread_id) ON DELETE CASCADE
    )
  `);

  // Message reactions table - for tracking individual user reactions
  db.run(`
    CREATE TABLE IF NOT EXISTS message_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(message_id, user_id),
      FOREIGN KEY (message_id) REFERENCES messages (message_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (uuid) ON DELETE CASCADE
    )
  `);

  // Thread language settings - for tracking language preferences per thread
  db.run(`
    CREATE TABLE IF NOT EXISTS thread_language_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      language TEXT NOT NULL CHECK (language IN ('en', 'si')),
      language_locked BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(thread_id, user_id),
      FOREIGN KEY (thread_id) REFERENCES chat_threads (thread_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (uuid) ON DELETE CASCADE
    )
  `);

  // NEW: Translated messages table - for storing Sinhala to English translations
  db.run(`
    CREATE TABLE IF NOT EXISTS translated_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_message_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      original_content TEXT NOT NULL,
      translated_content TEXT NOT NULL,
      source_language TEXT DEFAULT 'si',
      target_language TEXT DEFAULT 'en',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (original_message_id) REFERENCES messages (message_id) ON DELETE CASCADE,
      FOREIGN KEY (thread_id) REFERENCES chat_threads (thread_id) ON DELETE CASCADE
    )
  `);

  // NEW: Thread summaries table - for storing chat history summaries
  db.run(`
    CREATE TABLE IF NOT EXISTS thread_summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      thread_id TEXT NOT NULL,
      summary_content TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(thread_id),
      FOREIGN KEY (thread_id) REFERENCES chat_threads (thread_id) ON DELETE CASCADE
    )
  `);

  console.log('Database tables initialized');
}

// Database operations
export const dbOperations = {
  // User operations
  createUser: (userData) => {
    return new Promise((resolve, reject) => {
      const { uuid, username, email, password, preferences } = userData;
      db.run(
        'INSERT INTO users (uuid, username, email, password, preferences) VALUES (?, ?, ?, ?, ?)',
        [uuid, username, email, password, JSON.stringify(preferences)],
        function(err) {
          if (err) reject(err);
          else resolve({ uuid, username, email, preferences });
        }
      );
    });
  },

  getUserByEmail: (email) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else {
            if (row) {
              row.preferences = JSON.parse(row.preferences);
            }
            resolve(row);
          }
        }
      );
    });
  },

  getUserById: (uuid) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE uuid = ?',
        [uuid],
        (err, row) => {
          if (err) reject(err);
          else {
            if (row) {
              row.preferences = JSON.parse(row.preferences);
            }
            resolve(row);
          }
        }
      );
    });
  },

  updateUserPreferences: (uuid, preferences) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?',
        [JSON.stringify(preferences), uuid],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  // Thread operations
  createThread: (threadData) => {
    return new Promise((resolve, reject) => {
      const { thread_id, user_id, title, language = 'en', web_search_enabled = true } = threadData;
      db.run(
        'INSERT INTO chat_threads (thread_id, user_id, title, language, web_search_enabled) VALUES (?, ?, ?, ?, ?)',
        [thread_id, user_id, title, language, web_search_enabled],
        function(err) {
          if (err) reject(err);
          else {
            db.get(
              'SELECT * FROM chat_threads WHERE thread_id = ?',
              [thread_id],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          }
        }
      );
    });
  },

  getThreadsByUserId: (userId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM chat_threads WHERE user_id = ? ORDER BY updated_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  updateThread: (threadId, title) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE chat_threads SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE thread_id = ?',
        [title, threadId],
        function(err) {
          if (err) reject(err);
          else {
            db.get(
              'SELECT * FROM chat_threads WHERE thread_id = ?',
              [threadId],
              (err, row) => {
                if (err) reject(err);
                else resolve(row);
              }
            );
          }
        }
      );
    });
  },

  updateThreadTimestamp: (threadId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE chat_threads SET updated_at = CURRENT_TIMESTAMP WHERE thread_id = ?',
        [threadId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  updateThreadSettings: (threadId, language, webSearchEnabled) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE chat_threads SET language = ?, web_search_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE thread_id = ?',
        [language, webSearchEnabled, threadId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  deleteThread: (threadId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM chat_threads WHERE thread_id = ?',
        [threadId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  // Message operations
  createMessage: (messageData) => {
    return new Promise((resolve, reject) => {
      const { message_id, thread_id, role, content, reactions } = messageData;
      db.run(
        'INSERT INTO messages (message_id, thread_id, role, content, reactions) VALUES (?, ?, ?, ?, ?)',
        [message_id, thread_id, role, content, JSON.stringify(reactions)],
        function(err) {
          if (err) reject(err);
          else {
            db.get(
              'SELECT * FROM messages WHERE message_id = ?',
              [message_id],
              (err, row) => {
                if (err) reject(err);
                else {
                  if (row) {
                    row.reactions = JSON.parse(row.reactions);
                  }
                  resolve(row);
                }
              }
            );
          }
        }
      );
    });
  },

  getMessagesByThreadId: (threadId) => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT m.*, mr.reaction_type as user_reaction 
         FROM messages m 
         LEFT JOIN message_reactions mr ON m.message_id = mr.message_id 
         WHERE m.thread_id = ? 
         ORDER BY m.timestamp ASC`,
        [threadId],
        (err, rows) => {
          if (err) reject(err);
          else {
            const messages = rows.map(row => ({
              ...row,
              reactions: {
                ...JSON.parse(row.reactions),
                userReaction: row.user_reaction || null
              }
            }));
            resolve(messages);
          }
        }
      );
    });
  },

  updateMessage: (messageId, content) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE messages SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE message_id = ?',
        [content, messageId],
        function(err) {
          if (err) reject(err);
          else {
            db.get(
              'SELECT * FROM messages WHERE message_id = ?',
              [messageId],
              (err, row) => {
                if (err) reject(err);
                else {
                  if (row) {
                    row.reactions = JSON.parse(row.reactions);
                  }
                  resolve(row);
                }
              }
            );
          }
        }
      );
    });
  },

  updateMessageReactions: (messageId, userId, reactionType) => {
    return new Promise((resolve, reject) => {
      if (reactionType === null) {
        // Remove reaction
        db.run(
          'DELETE FROM message_reactions WHERE message_id = ? AND user_id = ?',
          [messageId, userId],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      } else {
        // Add or update reaction
        db.run(
          'INSERT OR REPLACE INTO message_reactions (message_id, user_id, reaction_type) VALUES (?, ?, ?)',
          [messageId, userId, reactionType],
          function(err) {
            if (err) reject(err);
            else resolve(this.changes);
          }
        );
      }
    });
  },

  getLastAssistantMessage: (threadId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM messages WHERE thread_id = ? AND role = "assistant" ORDER BY timestamp DESC LIMIT 1',
        [threadId],
        (err, row) => {
          if (err) reject(err);
          else {
            if (row) {
              row.reactions = JSON.parse(row.reactions);
            }
            resolve(row);
          }
        }
      );
    });
  },

  deleteMessage: (messageId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM messages WHERE message_id = ?',
        [messageId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  // Check if user has messages in thread
  hasUserMessagesInThread: (threadId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count FROM messages m 
         JOIN chat_threads ct ON m.thread_id = ct.thread_id 
         WHERE m.thread_id = ? AND ct.user_id = ? AND m.role = 'user'`,
        [threadId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count > 0);
        }
      );
    });
  },

  // Thread language settings operations
  setThreadLanguage: (threadId, userId, language) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO thread_language_settings (thread_id, user_id, language, language_locked) VALUES (?, ?, ?, FALSE)',
        [threadId, userId, language],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  lockThreadLanguage: (threadId, userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE thread_language_settings SET language_locked = TRUE WHERE thread_id = ? AND user_id = ?',
        [threadId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  getThreadLanguageSettings: (threadId, userId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM thread_language_settings WHERE thread_id = ? AND user_id = ?',
        [threadId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // NEW: Translation operations
  saveTranslatedMessage: (translationData) => {
    return new Promise((resolve, reject) => {
      const { original_message_id, thread_id, original_content, translated_content, source_language, target_language } = translationData;
      db.run(
        'INSERT INTO translated_messages (original_message_id, thread_id, original_content, translated_content, source_language, target_language) VALUES (?, ?, ?, ?, ?, ?)',
        [original_message_id, thread_id, original_content, translated_content, source_language, target_language],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...translationData });
        }
      );
    });
  },

  getTranslatedMessages: (threadId) => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM translated_messages WHERE thread_id = ? ORDER BY created_at ASC',
        [threadId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  },

  // NEW: Thread summary operations
  saveThreadSummary: (threadId, summaryContent, messageCount) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT OR REPLACE INTO thread_summaries (thread_id, summary_content, message_count, last_updated) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [threadId, summaryContent, messageCount],
        function(err) {
          if (err) reject(err);
          else resolve({ threadId, summaryContent, messageCount });
        }
      );
    });
  },

  getThreadSummary: (threadId) => {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM thread_summaries WHERE thread_id = ?',
        [threadId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  },

  // Clear all conversations for a user
  clearAllUserConversations: (userId) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM chat_threads WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  },

  // Delete user account (preserves likes/dislikes data)
  deleteUserAccount: (userId) => {
    return new Promise((resolve, reject) => {
      // First delete user's threads and messages (cascading)
      db.run(
        'DELETE FROM chat_threads WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Then delete the user account
            db.run(
              'DELETE FROM users WHERE uuid = ?',
              [userId],
              function(err) {
                if (err) reject(err);
                else resolve(this.changes);
              }
            );
          }
        }
      );
    });
  }
};

export default db;