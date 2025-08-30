const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const sqlite3 = require('sqlite3').verbose(); // Replaced by db-config.js
const { db, DB_TYPE } = require('./db-config');
const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Discord integration
const { DiscordNotifier } = require('./discord-integration');
const discordNotifier = new DiscordNotifier();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:9911', 
    'http://localhost:5173',
    'https://sales-kpi-frontend.onrender.com',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());

// Serve static files from the frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Database setup is now handled in db-config.js
console.log(`Using ${DB_TYPE} database`);

// Initialize database tables
if (DB_TYPE === 'postgresql') {
  db.initTables().catch(console.error);
} else {
  db.initTables();
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name],
      function(err) {
        if (err) {
          console.error('Registration error:', err);
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
          }
          return res.status(500).json({ error: '登録に失敗しました' });
        }
        
        const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: this.lastID, email, name } });
      }
    );
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'メールアドレスまたはパスワードが正しくありません' });
    }
    
    // トークンを30日間有効に設定
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // データ件数を取得
    db.get(
      'SELECT COUNT(*) as count FROM daily_kpi WHERE user_id = ?',
      [user.id],
      (err, result) => {
        const dataCount = result ? result.count : 0;
        
        res.json({ 
          token, 
          user: { id: user.id, email: user.email, name: user.name },
          dataCount: dataCount
        });
      }
    );
  });
});

// Enhanced KPI Goals routes
app.post('/api/kpi-goals', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const goals = req.body;
  
  db.run(
    `INSERT INTO kpi_goals (
      user_id, week_start, 
      emails_manual_target, emails_outsource_target,
      valid_emails_manual_target, valid_emails_outsource_target,
      reply_target, reply_rate_target,
      meetings_target, meeting_rate_target,
      deals_target, deal_rate_target,
      projects_target, project_rate_target,
      ongoing_projects_target,
      slide_views_target, slide_view_rate_target,
      video_views_target, video_view_rate_target
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, goals.week_start,
      goals.emails_manual_target || 0, goals.emails_outsource_target || 0,
      goals.valid_emails_manual_target || 0, goals.valid_emails_outsource_target || 0,
      goals.reply_target || 0, goals.reply_rate_target || 0,
      goals.meetings_target || 0, goals.meeting_rate_target || 0,
      goals.deals_target || 0, goals.deal_rate_target || 0,
      goals.projects_target || 0, goals.project_rate_target || 0,
      goals.ongoing_projects_target || 0,
      goals.slide_views_target || 0, goals.slide_view_rate_target || 0,
      goals.video_views_target || 0, goals.video_view_rate_target || 0
    ],
    function(err) {
      if (err) {
        console.error('Goals save error:', err);
        return res.status(500).json({ error: 'Failed to save goals' });
      }
      res.json({ id: this.lastID, message: 'Goals saved successfully' });
    }
  );
});

app.get('/api/kpi-goals/current', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get(
    `SELECT * FROM kpi_goals 
     WHERE user_id = ? 
     ORDER BY week_start DESC 
     LIMIT 1`,
    [userId],
    (err, row) => {
      if (err) {
        console.error('Goals fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch goals' });
      }
      res.json(row || {});
    }
  );
});

// Enhanced Daily KPI routes
app.post('/api/daily-kpi', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const kpi = req.body;
  
  db.run(
    `INSERT OR REPLACE INTO daily_kpi (
      user_id, date,
      emails_sent_manual, emails_sent_outsource,
      valid_emails_manual, valid_emails_outsource,
      replies_received, meetings_scheduled, deals_closed,
      projects_created, ongoing_projects,
      slide_views, video_views, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, kpi.date,
      kpi.emails_sent_manual || 0, kpi.emails_sent_outsource || 0,
      kpi.valid_emails_manual || 0, kpi.valid_emails_outsource || 0,
      kpi.replies_received || 0, kpi.meetings_scheduled || 0, kpi.deals_closed || 0,
      kpi.projects_created || 0, kpi.ongoing_projects || 0,
      kpi.slide_views || 0, kpi.video_views || 0, kpi.notes || ''
    ],
    function(err) {
      if (err) {
        console.error('Daily KPI save error:', err);
        return res.status(500).json({ error: 'Failed to save daily KPI' });
      }
      // Discord通知を送信
      discordNotifier.sendDailyKPINotification(userId, kpi);
      
      res.json({ message: 'Daily KPI saved successfully' });
    }
  );
});

