import { useState, useEffect } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LabelList
} from 'recharts';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { API_BASE_URL } from '../config';
import './DashboardV4.css';

interface GoalProgress {
  goals: any;
  actuals: {
    emails_manual: number;
    emails_outsource: number;
    replies: number;
    meetings: number;
    deals: number;
    projects: number;
  };
  progress: {
    emails_manual: string;
    emails_outsource: string;
    replies: string;
    meetings: string;
    deals: string;
    projects: string;
  };
  daysRemaining: number;
}

const DashboardV4: React.FC = () => {
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKPI, setSelectedKPI] = useState<'all' | 'emails' | 'replies' | 'meetings' | 'deals'>('all');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay();
    // 日曜日は0なので、月曜日に調整（日曜の場合は-6、それ以外は1-dayOfWeek）
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + daysToMonday);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    try {
      const [progressResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/goals/progress/${weekStartStr}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/dashboard/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        console.log('Goal Progress Data:', progressData);
        setGoalProgress(progressData);
      }
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setDailyData(statsData.dailyData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-v4">
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>Loading Dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // KPIメトリクス
  const kpiMetrics = goalProgress ? [
    {
      id: 'emails',
      name: 'メール送信',
      icon: '📧',
      actual: goalProgress.actuals.emails_manual + goalProgress.actuals.emails_outsource,
      target: (goalProgress.goals.emails_manual_target || 0) + (goalProgress.goals.emails_outsource_target || 0),
      progress: (() => {
        const totalTarget = (goalProgress.goals.emails_manual_target || 0) + (goalProgress.goals.emails_outsource_target || 0);
        const totalActual = (goalProgress.actuals.emails_manual || 0) + (goalProgress.actuals.emails_outsource || 0);
        if (totalTarget > 0) {
          return Math.round((totalActual / totalTarget) * 100);
        }
        return 0;
      })(),
      color: '#6366f1',
      gradient: 'gradient1'
    },
    {
      id: 'replies',
      name: '返信獲得',
      icon: '💬',
      actual: goalProgress.actuals.replies,
      target: goalProgress.goals.reply_target || 0,
      progress: (() => {
        const target = goalProgress.goals.reply_target || 0;
        const actual = goalProgress.actuals.replies || 0;
        if (target > 0) {
          return Math.round((actual / target) * 100);
        }
        return 0;
      })(),
      color: '#10b981',
      gradient: 'gradient2'
    },
    {
      id: 'meetings',
      name: '打ち合わせ',
      icon: '🤝',
      actual: goalProgress.actuals.meetings,
      target: goalProgress.goals.meetings_target || 0,
      progress: (() => {
        const target = goalProgress.goals.meetings_target || 0;
        const actual = goalProgress.actuals.meetings || 0;
        if (target > 0) {
          return Math.round((actual / target) * 100);
        }
        return 0;
      })(),
      color: '#f59e0b',
      gradient: 'gradient3'
    },
    {
      id: 'deals',
      name: '成約',
      icon: '🎯',
      actual: goalProgress.actuals.deals,
      target: goalProgress.goals.deals_target || 0,
      progress: (() => {
        const target = goalProgress.goals.deals_target || 0;
        const actual = goalProgress.actuals.deals || 0;
        if (target > 0) {
          return Math.round((actual / target) * 100);
        }
        return 0;
      })(),
      color: '#ef4444',
      gradient: 'gradient4'
    }
  ] : [];

  // レーダーチャート用データ
  const radarData = kpiMetrics.map(kpi => ({
    metric: kpi.name,
    achievement: kpi.progress,
    target: 100
  }));

  // 週間パフォーマンストレンド（累積表示）
  let cumulativeData = {
    emails: 0,
    replies: 0,
    meetings: 0,
    deals: 0,
    projects: 0
  };
  
  // 日付順にソート（古い順）してから累積計算
  const sortedDailyData = [...dailyData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const weeklyTrend = sortedDailyData.map(day => {
    // 累積値を計算
    cumulativeData.emails += day.emails || 0;
    cumulativeData.replies += day.replies || 0;
    cumulativeData.meetings += day.meetings || 0;
    cumulativeData.deals += day.deals || 0;
    cumulativeData.projects += day.projects || 0;
    
    return {
      date: new Date(day.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      emails: cumulativeData.emails,
      replies: cumulativeData.replies,
      meetings: cumulativeData.meetings,
      deals: cumulativeData.deals,
      projects: cumulativeData.projects,
      // 日別の値も保持（ツールチップ用）
      dailyEmails: day.emails || 0,
      dailyReplies: day.replies || 0,
      dailyMeetings: day.meetings || 0,
      dailyDeals: day.deals || 0,
      dailyProjects: day.projects || 0
    };
  });

  // パイチャートデータ（達成/未達成の割合）
  const achievementPieData = kpiMetrics.map(kpi => ({
    name: kpi.name,
    value: kpi.actual,
    percentage: kpi.progress
  }));

  // 総合達成率（目標が設定されている項目のみで計算）
  const validMetrics = kpiMetrics.filter(kpi => kpi.target > 0);
  const overallProgress = validMetrics.length > 0
    ? Math.round(validMetrics.reduce((sum, kpi) => sum + kpi.progress, 0) / validMetrics.length)
    : 0;

  const getStatusColor = (progress: number) => {
    if (progress >= 100) return '#10b981';
    if (progress >= 70) return '#f59e0b';
    if (progress >= 50) return '#3b82f6';
    return '#ef4444';
  };

  const getStatusText = (progress: number) => {
    if (progress >= 100) return '目標達成！';
    if (progress >= 70) return '順調';
    if (progress >= 50) return '要努力';
    return '要改善';
  };

  return (
    <div className="dashboard-v4">
      {/* ヘッダー */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>KPIダッシュボード</h1>
          <p className="header-subtitle">週間パフォーマンス分析</p>
        </div>
        <div className="header-right">
          <div className="date-info">
            <span className="current-week">{(() => {
              const today = new Date();
              const dayOfWeek = today.getDay();
              const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
              
              const weekStart = new Date(today);
              weekStart.setDate(today.getDate() + daysToMonday);
              
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              
              const months = ['1月', '2月', '3月', '4月', '5月', '6月', 
                             '7月', '8月', '9月', '10月', '11月', '12月'];
              
              const startMonth = months[weekStart.getMonth()];
              const startDay = weekStart.getDate();
              const endMonth = months[weekEnd.getMonth()];
              const endDay = weekEnd.getDate();
              
              if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `今週：${startMonth}${startDay}日〜${endDay}日`;
              } else {
                return `今週：${startMonth}${startDay}日〜${endMonth}${endDay}日`;
              }
            })()}</span>
            {goalProgress && (
              <span className="days-remaining">残り {goalProgress.daysRemaining} 日</span>
            )}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="dashboard-content">
        {/* 総合スコアカード */}
        <div className="overall-score-card">
          <div className="score-header">
            <h2>総合達成率</h2>
            <span className={`status-badge ${overallProgress >= 100 ? 'success' : overallProgress >= 70 ? 'warning' : 'danger'}`}>
              {getStatusText(overallProgress)}
            </span>
          </div>
          <div className="score-display">
            <div className="circular-progress">
              <CircularProgressbar
                value={overallProgress}
                text={`${overallProgress}%`}
                styles={buildStyles({
                  pathColor: getStatusColor(overallProgress),
                  textColor: '#1f2937',
                  trailColor: '#f3f4f6',
                  textSize: '24px',
                  pathTransitionDuration: 0.5,
                })}
              />
            </div>
            <div className="score-breakdown">
              {kpiMetrics.map(kpi => (
                <div key={kpi.id} className="breakdown-item">
                  <span className="item-icon">{kpi.icon}</span>
                  <span className="item-name">{kpi.name}</span>
                  <div className="item-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${Math.min(100, kpi.progress)}%`,
                          background: kpi.color
                        }}
                      />
                    </div>
                    <span className="progress-text">{kpi.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KPIメトリクスカード */}
        <div className="kpi-metrics-grid">
          {kpiMetrics.map(kpi => (
            <div key={kpi.id} className={`kpi-metric-card ${kpi.gradient}`}>
              <div className="metric-header">
                <span className="metric-icon">{kpi.icon}</span>
                <span className="metric-name">{kpi.name}</span>
              </div>
              <div className="metric-value">
                <span className="current">{kpi.actual}</span>
                <span className="separator">/</span>
                <span className="target">{kpi.target}</span>
              </div>
              <div className="metric-progress">
                <div className="progress-ring">
                  <CircularProgressbar
                    value={kpi.progress}
                    text={`${kpi.progress}%`}
                    styles={buildStyles({
                      pathColor: '#fff',
                      textColor: '#fff',
                      trailColor: 'rgba(255, 255, 255, 0.3)',
                      textSize: '28px'
                    })}
                  />
                </div>
                <div className="progress-details">
                  <div className="detail-item">
                    <span className="label">達成率</span>
                    <span className="value">{kpi.progress}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">残り</span>
                    <span className="value">{Math.max(0, kpi.target - kpi.actual)}件</span>
                  </div>
                  {goalProgress && goalProgress.daysRemaining > 0 && (
                    <div className="detail-item">
                      <span className="label">1日あたり</span>
                      <span className="value">
                        {Math.ceil(Math.max(0, kpi.target - kpi.actual) / goalProgress.daysRemaining)}件
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* チャートセクション */}
        <div className="charts-section">
          {/* 週間トレンド */}
          <div className="chart-card trend-chart">
            <div className="chart-header">
              <h3>📈 パフォーマンス</h3>
              <div className="chart-controls">
                <button 
                  className={`control-btn ${selectedKPI === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedKPI('all')}
                >
                  全体
                </button>
                <button 
                  className={`control-btn ${selectedKPI === 'emails' ? 'active' : ''}`}
                  onClick={() => setSelectedKPI('emails')}
                >
                  メール
                </button>
                <button 
                  className={`control-btn ${selectedKPI === 'replies' ? 'active' : ''}`}
                  onClick={() => setSelectedKPI('replies')}
                >
                  返信
                </button>
                <button 
                  className={`control-btn ${selectedKPI === 'meetings' ? 'active' : ''}`}
                  onClick={() => setSelectedKPI('meetings')}
                >
                  打ち合わせ
                </button>
                <button 
                  className={`control-btn ${selectedKPI === 'deals' ? 'active' : ''}`}
                  onClick={() => setSelectedKPI('deals')}
                >
                  成約
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={weeklyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.2}/>
                  </linearGradient>
                  <linearGradient id="colorDeals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.2}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  stroke="#9ca3af"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: 'none',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  labelStyle={{ color: '#1f2937', fontWeight: 600, marginBottom: '8px' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                {selectedKPI === 'all' && (
                  <>
                    <Line 
                      type="monotone" 
                      dataKey="emails" 
                      stroke="#6366f1" 
                      strokeWidth={3} 
                      name="メール" 
                      dot={{ fill: '#6366f1', r: 4 }}
                      activeDot={{ r: 6 }}
                      strokeDasharray="0"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="replies" 
                      stroke="#ec4899" 
                      strokeWidth={3} 
                      name="返信獲得" 
                      dot={{ fill: '#ec4899', r: 4 }}
                      activeDot={{ r: 6 }}
                      strokeDasharray="5 5"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="meetings" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      name="打ち合わせ" 
                      dot={{ fill: '#10b981', r: 4 }}
                      activeDot={{ r: 6 }}
                      strokeDasharray="0"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="deals" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      name="成約" 
                      dot={{ fill: '#f59e0b', r: 4 }}
                      activeDot={{ r: 6 }}
                      strokeDasharray="8 3"
                    />
                  </>
                )}
                {selectedKPI === 'emails' && (
                  <Line type="monotone" dataKey="emails" stroke="#6366f1" strokeWidth={3} name="メール" dot={{ fill: '#6366f1', r: 5 }} activeDot={{ r: 7 }} />
                )}
                {selectedKPI === 'replies' && (
                  <Line type="monotone" dataKey="replies" stroke="#ec4899" strokeWidth={3} name="返信獲得" dot={{ fill: '#ec4899', r: 5 }} activeDot={{ r: 7 }} />
                )}
                {selectedKPI === 'meetings' && (
                  <Line type="monotone" dataKey="meetings" stroke="#10b981" strokeWidth={3} name="打ち合わせ" dot={{ fill: '#10b981', r: 5 }} activeDot={{ r: 7 }} />
                )}
                {selectedKPI === 'deals' && (
                  <Line type="monotone" dataKey="deals" stroke="#f59e0b" strokeWidth={3} name="成約" dot={{ fill: '#f59e0b', r: 5 }} activeDot={{ r: 7 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* レーダーチャート */}
          <div className="chart-card balance-chart">
            <div className="chart-header">
              <h3>🎯 達成バランス</h3>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData} margin={{ top: 60, right: 60, bottom: 40, left: 60 }}>
                <PolarGrid 
                  stroke="#e5e7eb" 
                  strokeDasharray="3 3"
                  radialLines={false}
                />
                <PolarAngleAxis 
                  dataKey="metric" 
                  stroke="#6b7280"
                  tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 600 }}
                  className="radar-labels"
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 150]} 
                  stroke="#d1d5db"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                  tickCount={4}
                />
                <Radar 
                  name="目標ライン" 
                  dataKey="target" 
                  stroke="#9ca3af" 
                  fill="#d1d5db" 
                  fillOpacity={0.3}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Radar 
                  name="達成率" 
                  dataKey="achievement" 
                  stroke="#6366f1" 
                  fill="#6366f1" 
                  fillOpacity={0.7}
                  strokeWidth={3}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: 'none',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  formatter={(value: any) => `${value}%`}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="rect"
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 達成率分布 */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>📊 KPI別実績</h3>
            </div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart 
                data={kpiMetrics} 
                margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="actual" fill="#6366f1" radius={[8, 8, 0, 0]} name="実績" />
                <Bar dataKey="target" fill="#9ca3af" radius={[8, 8, 0, 0]} name="目標" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* コンバージョンファネル */}
        <div className="conversion-funnel">
          <h3>🔄 コンバージョンファネル</h3>
          <div className="funnel-stages">
            {goalProgress && (
              <>
                <div className="funnel-stage">
                  <div className="stage-header">
                    <span className="stage-name">メール送信</span>
                    <span className="stage-value">
                      {goalProgress.actuals.emails_manual + goalProgress.actuals.emails_outsource}
                    </span>
                  </div>
                  <div className="stage-bar full"></div>
                </div>
                <div className="funnel-arrow">→</div>
                <div className="funnel-stage">
                  <div className="stage-header">
                    <span className="stage-name">返信獲得</span>
                    <span className="stage-value">{goalProgress.actuals.replies}</span>
                  </div>
                  <div className="stage-bar" style={{width: '75%'}}></div>
                  <div className="conversion-rate">
                    {((goalProgress.actuals.replies / (goalProgress.actuals.emails_manual + goalProgress.actuals.emails_outsource || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="funnel-arrow">→</div>
                <div className="funnel-stage">
                  <div className="stage-header">
                    <span className="stage-name">打ち合わせ</span>
                    <span className="stage-value">{goalProgress.actuals.meetings}</span>
                  </div>
                  <div className="stage-bar" style={{width: '50%'}}></div>
                  <div className="conversion-rate">
                    打ち合わせ率: {((goalProgress.actuals.meetings / (goalProgress.actuals.replies || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="funnel-arrow">→</div>
                <div className="funnel-stage">
                  <div className="stage-header">
                    <span className="stage-name">成約</span>
                    <span className="stage-value">{goalProgress.actuals.deals}</span>
                  </div>
                  <div className="stage-bar" style={{width: '25%'}}></div>
                  <div className="conversion-rate">
                    {((goalProgress.actuals.deals / (goalProgress.actuals.meetings || 1)) * 100).toFixed(1)}%
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Date.prototype拡張
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function() {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
};

export default DashboardV4;