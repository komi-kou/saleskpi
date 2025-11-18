import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config';
import './EnhancedDailyInputV2.css';

interface EnhancedDailyKPI {
  emails_sent_manual: string;
  emails_sent_outsource: string;
  valid_emails_manual: string;
  valid_emails_manual_today: string;
  valid_emails_outsource: string;
  replies_received: string;
  meetings_scheduled: string;
  deals_closed: string;
  projects_created: string;
  ongoing_projects: string;
  slide_views: string;
  video_views: string;
  notes: string;
}

const EnhancedDailyInputV2: React.FC = () => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [kpi, setKpi] = useState<EnhancedDailyKPI>({
    emails_sent_manual: '',
    emails_sent_outsource: '',
    valid_emails_manual: '',
    valid_emails_manual_today: '',
    valid_emails_outsource: '',
    replies_received: '',
    meetings_scheduled: '',
    deals_closed: '',
    projects_created: '',
    ongoing_projects: '',
    slide_views: '',
    video_views: '',
    notes: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDailyData(date);
  }, [date]);

  const fetchDailyData = async (selectedDate: string) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/daily-kpi/${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.id) {
        setKpi({
          emails_sent_manual: data.emails_sent_manual?.toString() || '',
          emails_sent_outsource: data.emails_sent_outsource?.toString() || '',
          valid_emails_manual: data.valid_emails_manual?.toString() || '',
          valid_emails_manual_today: data.valid_emails_manual_today?.toString() || '',
          valid_emails_outsource: data.valid_emails_outsource?.toString() || '',
          replies_received: data.replies_received?.toString() || '',
          meetings_scheduled: data.meetings_scheduled?.toString() || '',
          deals_closed: data.deals_closed?.toString() || '',
          projects_created: data.projects_created?.toString() || '',
          ongoing_projects: data.ongoing_projects?.toString() || '',
          slide_views: data.slide_views?.toString() || '',
          video_views: data.video_views?.toString() || '',
          notes: data.notes || '',
        });
      } else {
        // デフォルト値をリセット
        setKpi({
          emails_sent_manual: '',
          emails_sent_outsource: '',
          valid_emails_manual: '',
          valid_emails_manual_today: '',
          valid_emails_outsource: '',
          replies_received: '',
          meetings_scheduled: '',
          deals_closed: '',
          projects_created: '',
          ongoing_projects: '',
          slide_views: '',
          video_views: '',
          notes: '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch daily data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_BASE_URL}/api/daily-kpi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date,
          emails_sent_manual: parseInt(kpi.emails_sent_manual) || 0,
          emails_sent_outsource: parseInt(kpi.emails_sent_outsource) || 0,
          valid_emails_manual: parseInt(kpi.valid_emails_manual) || 0,
          valid_emails_outsource: parseInt(kpi.valid_emails_outsource) || 0,
          replies_received: parseInt(kpi.replies_received) || 0,
          meetings_scheduled: parseInt(kpi.meetings_scheduled) || 0,
          deals_closed: parseInt(kpi.deals_closed) || 0,
          projects_created: parseInt(kpi.projects_created) || 0,
          ongoing_projects: parseInt(kpi.ongoing_projects) || 0,
          slide_views: parseInt(kpi.slide_views) || 0,
          video_views: parseInt(kpi.video_views) || 0,
          notes: kpi.notes
        }),
      });

      if (response.ok) {
        setSaved(true);
        // スクロールトップ
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // 5秒後に非表示
        setTimeout(() => setSaved(false), 5000);
      } else {
        alert('保存に失敗しました。もう一度お試しください。');
      }
    } catch (error) {
      console.error('Failed to save daily KPI:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof EnhancedDailyKPI, value: string) => {
    if (field === 'notes') {
      setKpi(prev => ({ ...prev, [field]: value }));
    } else if (value === '' || /^\d+$/.test(value)) {
      setKpi(prev => ({ ...prev, [field]: value }));
    }
  };

  // Calculate metrics
  const totalSent = (parseInt(kpi.emails_sent_manual) || 0) + (parseInt(kpi.emails_sent_outsource) || 0);
  const totalValid = (parseInt(kpi.valid_emails_manual) || 0) + (parseInt(kpi.valid_emails_outsource) || 0);
  const replies = parseInt(kpi.replies_received) || 0;
  const meetings = parseInt(kpi.meetings_scheduled) || 0;
  const deals = parseInt(kpi.deals_closed) || 0;
  const projects = parseInt(kpi.projects_created) || 0;
  const slideViews = parseInt(kpi.slide_views) || 0;
  const videoViews = parseInt(kpi.video_views) || 0;
  
  const replyRate = totalValid > 0 ? ((replies / totalValid) * 100).toFixed(2) : '0.00';
  const meetingRate = replies > 0 ? ((meetings / replies) * 100).toFixed(2) : '0.00';
  const dealRate = meetings > 0 ? ((deals / meetings) * 100).toFixed(2) : '0.00';
  const projectRate = deals > 0 ? ((projects / deals) * 100).toFixed(2) : '0.00';
  const slideViewRate = totalValid > 0 ? ((slideViews / totalValid) * 100).toFixed(2) : '0.00';
  const videoViewRate = totalValid > 0 ? ((videoViews / totalValid) * 100).toFixed(2) : '0.00';

  return (
    <div className="enhanced-daily-input">
      <h2>営業KPI日次入力</h2>
      
      <div className="date-selector">
        <label>
          日付:
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
          />
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="kpi-sections">
          {/* 送信数セクション */}
          <div className="kpi-section">
            <h3>📧 送信数</h3>
            <div className="input-grid">
              <div className="input-group">
                <label>
                  送信数(手動):
                  <input
                    type="text"
                    value={kpi.emails_sent_manual}
                    onChange={(e) => handleChange('emails_sent_manual', e.target.value)}
                    placeholder="例: 30"
                  />
                </label>
              </div>
              <div className="input-group">
                <label>
                  送信数(外注):
                  <input
                    type="text"
                    value={kpi.emails_sent_outsource}
                    onChange={(e) => handleChange('emails_sent_outsource', e.target.value)}
                    placeholder="例: 450"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 有効送信数セクション */}
          <div className="kpi-section">
            <h3>✅ 有効送信数</h3>
            <div className="input-grid">
              <div className="input-group">
                <label>
                  有効送信数(手動・累計):
                  <input
                    type="text"
                    value={kpi.valid_emails_manual}
                    onChange={(e) => handleChange('valid_emails_manual', e.target.value)}
                    placeholder="例: 47"
                  />
                </label>
              </div>
              <div className="input-group">
                <label>
                  有効送信数(手動・本日):
                  <input
                    type="text"
                    value={kpi.valid_emails_manual_today}
                    onChange={(e) => handleChange('valid_emails_manual_today', e.target.value)}
                    placeholder="例: 30"
                  />
                </label>
              </div>
              <div className="input-group">
                <label>
                  有効送信数(外注):
                  <input
                    type="text"
                    value={kpi.valid_emails_outsource}
                    onChange={(e) => handleChange('valid_emails_outsource', e.target.value)}
                    placeholder="例: 270"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 反応・成果セクション */}
          <div className="kpi-section">
            <h3>💬 反応・成果</h3>
            <div className="input-grid">
              <div className="input-group">
                <label>
                  返信数:
                  <input
                    type="text"
                    value={kpi.replies_received}
                    onChange={(e) => handleChange('replies_received', e.target.value)}
                    placeholder="例: 1"
                  />
                  <span className="metric">返信率: {replyRate}%</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  面談数:
                  <input
                    type="text"
                    value={kpi.meetings_scheduled}
                    onChange={(e) => handleChange('meetings_scheduled', e.target.value)}
                    placeholder="例: 0"
                  />
                  <span className="metric">面談率: {meetingRate}%</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  成約数:
                  <input
                    type="text"
                    value={kpi.deals_closed}
                    onChange={(e) => handleChange('deals_closed', e.target.value)}
                    placeholder="例: 0"
                  />
                  <span className="metric">成約率: {dealRate}%</span>
                </label>
              </div>
            </div>
          </div>

          {/* 案件管理セクション */}
          <div className="kpi-section">
            <h3>📂 案件管理</h3>
            <div className="input-grid">
              <div className="input-group">
                <label>
                  案件数(新規):
                  <input
                    type="text"
                    value={kpi.projects_created}
                    onChange={(e) => handleChange('projects_created', e.target.value)}
                    placeholder="例: 0"
                  />
                  <span className="metric">案件化率: {projectRate}%</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  継続案件数:
                  <input
                    type="text"
                    value={kpi.ongoing_projects}
                    onChange={(e) => handleChange('ongoing_projects', e.target.value)}
                    placeholder="例: 1"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* エンゲージメントセクション */}
          <div className="kpi-section">
            <h3>📊 エンゲージメント</h3>
            <div className="input-grid">
              <div className="input-group">
                <label>
                  スライド視聴数:
                  <input
                    type="text"
                    value={kpi.slide_views}
                    onChange={(e) => handleChange('slide_views', e.target.value)}
                    placeholder="例: 7"
                  />
                  <span className="metric">視聴率: {slideViewRate}%</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  動画視聴数:
                  <input
                    type="text"
                    value={kpi.video_views}
                    onChange={(e) => handleChange('video_views', e.target.value)}
                    placeholder="例: 5"
                  />
                  <span className="metric">視聴率: {videoViewRate}%</span>
                </label>
              </div>
            </div>
          </div>

          {/* メモセクション */}
          <div className="kpi-section">
            <h3>📝 メモ</h3>
            <textarea
              value={kpi.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="本日の活動メモ、気づき、改善点など"
              rows={4}
            />
          </div>
        </div>

        {/* サマリー表示 */}
        <div className="summary-section">
          <h3>📈 本日のサマリー</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">総送信数:</span>
              <span className="value">{totalSent}件</span>
            </div>
            <div className="summary-item">
              <span className="label">総有効送信数:</span>
              <span className="value">{totalValid}件</span>
            </div>
            <div className="summary-item">
              <span className="label">返信率:</span>
              <span className="value">{replyRate}%</span>
            </div>
            <div className="summary-item">
              <span className="label">面談率:</span>
              <span className="value">{meetingRate}%</span>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? '保存中...' : '保存'}
          </button>
          {saved && <span className="success-message">✅ 保存しました！</span>}
        </div>
      </form>
    </div>
  );
};

export default EnhancedDailyInputV2;