app.get('/api/daily-kpi/:date', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { date } = req.params;
  
  db.get(
    'SELECT * FROM daily_kpi WHERE user_id = ? AND date = ?',
    [userId, date],
    (err, row) => {
      if (err) {
        console.error('Daily KPI fetch error:', err);
        return res.status(500).json({ error: 'Failed to fetch daily KPI' });
      }
      res.json(row || {});
    }
  );
});

// Enhanced Weekly summary
app.get('/api/weekly-summary/:weekStart', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { weekStart } = req.params;
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  db.all(
    `SELECT * FROM daily_kpi 
     WHERE user_id = ? AND date >= ? AND date <= ?
     ORDER BY date`,
    [userId, weekStart, weekEnd.toISOString().split('T')[0]],
    (err, rows) => {
      if (err) {
        console.error('Weekly summary error:', err);
        return res.status(500).json({ error: 'Failed to fetch weekly data' });
      }
      
      // Calculate enhanced totals
      const summary = {
        daily_data: rows,
        totals: {
          emails_sent_manual: rows.reduce((sum, row) => sum + (row.emails_sent_manual || 0), 0),
          emails_sent_outsource: rows.reduce((sum, row) => sum + (row.emails_sent_outsource || 0), 0),
          valid_emails_manual: rows.reduce((sum, row) => sum + (row.valid_emails_manual || 0), 0),
          valid_emails_outsource: rows.reduce((sum, row) => sum + (row.valid_emails_outsource || 0), 0),
          replies_received: rows.reduce((sum, row) => sum + (row.replies_received || 0), 0),
          meetings_scheduled: rows.reduce((sum, row) => sum + (row.meetings_scheduled || 0), 0),
          deals_closed: rows.reduce((sum, row) => sum + (row.deals_closed || 0), 0),
          projects_created: rows.reduce((sum, row) => sum + (row.projects_created || 0), 0),
          ongoing_projects: rows.length > 0 ? rows[rows.length - 1].ongoing_projects || 0 : 0,
          slide_views: rows.reduce((sum, row) => sum + (row.slide_views || 0), 0),
          video_views: rows.reduce((sum, row) => sum + (row.video_views || 0), 0)
        }
      };
      
      // Calculate rates
      const totalValidEmails = summary.totals.valid_emails_manual + summary.totals.valid_emails_outsource;
      summary.reply_rate = totalValidEmails > 0 
        ? (summary.totals.replies_received / totalValidEmails * 100).toFixed(2)
        : 0;
      summary.meeting_rate = summary.totals.replies_received > 0
        ? (summary.totals.meetings_scheduled / summary.totals.replies_received * 100).toFixed(2)
        : 0;
      summary.deal_rate = summary.totals.meetings_scheduled > 0
        ? (summary.totals.deals_closed / summary.totals.meetings_scheduled * 100).toFixed(2)
        : 0;
      summary.project_rate = summary.totals.meetings_scheduled > 0
        ? (summary.totals.projects_created / summary.totals.meetings_scheduled * 100).toFixed(2)
        : 0;
      summary.slide_view_rate = totalValidEmails > 0
        ? (summary.totals.slide_views / totalValidEmails * 100).toFixed(2)
        : 0;
      summary.video_view_rate = totalValidEmails > 0
        ? (summary.totals.video_views / totalValidEmails * 100).toFixed(2)
        : 0;
      
      res.json(summary);
    }
  );
});

// Discord notification function
const sendDiscordNotification = async (message) => {
  if (!DISCORD_WEBHOOK_URL) return;
  
  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      content: message
    });
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
};

