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
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

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

  const generateAIAnalysis = () => {
    if (!summary || !goals) return null;

    const analysis = {
      strengths: [] as string[],
      weaknesses: [] as string[],
      opportunities: [] as string[],
      actionItems: [] as string[],
    };

    // 送信数の分析
    const emailManualRate = (summary.total_emails_manual / goals.emails_manual_target) * 100;
    const emailOutsourceRate = (summary.total_emails_outsource / goals.emails_outsource_target) * 100;
    
    if (emailManualRate >= 100) {
      analysis.strengths.push('手動送信の目標を達成しています');
    } else if (emailManualRate < 60) {
      analysis.weaknesses.push('手動送信数が大幅に不足しています');
      analysis.actionItems.push('1日の送信スケジュールを見直し、午前中に集中的に送信する');
    }

    // 返信率の分析
    if (summary.reply_rate >= goals.reply_rate_target) {
      analysis.strengths.push(`返信率が目標を上回っています（${summary.reply_rate.toFixed(2)}%）`);
    } else {
      analysis.weaknesses.push(`返信率が目標未達です（目標: ${goals.reply_rate_target}%、実績: ${summary.reply_rate.toFixed(2)}%）`);
      analysis.actionItems.push('メールタイトルをより具体的な価値提案に変更');
      analysis.actionItems.push('送信時間を火曜〜木曜の10-11時に集中');
    }

    // 面談率の分析
    if (summary.meeting_rate >= goals.meeting_rate_target) {
      analysis.strengths.push('返信から面談への転換率が良好です');
    } else {
      analysis.weaknesses.push('面談獲得率の改善が必要です');
      analysis.actionItems.push('初回返信から24時間以内にフォローアップ');
      analysis.actionItems.push('カレンダーリンクを活用して予約を簡略化');
    }

    // 成約率の分析
    if (summary.deal_rate >= goals.deal_rate_target) {
      analysis.strengths.push('高い成約率を維持しています');
    } else if (summary.total_meetings > 0) {
      analysis.weaknesses.push('面談からの成約率向上が課題です');
      analysis.actionItems.push('面談前の事前準備を強化（企業研究・課題仮説）');
      analysis.actionItems.push('デモンストレーションの質を向上');
    }

    // エンゲージメントの分析
    if (summary.slide_view_rate >= goals.slide_view_rate_target) {
      analysis.strengths.push('資料の訴求力が高い');
    } else {
      analysis.opportunities.push('資料のサムネイルやタイトルを改善することで視聴率向上が期待できます');
    }

    // 日別パフォーマンスの分析
    if (summary.daily_data && summary.daily_data.length > 0) {
      const dailyReplies = summary.daily_data.map(d => d.replies_received || 0);
      const maxReplies = Math.max(...dailyReplies);
      const maxDay = summary.daily_data.find(d => d.replies_received === maxReplies);
      if (maxDay) {
        analysis.opportunities.push(`${format(new Date(maxDay.date), 'EEEE', { locale: ja })}の反応が最も良い傾向があります`);
      }
    }

    return analysis;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = direction === 'prev' 
      ? subWeeks(new Date(weekStart), 1)
      : addWeeks(new Date(weekStart), 1);
    setWeekStart(format(startOfWeek(newWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  };

  if (loading) return <div className="loading">読み込み中...</div>;

  const analysis = generateAIAnalysis();

  return (
    <div className="weekly-review-v2">
      <h2>週次レビュー＆分析</h2>
      
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

          {/* AI分析セクション */}
          <div className="ai-analysis-section">
            <div className="section-header">
              <h3>🤖 AI分析レポート</h3>
              <button 
                onClick={() => setShowAIAnalysis(!showAIAnalysis)}
                className="toggle-btn"
              >
                {showAIAnalysis ? '隠す' : '表示'}
              </button>
            </div>

            {showAIAnalysis && analysis && (
              <div className="analysis-content">
                {analysis.strengths.length > 0 && (
                  <div className="analysis-block strengths">
                    <h4>💪 強み</h4>
                    <ul>
                      {analysis.strengths.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.weaknesses.length > 0 && (
                  <div className="analysis-block weaknesses">
                    <h4>⚠️ 改善点</h4>
                    <ul>
                      {analysis.weaknesses.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.opportunities.length > 0 && (
                  <div className="analysis-block opportunities">
                    <h4>💡 機会</h4>
                    <ul>
                      {analysis.opportunities.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.actionItems.length > 0 && (
                  <div className="analysis-block action-items">
                    <h4>📝 アクションアイテム</h4>
                    <ul>
                      {analysis.actionItems.map((item, idx) => (
                        <li key={idx}>
                          <input type="checkbox" id={`action-${idx}`} />
                          <label htmlFor={`action-${idx}`}>{item}</label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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