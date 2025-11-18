import { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ja } from 'date-fns/locale';
import './WeeklyReviewV2.css';
import { API_BASE_URL } from '../config';

interface WeeklySummary {
  daily_data: any[];
  total_emails_manual: number;
  total_emails_outsource: number;
  total_valid_emails_manual: number;
  total_valid_emails_outsource: number;
  total_replies: number;
  total_meetings: number;
  total_deals: number;
  total_projects: number;
  total_slide_views: number;
  total_video_views: number;
  reply_rate: number;
  meeting_rate: number;
  deal_rate: number;
  project_rate: number;
  slide_view_rate: number;
  video_view_rate: number;
}

interface KPIGoals {
  emails_manual_target: number;
  emails_outsource_target: number;
  valid_emails_manual_target: number;
  valid_emails_outsource_target: number;
  reply_target: number;
  reply_rate_target: number;
  meetings_target: number;
  meeting_rate_target: number;
  deals_target: number;
  deal_rate_target: number;
  projects_target: number;
  project_rate_target: number;
  slide_views_target: number;
  slide_view_rate_target: number;
  video_views_target: number;
  video_view_rate_target: number;
}

const WeeklyReviewV2: React.FC = () => {
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [goals, setGoals] = useState<KPIGoals | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWeeklyData();
  }, [weekStart]);

  const fetchWeeklyData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const summaryResponse = await fetch(`${API_BASE_URL}/api/weekly-summary/${weekStart}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const summaryData = await summaryResponse.json();
      setSummary(summaryData);

      const goalsResponse = await fetch(`${API_BASE_URL}/api/kpi-goals/${weekStart}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const goalsData = await goalsResponse.json();
      setGoals(goalsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAchievementRate = (actual: number, target: number): string => {
    if (target === 0) return '0';
    return ((actual / target) * 100).toFixed(1);
  };

  const getPerformanceStatus = (rate: number) => {
    if (rate >= 100) return { text: '目標達成', className: 'excellent', emoji: '🎉' };
    if (rate >= 80) return { text: 'もう少し', className: 'good', emoji: '💪' };
    if (rate >= 60) return { text: '改善必要', className: 'average', emoji: '📈' };
    return { text: '要注意', className: 'poor', emoji: '⚠️' };
  };


  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' 
      ? subWeeks(new Date(weekStart), 1)
      : addWeeks(new Date(weekStart), 1);
    setWeekStart(format(startOfWeek(newWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  };

  if (loading) return <div className="loading">読み込み中...</div>;

  return (
    <div className="weekly-review-v2">
      <h2>週次レビュー＆分析</h2>
      
      {/* AKIトークへの誘導メッセージ */}
      <div className="aki-talk-prompt" style={{
        backgroundColor: '#f0f8ff',
        border: '2px solid #1e90ff',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#1e90ff', marginBottom: '10px' }}>📊 データ分析はAKIトークで！</h3>
        <p style={{ fontSize: '16px', marginBottom: '15px' }}>
          週次のデータをダウンロードしてAKIトークで現状の課題と今後の動きを明確にしましょう。
        </p>
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <a 
            href="https://chatgpt.com/g/g-678de795d084819181eb6ca97cbcac1b-akitoku" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#1e90ff',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              textDecoration: 'none',
              fontWeight: 'bold',
              display: 'inline-block'
            }}
          >
            🔗 AKIトークを開く
          </a>
          <a 
            href="/export" 
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              textDecoration: 'none',
              fontWeight: 'bold',
              display: 'inline-block'
            }}
          >
            📥 データをエクスポート
          </a>
        </div>
      </div>
      
      <div className="week-navigation">
        <button onClick={() => navigateWeek('prev')} className="nav-btn">
          ← 前週
        </button>
        <div className="week-display">
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
          />
          <span className="week-range">
            {format(new Date(weekStart), 'M月d日')} - {format(endOfWeek(new Date(weekStart), { weekStartsOn: 1 }), 'M月d日')}
          </span>
        </div>
        <button 
          onClick={() => navigateWeek('next')}
          className="nav-btn"
          disabled={new Date(weekStart) >= startOfWeek(new Date(), { weekStartsOn: 1 })}
        >
          次週 →
        </button>
      </div>

      {summary && goals ? (
        <>
          {/* パフォーマンスカード */}
          <div className="performance-grid">
            <div className="performance-card">
              <h3>📧 送信実績</h3>
              <div className="metric-row">
                <span className="label">手動:</span>
                <span className="value">{summary.total_emails_manual} / {goals.emails_manual_target}</span>
                <span className={`badge ${getPerformanceStatus(parseFloat(calculateAchievementRate(summary.total_emails_manual, goals.emails_manual_target))).className}`}>
                  {calculateAchievementRate(summary.total_emails_manual, goals.emails_manual_target)}%
                </span>
              </div>
              <div className="metric-row">
                <span className="label">外注:</span>
                <span className="value">{summary.total_emails_outsource} / {goals.emails_outsource_target}</span>
                <span className={`badge ${getPerformanceStatus(parseFloat(calculateAchievementRate(summary.total_emails_outsource, goals.emails_outsource_target))).className}`}>
                  {calculateAchievementRate(summary.total_emails_outsource, goals.emails_outsource_target)}%
                </span>
              </div>
            </div>

            <div className="performance-card">
              <h3>💬 反応率</h3>
              <div className="metric-row">
                <span className="label">返信率:</span>
                <span className="value">{summary.reply_rate.toFixed(2)}%</span>
                <span className={`badge ${getPerformanceStatus((summary.reply_rate / goals.reply_rate_target) * 100).className}`}>
                  {getPerformanceStatus((summary.reply_rate / goals.reply_rate_target) * 100).emoji}
                </span>
              </div>
              <div className="metric-row">
                <span className="label">面談率:</span>
                <span className="value">{summary.meeting_rate.toFixed(2)}%</span>
                <span className={`badge ${getPerformanceStatus((summary.meeting_rate / goals.meeting_rate_target) * 100).className}`}>
                  {getPerformanceStatus((summary.meeting_rate / goals.meeting_rate_target) * 100).emoji}
                </span>
              </div>
            </div>

            <div className="performance-card">
              <h3>🎯 成果</h3>
              <div className="metric-row">
                <span className="label">成約:</span>
                <span className="value">{summary.total_deals} / {goals.deals_target}</span>
                <span className={`badge ${getPerformanceStatus(parseFloat(calculateAchievementRate(summary.total_deals, goals.deals_target))).className}`}>
                  {calculateAchievementRate(summary.total_deals, goals.deals_target)}%
                </span>
              </div>
              <div className="metric-row">
                <span className="label">案件:</span>
                <span className="value">{summary.total_projects} / {goals.projects_target}</span>
                <span className={`badge ${getPerformanceStatus(parseFloat(calculateAchievementRate(summary.total_projects, goals.projects_target))).className}`}>
                  {calculateAchievementRate(summary.total_projects, goals.projects_target)}%
                </span>
              </div>
            </div>

            <div className="performance-card">
              <h3>📊 エンゲージメント</h3>
              <div className="metric-row">
                <span className="label">スライド:</span>
                <span className="value">{summary.total_slide_views}回</span>
                <span className="sub-value">({summary.slide_view_rate.toFixed(2)}%)</span>
              </div>
              <div className="metric-row">
                <span className="label">動画:</span>
                <span className="value">{summary.total_video_views}回</span>
                <span className="sub-value">({summary.video_view_rate.toFixed(2)}%)</span>
              </div>
            </div>
          </div>

          {/* 日別詳細テーブル */}
          <div className="daily-details">
            <h3>📅 日別詳細</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>送信(手動)</th>
                    <th>送信(外注)</th>
                    <th>有効送信</th>
                    <th>返信</th>
                    <th>面談</th>
                    <th>成約</th>
                    <th>スライド</th>
                    <th>動画</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.daily_data.map((day: any) => (
                    <tr key={day.date}>
                      <td>{format(new Date(day.date), 'M/d(E)', { locale: ja })}</td>
                      <td>{day.emails_sent_manual || 0}</td>
                      <td>{day.emails_sent_outsource || 0}</td>
                      <td>{(day.valid_emails_manual || 0) + (day.valid_emails_outsource || 0)}</td>
                      <td>{day.replies_received || 0}</td>
                      <td>{day.meetings_scheduled || 0}</td>
                      <td>{day.deals_closed || 0}</td>
                      <td>{day.slide_views || 0}</td>
                      <td>{day.video_views || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="no-data">
          <p>この週のデータがありません</p>
          <button onClick={() => setWeekStart(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'))}>
            今週に戻る
          </button>
        </div>
      )}
    </div>
  );
};

export default WeeklyReviewV2;