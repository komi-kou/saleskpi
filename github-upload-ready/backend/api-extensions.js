// API拡張機能 - データエクスポート、週次レビュー、通知機能など

const setupExtendedRoutes = (app, db, authenticateToken) => {
  
  // JSONエクスポート機能
  app.get('/api/export/json', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { start: startDate, end: endDate } = req.query;
    
    db.all(
      `SELECT * FROM daily_kpi 
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date`,
      [userId, startDate, endDate],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to export data' });
        }
        
        const totalRows = rows.length;
        const totals = {
          total_emails_manual: rows.reduce((sum, r) => sum + (r.emails_sent_manual || 0), 0),
          total_emails_outsource: rows.reduce((sum, r) => sum + (r.emails_sent_outsource || 0), 0),
          total_valid_emails_manual: rows.reduce((sum, r) => sum + (r.valid_emails_manual || 0), 0),
          total_valid_emails_outsource: rows.reduce((sum, r) => sum + (r.valid_emails_outsource || 0), 0),
          total_replies: rows.reduce((sum, r) => sum + (r.replies_received || 0), 0),
          total_meetings: rows.reduce((sum, r) => sum + (r.meetings_scheduled || 0), 0),
          total_deals: rows.reduce((sum, r) => sum + (r.deals_closed || 0), 0),
          total_projects: rows.reduce((sum, r) => sum + (r.projects_created || 0), 0),
          total_slide_views: rows.reduce((sum, r) => sum + (r.slide_views || 0), 0),
          total_video_views: rows.reduce((sum, r) => sum + (r.video_views || 0), 0)
        };
        
        const totalValidEmails = totals.total_valid_emails_manual + totals.total_valid_emails_outsource;
        totals.avg_reply_rate = totalValidEmails > 0 ? (totals.total_replies / totalValidEmails * 100).toFixed(2) : '0';
        totals.avg_meeting_rate = totals.total_replies > 0 ? (totals.total_meetings / totals.total_replies * 100).toFixed(2) : '0';
        totals.avg_deal_rate = totals.total_meetings > 0 ? (totals.total_deals / totals.total_meetings * 100).toFixed(2) : '0';
        totals.avg_project_rate = totals.total_deals > 0 ? (totals.total_projects / totals.total_deals * 100).toFixed(2) : '0';
        totals.avg_slide_view_rate = totalValidEmails > 0 ? (totals.total_slide_views / totalValidEmails * 100).toFixed(2) : '0';
        totals.avg_video_view_rate = totalValidEmails > 0 ? (totals.total_video_views / totalValidEmails * 100).toFixed(2) : '0';
        
        res.json({
          exportDate: new Date().toISOString(),
          period: { start: startDate, end: endDate },
          data: rows,
          totals: totals
        });
      }
    );
  });
  
  // データエクスポート機能
  app.get('/api/export/csv', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { start: startDate, end: endDate } = req.query;
    
    db.all(
      `SELECT * FROM daily_kpi 
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date`,
      [userId, startDate, endDate],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to export data' });
        }
        
        // CSV形式に変換
        const headers = [
          'Date', 'Emails Sent (Manual)', 'Emails Sent (Outsource)',
          'Valid Emails (Manual)', 'Valid Emails (Outsource)',
          'Replies', 'Meetings', 'Deals', 'Projects', 'Ongoing Projects',
          'Slide Views', 'Video Views', 'Notes'
        ];
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => [
            row.date,
            row.emails_sent_manual || 0,
            row.emails_sent_outsource || 0,
            row.valid_emails_manual || 0,
            row.valid_emails_outsource || 0,
            row.replies_received || 0,
            row.meetings_scheduled || 0,
            row.deals_closed || 0,
            row.projects_created || 0,
            row.ongoing_projects || 0,
            row.slide_views || 0,
            row.video_views || 0,
            `"${(row.notes || '').replace(/"/g, '""')}"`
          ].join(','))
        ].join('\n');
        
        // 集計データを計算
        const totals = {
          total_emails_manual: rows.reduce((sum, r) => sum + (r.emails_sent_manual || 0), 0),
          total_emails_outsource: rows.reduce((sum, r) => sum + (r.emails_sent_outsource || 0), 0),
          total_valid_emails_manual: rows.reduce((sum, r) => sum + (r.valid_emails_manual || 0), 0),
          total_valid_emails_outsource: rows.reduce((sum, r) => sum + (r.valid_emails_outsource || 0), 0),
          total_replies: rows.reduce((sum, r) => sum + (r.replies_received || 0), 0),
          total_meetings: rows.reduce((sum, r) => sum + (r.meetings_scheduled || 0), 0),
          total_deals: rows.reduce((sum, r) => sum + (r.deals_closed || 0), 0),
          total_projects: rows.reduce((sum, r) => sum + (r.projects_created || 0), 0),
          total_slide_views: rows.reduce((sum, r) => sum + (r.slide_views || 0), 0),
          total_video_views: rows.reduce((sum, r) => sum + (r.video_views || 0), 0)
        };
        
        const totalValidEmails = totals.total_valid_emails_manual + totals.total_valid_emails_outsource;
        totals.avg_reply_rate = totalValidEmails > 0 ? (totals.total_replies / totalValidEmails * 100).toFixed(2) : '0';
        totals.avg_meeting_rate = totals.total_replies > 0 ? (totals.total_meetings / totals.total_replies * 100).toFixed(2) : '0';
        totals.avg_deal_rate = totals.total_meetings > 0 ? (totals.total_deals / totals.total_meetings * 100).toFixed(2) : '0';
        totals.avg_project_rate = totals.total_deals > 0 ? (totals.total_projects / totals.total_deals * 100).toFixed(2) : '0';
        totals.avg_slide_view_rate = totalValidEmails > 0 ? (totals.total_slide_views / totalValidEmails * 100).toFixed(2) : '0';
        totals.avg_video_view_rate = totalValidEmails > 0 ? (totals.total_video_views / totalValidEmails * 100).toFixed(2) : '0';
        
        res.json({
          data: rows,
          totals: totals
        });
      }
    );
  });
  
  // 週次レビューデータ保存
  app.post('/api/weekly-review', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const review = req.body;
    
    db.run(
      `INSERT INTO weekly_reviews (
        user_id, week_start, week_end, 
        achievements, challenges, improvements, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, review.week_start, review.week_end,
        review.achievements, review.challenges, 
        review.improvements, review.notes
      ],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save review' });
        }
        res.json({ id: this.lastID, message: 'Review saved successfully' });
      }
    );
  });
  
  // 週次レビュー取得
  app.get('/api/weekly-review/:weekStart', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { weekStart } = req.params;
    
    db.get(
      `SELECT * FROM weekly_reviews 
       WHERE user_id = ? AND week_start = ?`,
      [userId, weekStart],
      (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch review' });
        }
        res.json(row || {});
      }
    );
  });
  
  // ダッシュボード用の統計データ
  app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    db.all(
      `SELECT * FROM daily_kpi 
       WHERE user_id = ? AND date >= ?
       ORDER BY date`,
      [userId, thirtyDaysAgo],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch stats' });
        }
        
        // 統計計算
        const stats = {
          last30Days: {
            totalEmails: rows.reduce((sum, r) => sum + (r.emails_sent_manual || 0) + (r.emails_sent_outsource || 0), 0),
            totalMeetings: rows.reduce((sum, r) => sum + (r.meetings_scheduled || 0), 0),
            totalDeals: rows.reduce((sum, r) => sum + (r.deals_closed || 0), 0),
            totalProjects: rows.reduce((sum, r) => sum + (r.projects_created || 0), 0)
          },
          dailyData: rows.map(r => ({
            date: r.date,
            emails: (r.emails_sent_manual || 0) + (r.emails_sent_outsource || 0),
            meetings: r.meetings_scheduled || 0,
            deals: r.deals_closed || 0
          })),
          currentWeek: {},
          lastWeek: {}
        };
        
        // 今週と先週のデータ
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        const lastWeekStartStr = lastWeekStart.toISOString().split('T')[0];
        
        const thisWeekData = rows.filter(r => r.date >= weekStartStr);
        const lastWeekData = rows.filter(r => r.date >= lastWeekStartStr && r.date < weekStartStr);
        
        stats.currentWeek = {
          emails: thisWeekData.reduce((sum, r) => sum + (r.emails_sent_manual || 0) + (r.emails_sent_outsource || 0), 0),
          meetings: thisWeekData.reduce((sum, r) => sum + (r.meetings_scheduled || 0), 0),
          deals: thisWeekData.reduce((sum, r) => sum + (r.deals_closed || 0), 0)
        };
        
        stats.lastWeek = {
          emails: lastWeekData.reduce((sum, r) => sum + (r.emails_sent_manual || 0) + (r.emails_sent_outsource || 0), 0),
          meetings: lastWeekData.reduce((sum, r) => sum + (r.meetings_scheduled || 0), 0),
          deals: lastWeekData.reduce((sum, r) => sum + (r.deals_closed || 0), 0)
        };
        
        res.json(stats);
      }
    );
  });
  
  // パフォーマンストレンド
  app.get('/api/performance/trends', authenticateToken, (req, res) => {
    const userId = req.user.id;
    
    db.all(
      `SELECT 
        strftime('%Y-%W', date) as week,
        SUM(emails_sent_manual + emails_sent_outsource) as total_emails,
        SUM(valid_emails_manual + valid_emails_outsource) as total_valid_emails,
        SUM(replies_received) as total_replies,
        SUM(meetings_scheduled) as total_meetings,
        SUM(deals_closed) as total_deals,
        SUM(projects_created) as total_projects
       FROM daily_kpi 
       WHERE user_id = ?
       GROUP BY week
       ORDER BY week DESC
       LIMIT 12`,
      [userId],
      (err, rows) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch trends' });
        }
        
        const trends = rows.map(row => ({
          week: row.week,
          emails: row.total_emails || 0,
          validEmails: row.total_valid_emails || 0,
          replies: row.total_replies || 0,
          meetings: row.total_meetings || 0,
          deals: row.total_deals || 0,
          projects: row.total_projects || 0,
          replyRate: row.total_valid_emails > 0 ? ((row.total_replies / row.total_valid_emails) * 100).toFixed(2) : 0,
          meetingRate: row.total_replies > 0 ? ((row.total_meetings / row.total_replies) * 100).toFixed(2) : 0
        }));
        
        res.json(trends);
      }
    );
  });
  
  // 目標達成状況
  app.get('/api/goals/progress/:weekStart', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { weekStart } = req.params;
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // 目標と実績を比較
    db.get(
      `SELECT * FROM kpi_goals 
       WHERE user_id = ? AND week_start = ?`,
      [userId, weekStart],
      (err, goals) => {
        if (err || !goals) {
          return res.status(500).json({ error: 'Failed to fetch goals' });
        }
        
        db.all(
          `SELECT * FROM daily_kpi 
           WHERE user_id = ? AND date >= ? AND date <= ?`,
          [userId, weekStart, weekEnd.toISOString().split('T')[0]],
          (err, actuals) => {
            if (err) {
              return res.status(500).json({ error: 'Failed to fetch actuals' });
            }
            
            const actualTotals = {
              emails_manual: actuals.reduce((sum, r) => sum + (r.emails_sent_manual || 0), 0),
              emails_outsource: actuals.reduce((sum, r) => sum + (r.emails_sent_outsource || 0), 0),
              valid_emails_manual: actuals.reduce((sum, r) => sum + (r.valid_emails_manual || 0), 0),
              valid_emails_outsource: actuals.reduce((sum, r) => sum + (r.valid_emails_outsource || 0), 0),
              replies: actuals.reduce((sum, r) => sum + (r.replies_received || 0), 0),
              meetings: actuals.reduce((sum, r) => sum + (r.meetings_scheduled || 0), 0),
              deals: actuals.reduce((sum, r) => sum + (r.deals_closed || 0), 0),
              projects: actuals.reduce((sum, r) => sum + (r.projects_created || 0), 0)
            };
            
            const progress = {
              emails_manual: goals.emails_manual_target > 0 ? 
                ((actualTotals.emails_manual / goals.emails_manual_target) * 100).toFixed(1) : 0,
              emails_outsource: goals.emails_outsource_target > 0 ?
                ((actualTotals.emails_outsource / goals.emails_outsource_target) * 100).toFixed(1) : 0,
              replies: goals.reply_target > 0 ?
                ((actualTotals.replies / goals.reply_target) * 100).toFixed(1) : 0,
              meetings: goals.meetings_target > 0 ?
                ((actualTotals.meetings / goals.meetings_target) * 100).toFixed(1) : 0,
              deals: goals.deals_target > 0 ?
                ((actualTotals.deals / goals.deals_target) * 100).toFixed(1) : 0,
              projects: goals.projects_target > 0 ?
                ((actualTotals.projects / goals.projects_target) * 100).toFixed(1) : 0
            };
            
            res.json({
              goals,
              actuals: actualTotals,
              progress,
              daysRemaining: Math.max(0, 7 - actuals.length)
            });
          }
        );
      }
    );
  });
};

module.exports = { setupExtendedRoutes };