import { useState, useEffect } from 'react';
import { format, startOfWeek } from 'date-fns';
import './GoalSettingV2.css';
import { API_BASE_URL } from '../config';

interface KPIGoals {
  emails_manual_target: string;
  emails_outsource_target: string;
  valid_emails_manual_target: string;
  valid_emails_outsource_target: string;
  reply_target: string;
  reply_rate_target: string;
  meetings_target: string;
  meeting_rate_target: string;
  deals_target: string;
  deal_rate_target: string;
  projects_target: string;
  project_rate_target: string;
  ongoing_projects_target: string;
  slide_views_target: string;
  slide_view_rate_target: string;
  video_views_target: string;
  video_view_rate_target: string;
}

// 推奨値とヒント
const RECOMMENDATIONS = {
  emails_manual_target: { value: 150, hint: '1日30件×5日の計算' },
  emails_outsource_target: { value: 2250, hint: '外注による大量送信' },
  valid_emails_manual_target: { value: 150, hint: '到達率100%を目指す' },
  valid_emails_outsource_target: { value: 1350, hint: '到達率60%程度' },
  reply_target: { value: 22, hint: '有効送信の1.5%程度' },
  reply_rate_target: { value: 1.5, hint: '業界平均1-2%' },
  meetings_target: { value: 8, hint: '返信の35%程度' },
  meeting_rate_target: { value: 36, hint: '返信からの転換率' },
  deals_target: { value: 6, hint: '面談の75%程度' },
  deal_rate_target: { value: 75, hint: '面談からの成約率' },
  projects_target: { value: 2, hint: '成約の30%程度' },
  project_rate_target: { value: 25, hint: '成約からの案件化率' },
  ongoing_projects_target: { value: 2, hint: '継続的な案件数' },
  slide_views_target: { value: 25, hint: '有効送信の1.5%程度' },
  slide_view_rate_target: { value: 15, hint: 'エンゲージメント指標' },
  video_views_target: { value: 25, hint: '有効送信の1.5%程度' },
  video_view_rate_target: { value: 15, hint: 'エンゲージメント指標' },
};