// Daily reminder at 6 PM
cron.schedule('0 18 * * *', () => {
  sendDiscordNotification('📊 今日の営業KPIを入力してください！\nhttps://your-app-url.com/daily-input');
});

// Weekly summary on Friday at 5 PM
cron.schedule('0 17 * * 5', () => {
  sendDiscordNotification('📈 週次レビューの時間です！今週の振り返りを行いましょう。\nhttps://your-app-url.com/weekly-review');
});

// Daily automatic backup at midnight
cron.schedule('0 0 * * *', () => {
  if (DB_TYPE === 'sqlite') {
    const date = new Date().toISOString().split('T')[0];
    const backupPath = path.join(__dirname, 'backups', `kpi_enhanced_${date}.db`);
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync(path.join(__dirname, 'backups'))) {
      fs.mkdirSync(path.join(__dirname, 'backups'));
    }
    
    // Copy database file
    fs.copyFile('./kpi_enhanced.db', backupPath, (err) => {
      if (err) {
        console.error('Backup failed:', err);
      } else {
        console.log(`Backup created: ${backupPath}`);
      
      // Delete backups older than 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      fs.readdir(path.join(__dirname, 'backups'), (err, files) => {
        if (!err) {
          files.forEach(file => {
            const filePath = path.join(__dirname, 'backups', file);
            fs.stat(filePath, (err, stats) => {
              if (!err && stats.mtime.getTime() < thirtyDaysAgo) {
                fs.unlink(filePath, () => {
                  console.log(`Old backup deleted: ${file}`);
                });
              }
            });
          });
        }
      });
    }
  });
  } else {
    console.log('PostgreSQL backup is handled by Render platform');
  }
});


// Settings endpoints
app.get('/api/settings', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  db.get(
    'SELECT discord_webhook, email_notifications, weekly_reminders, daily_reminders, reminder_time FROM user_settings WHERE user_id = ?',
    [userId],
    (err, row) => {
      if (err) {
        console.error('Error fetching settings:', err);
        return res.status(500).json({ error: 'Failed to fetch settings' });
      }
      
      // Return default settings if not found
      if (!row) {
        return res.json({
          discordWebhook: '',
          emailNotifications: true,
          weeklyReminders: true,
          dailyReminders: true,
          reminderTime: '18:00'
        });
      }
      
      res.json({
        discordWebhook: row.discord_webhook || '',
        emailNotifications: row.email_notifications === 1,
        weeklyReminders: row.weekly_reminders === 1,
        dailyReminders: row.daily_reminders === 1,
        reminderTime: row.reminder_time || '18:00'
      });
    }
  );
});

app.post('/api/settings', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { discordWebhook, emailNotifications, weeklyReminders, dailyReminders, reminderTime } = req.body;
  
  // First, check if settings exist for this user
  db.get('SELECT id FROM user_settings WHERE user_id = ?', [userId], (err, row) => {
    if (err) {
      console.error('Error checking settings:', err);
      return res.status(500).json({ error: 'Failed to save settings' });
    }
    
    if (row) {
      // Update existing settings
      db.run(
        `UPDATE user_settings 
         SET discord_webhook = ?, email_notifications = ?, weekly_reminders = ?, 
             daily_reminders = ?, reminder_time = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [
          discordWebhook,
          emailNotifications ? 1 : 0,
          weeklyReminders ? 1 : 0,
          dailyReminders ? 1 : 0,
          reminderTime,
          userId
        ],
        (err) => {
          if (err) {
            console.error('Error updating settings:', err);
            return res.status(500).json({ error: 'Failed to save settings' });
          }
          res.json({ success: true, message: 'Settings saved successfully' });
        }
      );
    } else {
      // Insert new settings
      db.run(
        `INSERT INTO user_settings (user_id, discord_webhook, email_notifications, weekly_reminders, daily_reminders, reminder_time)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          discordWebhook,
          emailNotifications ? 1 : 0,
          weeklyReminders ? 1 : 0,
          dailyReminders ? 1 : 0,
          reminderTime
        ],
        (err) => {
          if (err) {
            console.error('Error inserting settings:', err);
            return res.status(500).json({ error: 'Failed to save settings' });
          }
          res.json({ success: true, message: 'Settings saved successfully' });
        }
      );
    }
  });
});