const GoalSettingV2: React.FC = () => {
  const [weekStart, setWeekStart] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [goals, setGoals] = useState<KPIGoals>({
    emails_manual_target: '',
    emails_outsource_target: '',
    valid_emails_manual_target: '',
    valid_emails_outsource_target: '',
    reply_target: '',
    reply_rate_target: '',
    meetings_target: '',
    meeting_rate_target: '',
    deals_target: '',
    deal_rate_target: '',
    projects_target: '',
    project_rate_target: '',
    ongoing_projects_target: '',
    slide_views_target: '',
    slide_view_rate_target: '',
    video_views_target: '',
    video_view_rate_target: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    fetchCurrentGoals();
  }, [weekStart]);

  const fetchCurrentGoals = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/kpi-goals/current`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.id) {
        setGoals({
          emails_manual_target: data.emails_manual_target?.toString() || '',
          emails_outsource_target: data.emails_outsource_target?.toString() || '',
          valid_emails_manual_target: data.valid_emails_manual_target?.toString() || '',
          valid_emails_outsource_target: data.valid_emails_outsource_target?.toString() || '',
          reply_target: data.reply_target?.toString() || '',
          reply_rate_target: data.reply_rate_target?.toString() || '',
          meetings_target: data.meetings_target?.toString() || '',
          meeting_rate_target: data.meeting_rate_target?.toString() || '',
          deals_target: data.deals_target?.toString() || '',
          deal_rate_target: data.deal_rate_target?.toString() || '',
          projects_target: data.projects_target?.toString() || '',
          project_rate_target: data.project_rate_target?.toString() || '',
          ongoing_projects_target: data.ongoing_projects_target?.toString() || '',
          slide_views_target: data.slide_views_target?.toString() || '',
          slide_view_rate_target: data.slide_view_rate_target?.toString() || '',
          video_views_target: data.video_views_target?.toString() || '',
          video_view_rate_target: data.video_view_rate_target?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const token = localStorage.getItem('token');

    // 数値に変換
    const numericGoals = Object.entries(goals).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: parseFloat(value) || 0
    }), {});

    try {
      const response = await fetch(`${API_BASE_URL}/api/kpi-goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...numericGoals,
          week_start: weekStart
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
      console.error('Failed to save goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof KPIGoals, value: string) => {
    // 数値のみ許可（小数点も含む）
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setGoals(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const applyRecommendations = () => {
    const recommendedGoals: KPIGoals = {} as KPIGoals;
    Object.keys(RECOMMENDATIONS).forEach(key => {
      recommendedGoals[key as keyof KPIGoals] = RECOMMENDATIONS[key as keyof typeof RECOMMENDATIONS].value.toString();
    });
    setGoals(recommendedGoals);
  };

  const clearAll = () => {
    const emptyGoals: KPIGoals = {} as KPIGoals;
    Object.keys(goals).forEach(key => {
      emptyGoals[key as keyof KPIGoals] = '';
    });
    setGoals(emptyGoals);
  };

  const copyFromPreviousWeek = async () => {
    const previousWeek = new Date(weekStart);
    previousWeek.setDate(previousWeek.getDate() - 7);
    const previousWeekStr = format(previousWeek, 'yyyy-MM-dd');
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/kpi-goals/${previousWeekStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.id) {
        setGoals({
          emails_manual_target: data.emails_manual_target?.toString() || '',
          emails_outsource_target: data.emails_outsource_target?.toString() || '',
          valid_emails_manual_target: data.valid_emails_manual_target?.toString() || '',
          valid_emails_outsource_target: data.valid_emails_outsource_target?.toString() || '',
          reply_target: data.reply_target?.toString() || '',
          reply_rate_target: data.reply_rate_target?.toString() || '',
          meetings_target: data.meetings_target?.toString() || '',
          meeting_rate_target: data.meeting_rate_target?.toString() || '',
          deals_target: data.deals_target?.toString() || '',
          deal_rate_target: data.deal_rate_target?.toString() || '',
          projects_target: data.projects_target?.toString() || '',
          project_rate_target: data.project_rate_target?.toString() || '',
          ongoing_projects_target: data.ongoing_projects_target?.toString() || '',
          slide_views_target: data.slide_views_target?.toString() || '',
          slide_view_rate_target: data.slide_view_rate_target?.toString() || '',
          video_views_target: data.video_views_target?.toString() || '',
          video_view_rate_target: data.video_view_rate_target?.toString() || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch previous week goals:', error);
    }
  };

  return (
    <div className="goal-setting-v2">
      <h2>週次KPI目標設定</h2>
      
      <div className="week-selector">
        <label>
          対象週:
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
          />
        </label>
        <div className="quick-actions">
          <button type="button" onClick={applyRecommendations} className="btn-recommend">
            推奨値を適用
          </button>
          <button type="button" onClick={copyFromPreviousWeek} className="btn-copy">
            前週からコピー
          </button>
          <button type="button" onClick={clearAll} className="btn-clear">
            クリア
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="goal-sections">
          {/* 送信目標セクション */}
          <div className="goal-section">
            <h3>📧 送信目標</h3>
            <div className="input-grid">
              <div className="input-group">
                <label>
                  送信数(手動)
                  <input
                    type="text"
                    value={goals.emails_manual_target}
                    onChange={(e) => handleChange('emails_manual_target', e.target.value)}
                    placeholder="例: 150"
                  />
                  <span className="hint">{RECOMMENDATIONS.emails_manual_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  送信数(外注)
                  <input
                    type="text"
                    value={goals.emails_outsource_target}
                    onChange={(e) => handleChange('emails_outsource_target', e.target.value)}
                    placeholder="例: 2250"
                  />
                  <span className="hint">{RECOMMENDATIONS.emails_outsource_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  有効送信数(手動)
                  <input
                    type="text"
                    value={goals.valid_emails_manual_target}
                    onChange={(e) => handleChange('valid_emails_manual_target', e.target.value)}
                    placeholder="例: 150"
                  />
                  <span className="hint">{RECOMMENDATIONS.valid_emails_manual_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  有効送信数(外注)
                  <input
                    type="text"
                    value={goals.valid_emails_outsource_target}
                    onChange={(e) => handleChange('valid_emails_outsource_target', e.target.value)}
                    placeholder="例: 1350"
                  />
                  <span className="hint">{RECOMMENDATIONS.valid_emails_outsource_target.hint}</span>
                </label>
              </div>
            </div>
          </div>

          {/* 反応目標セクション */}
          <div className="goal-section">
            <h3>💬 反応目標</h3>
            <div className="input-grid">
              <div className="input-group">
                <label>
                  返信数
                  <input
                    type="text"
                    value={goals.reply_target}
                    onChange={(e) => handleChange('reply_target', e.target.value)}
                    placeholder="例: 22"
                  />
                  <span className="hint">{RECOMMENDATIONS.reply_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  返信率(%)
                  <input
                    type="text"
                    value={goals.reply_rate_target}
                    onChange={(e) => handleChange('reply_rate_target', e.target.value)}
                    placeholder="例: 1.5"
                  />
                  <span className="hint">{RECOMMENDATIONS.reply_rate_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  面談数
                  <input
                    type="text"
                    value={goals.meetings_target}
                    onChange={(e) => handleChange('meetings_target', e.target.value)}
                    placeholder="例: 8"
                  />
                  <span className="hint">{RECOMMENDATIONS.meetings_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  面談率(%)
                  <input
                    type="text"
                    value={goals.meeting_rate_target}
                    onChange={(e) => handleChange('meeting_rate_target', e.target.value)}
                    placeholder="例: 36"
                  />
                  <span className="hint">{RECOMMENDATIONS.meeting_rate_target.hint}</span>
                </label>
              </div>
            </div>
          </div>

          {/* 成果目標セクション */}
          <div className="goal-section">
            <h3>🎯 成果目標</h3>
            <div className="input-grid">
              <div className="input-group">
                <label>
                  成約数
                  <input
                    type="text"
                    value={goals.deals_target}
                    onChange={(e) => handleChange('deals_target', e.target.value)}
                    placeholder="例: 6"
                  />
                  <span className="hint">{RECOMMENDATIONS.deals_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  成約率(%)
                  <input
                    type="text"
                    value={goals.deal_rate_target}
                    onChange={(e) => handleChange('deal_rate_target', e.target.value)}
                    placeholder="例: 75"
                  />
                  <span className="hint">{RECOMMENDATIONS.deal_rate_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  案件数
                  <input
                    type="text"
                    value={goals.projects_target}
                    onChange={(e) => handleChange('projects_target', e.target.value)}
                    placeholder="例: 2"
                  />
                  <span className="hint">{RECOMMENDATIONS.projects_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  案件化率(%)
                  <input
                    type="text"
                    value={goals.project_rate_target}
                    onChange={(e) => handleChange('project_rate_target', e.target.value)}
                    placeholder="例: 25"
                  />
                  <span className="hint">{RECOMMENDATIONS.project_rate_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  継続案件数
                  <input
                    type="text"
                    value={goals.ongoing_projects_target}
                    onChange={(e) => handleChange('ongoing_projects_target', e.target.value)}
                    placeholder="例: 2"
                  />
                  <span className="hint">{RECOMMENDATIONS.ongoing_projects_target.hint}</span>
                </label>
              </div>
            </div>
          </div>

          {/* エンゲージメント目標セクション */}
          <div className="goal-section">
            <h3>📊 エンゲージメント目標</h3>
            <div className="input-grid">
              <div className="input-group">
                <label>
                  スライド視聴数
                  <input
                    type="text"
                    value={goals.slide_views_target}
                    onChange={(e) => handleChange('slide_views_target', e.target.value)}
                    placeholder="例: 25"
                  />
                  <span className="hint">{RECOMMENDATIONS.slide_views_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  スライド視聴率(%)
                  <input
                    type="text"
                    value={goals.slide_view_rate_target}
                    onChange={(e) => handleChange('slide_view_rate_target', e.target.value)}
                    placeholder="例: 15"
                  />
                  <span className="hint">{RECOMMENDATIONS.slide_view_rate_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  動画視聴数
                  <input
                    type="text"
                    value={goals.video_views_target}
                    onChange={(e) => handleChange('video_views_target', e.target.value)}
                    placeholder="例: 25"
                  />
                  <span className="hint">{RECOMMENDATIONS.video_views_target.hint}</span>
                </label>
              </div>
              <div className="input-group">
                <label>
                  動画視聴率(%)
                  <input
                    type="text"
                    value={goals.video_view_rate_target}
                    onChange={(e) => handleChange('video_view_rate_target', e.target.value)}
                    placeholder="例: 15"
                  />
                  <span className="hint">{RECOMMENDATIONS.video_view_rate_target.hint}</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-save">
            {loading ? '保存中...' : '目標を保存'}
          </button>
          {saved && <span className="success-message">✅ 目標を保存しました！</span>}
        </div>
      </form>
    </div>
  );
};

export default GoalSettingV2;