// Discord test notification endpoint
app.post('/api/discord/test', authenticateToken, async (req, res) => {
  const { webhook, message } = req.body;
  
  if (!webhook) {
    return res.status(400).json({ error: 'Discord webhook URL is required' });
  }
  
  try {
    await axios.post(webhook, {
      content: message || 'テスト通知: KPIトラッカーから送信'
    });
    res.json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('Discord test failed:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Export API endpoints
app.get('/api/export/csv', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { start, end } = req.query;
  
  db.all(
    `SELECT * FROM daily_kpi 
     WHERE user_id = ? AND date >= ? AND date <= ?
     ORDER BY date DESC`,
    [userId, start, end],
    (err, rows) => {
      if (err) {
        console.error('Export error:', err);
        return res.status(500).json({ error: 'Failed to export data' });
      }
      
      // Calculate totals
      const totals = rows.reduce((acc, row) => ({
        total_emails_manual: acc.total_emails_manual + (row.emails_sent_manual || 0),
        total_emails_outsource: acc.total_emails_outsource + (row.emails_sent_outsource || 0),
        total_valid_emails_manual: acc.total_valid_emails_manual + (row.valid_emails_manual || 0),
        total_valid_emails_outsource: acc.total_valid_emails_outsource + (row.valid_emails_outsource || 0),
        total_replies: acc.total_replies + (row.replies_received || 0),
        total_meetings: acc.total_meetings + (row.meetings_scheduled || 0),
        total_deals: acc.total_deals + (row.deals_closed || 0),
        total_projects: acc.total_projects + (row.projects_created || 0),
        total_slide_views: acc.total_slide_views + (row.slide_views || 0),
        total_video_views: acc.total_video_views + (row.video_views || 0)
      }), {
        total_emails_manual: 0,
        total_emails_outsource: 0,
        total_valid_emails_manual: 0,
        total_valid_emails_outsource: 0,
        total_replies: 0,
        total_meetings: 0,
        total_deals: 0,
        total_projects: 0,
        total_slide_views: 0,
        total_video_views: 0
      });
      
      // Calculate averages
      const days = rows.length || 1;
      const totalValid = totals.total_valid_emails_manual + totals.total_valid_emails_outsource;
      
      totals.avg_reply_rate = totalValid > 0 ? (totals.total_replies / totalValid * 100).toFixed(2) : '0';
      totals.avg_meeting_rate = totals.total_replies > 0 ? (totals.total_meetings / totals.total_replies * 100).toFixed(2) : '0';
      totals.avg_deal_rate = totals.total_meetings > 0 ? (totals.total_deals / totals.total_meetings * 100).toFixed(2) : '0';
      totals.avg_project_rate = totals.total_deals > 0 ? (totals.total_projects / totals.total_deals * 100).toFixed(2) : '0';
      totals.avg_slide_view_rate = totalValid > 0 ? (totals.total_slide_views / totalValid * 100).toFixed(2) : '0';
      totals.avg_video_view_rate = totalValid > 0 ? (totals.total_video_views / totalValid * 100).toFixed(2) : '0';
      
      res.json({ data: rows, totals });
    }
  );
});

app.get('/api/export/json', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { start, end } = req.query;
  
  db.all(
    `SELECT * FROM daily_kpi 
     WHERE user_id = ? AND date >= ? AND date <= ?
     ORDER BY date DESC`,
    [userId, start, end],
    (err, rows) => {
      if (err) {
        console.error('Export error:', err);
        return res.status(500).json({ error: 'Failed to export data' });
      }
      
      res.json({ data: rows, period: { start, end } });
    }
  );
});

// Dashboard API endpoints
app.get('/api/goals/progress/:weekStart', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { weekStart } = req.params;
  
  // Get current week goals
  db.get(
    `SELECT * FROM kpi_goals 
     WHERE user_id = ? AND week_start = ?
     ORDER BY created_at DESC LIMIT 1`,
    [userId, weekStart],
    (err, goals) => {
      if (err) {
        console.error('Error fetching goals:', err);
        return res.status(500).json({ error: 'Failed to fetch goals' });
      }
      
      // Calculate week end date (Sunday)
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      const weekEnd = weekEndDate.toISOString().split('T')[0];
      
      // Get actual data for the week
      db.all(
        `SELECT * FROM daily_kpi 
         WHERE user_id = ? AND date >= ? AND date <= ?`,
        [userId, weekStart, weekEnd],
        (err, dailyData) => {
          if (err) {
            console.error('Error fetching daily data:', err);
            return res.status(500).json({ error: 'Failed to fetch daily data' });
          }
          
          // Calculate actuals
          const actuals = dailyData.reduce((acc, day) => ({
            emails_manual: acc.emails_manual + (day.emails_sent_manual || 0),
            emails_outsource: acc.emails_outsource + (day.emails_sent_outsource || 0),
            replies: acc.replies + (day.replies_received || 0),
            meetings: acc.meetings + (day.meetings_scheduled || 0),
            deals: acc.deals + (day.deals_closed || 0),
            projects: acc.projects + (day.projects_created || 0)
          }), {
            emails_manual: 0,
            emails_outsource: 0,
            replies: 0,
            meetings: 0,
            deals: 0,
            projects: 0
          });
          
          // Calculate progress percentages
          const progress = {
            emails_manual: goals && goals.emails_manual_target ? 
              ((actuals.emails_manual / goals.emails_manual_target) * 100).toFixed(1) : '0',
            emails_outsource: goals && goals.emails_outsource_target ? 
              ((actuals.emails_outsource / goals.emails_outsource_target) * 100).toFixed(1) : '0',
            replies: goals && goals.reply_target ? 
              ((actuals.replies / goals.reply_target) * 100).toFixed(1) : '0',
            meetings: goals && goals.meetings_target ? 
              ((actuals.meetings / goals.meetings_target) * 100).toFixed(1) : '0',
            deals: goals && goals.deals_target ? 
              ((actuals.deals / goals.deals_target) * 100).toFixed(1) : '0',
            projects: goals && goals.projects_target ? 
              ((actuals.projects / goals.projects_target) * 100).toFixed(1) : '0'
          };
          
          // Calculate days remaining in week (including today)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          weekEndDate.setHours(23, 59, 59, 999);
          const daysRemaining = Math.max(0, Math.ceil((weekEndDate - today) / (1000 * 60 * 60 * 24)));
          
          res.json({
            goals: goals || {},
            actuals,
            progress,
            daysRemaining
          });
        }
      );
    }
  );
});

app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  const userId = req.user.id;
  
  // Get last 30 days of data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  db.all(
    `SELECT * FROM daily_kpi 
     WHERE user_id = ? AND date >= ? AND date <= ?
     ORDER BY date DESC`,
    [userId, startStr, endStr],
    (err, rows) => {
      if (err) {
        console.error('Error fetching stats:', err);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
      
      // Transform data for dashboard
      const dailyData = rows.map(row => ({
        date: row.date,
        emails: (row.emails_sent_manual || 0) + (row.emails_sent_outsource || 0),
        valid_emails: (row.valid_emails_manual || 0) + (row.valid_emails_outsource || 0),
        replies: row.replies_received || 0,
        meetings: row.meetings_scheduled || 0,
        deals: row.deals_closed || 0,
        projects: row.projects_created || 0
      }));
      
      res.json({ dailyData });
    }
  );
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 拡張APIルートを設定
const { setupExtendedRoutes } = require('./api-extensions');
setupExtendedRoutes(app, db, authenticateToken);

// 週次レビューテーブルを作成
db.run(`CREATE TABLE IF NOT EXISTS weekly_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  achievements TEXT,
  challenges TEXT,
  improvements TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
)`);

// Catch all handler for SPA - must be last
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Enhanced KPI Server running on port ${PORT}`);
});