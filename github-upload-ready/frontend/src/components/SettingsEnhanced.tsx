import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './SettingsEnhanced.css';

interface UserSettings {
  discordWebhook: string;
  emailNotifications: boolean;
  weeklyReminders: boolean;
  dailyReminders: boolean;
  reminderTime: string;
}

const SettingsEnhanced: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    discordWebhook: '',
    emailNotifications: true,
    weeklyReminders: true,
    dailyReminders: true,
    reminderTime: '18:00'
  });
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState('');

  // 設定を取得
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 設定を保存
  const handleSave = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Discord通知テスト
  const testDiscordNotification = async () => {
    setTesting(true);
    setTestResult('');
    
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/discord/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          webhook: settings.discordWebhook,
          message: testMessage || 'KPIトラッカーからのテスト通知です'
        })
      });
      
      if (response.ok) {
        setTestResult('✅ Discord通知が正常に送信されました');
      } else {
        setTestResult('❌ Discord通知の送信に失敗しました');
      }
    } catch (error) {
      setTestResult('❌ エラーが発生しました');
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(''), 5000);
    }
  };

  const handleChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading && !saved) {
    return (
      <div className="settings-v4">
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>設定を読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-v4">
      <div className="settings-header">
        <div className="header-content">
          <h1 className="page-title">
            <span className="title-icon">⚙️</span>
            設定
          </h1>
          <p className="page-subtitle">通知とリマインダーの設定を管理</p>
        </div>
      </div>

      {saved && (
        <div className="success-toast">
          <div className="toast-content">
            <span className="toast-icon">✅</span>
            <span>設定が正常に保存されました</span>
          </div>
        </div>
      )}

      <div className="settings-grid">
        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">🔔</span>
              Discord連携
            </h2>
          </div>
          
          <div className="card-content">
            <div className="form-group">
              <label className="form-label">Webhook URL</label>
              <input
                type="text"
                value={settings.discordWebhook}
                onChange={(e) => handleChange('discordWebhook', e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                className="form-input"
              />
              <p className="help-text">
                Discord サーバーの設定 → 連携サービス → Webhook から取得できます
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">テストメッセージ</label>
              <div className="test-group">
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="テスト通知のメッセージを入力"
                  className="form-input"
                />
                <button
                  onClick={testDiscordNotification}
                  disabled={testing || !settings.discordWebhook}
                  className="test-button"
                >
                  {testing ? (
                    <>
                      <span className="button-spinner"></span>
                      送信中...
                    </>
                  ) : (
                    '通知をテスト'
                  )}
                </button>
              </div>
              {testResult && (
                <div className={`test-result ${testResult.includes('✅') ? 'success' : 'error'}`}>
                  {testResult}
                </div>
              )}
            </div>

            <div className="webhook-guide">
              <h4>Webhook URLの取得方法</h4>
              <ol>
                <li>Discordサーバーの設定を開く</li>
                <li>「連携サービス」→「Webhook」を選択</li>
                <li>「新しいWebhook」をクリック</li>
                <li>名前とチャンネルを設定</li>
                <li>「Webhook URLをコピー」をクリック</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">⏰</span>
              リマインダー設定
            </h2>
          </div>
          
          <div className="card-content">
            <div className="checkbox-group">
              <label className="checkbox-label disabled">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <div className="checkbox-text">
                  <span className="checkbox-title">日次入力リマインダー</span>
                  <span className="checkbox-description">毎日指定時刻にKPI入力を通知</span>
                </div>
              </label>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label disabled">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <div className="checkbox-text">
                  <span className="checkbox-title">週次レビューリマインダー</span>
                  <span className="checkbox-description">毎週金曜日に週次レビューを通知</span>
                </div>
              </label>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label disabled">
                <input
                  type="checkbox"
                  checked={true}
                  disabled
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <div className="checkbox-text">
                  <span className="checkbox-title">目標達成通知</span>
                  <span className="checkbox-description">KPI目標を達成した際に通知</span>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">リマインダー時刻（固定）</label>
              <div className="help-text">
                日次入力: 毎日 18:00 / 週次レビュー: 金曜 17:00
              </div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h2 className="card-title">
              <span className="card-icon">📊</span>
              通知プレビュー
            </h2>
          </div>
          
          <div className="card-content">
            <div className="preview-group">
              <h4>日次リマインダーの例</h4>
              <div className="preview-box">
                <div className="preview-content">
                  📝 本日のKPI入力をお忘れなく！<br/>
                  現在の進捗: 送信数 45/150件（30%）<br/>
                  <a href="#" className="preview-link">入力はこちら →</a>
                </div>
              </div>
            </div>

            <div className="preview-group">
              <h4>達成通知の例</h4>
              <div className="preview-box">
                <div className="preview-content">
                  🎉 週次目標を達成しました！<br/>
                  メール送信: 156/150件（104%）<br/>
                  返信率: 2.1%（目標: 1.5%）<br/>
                  素晴らしいパフォーマンスです！
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button onClick={handleSave} disabled={loading} className="save-button">
          {loading ? (
            <>
              <span className="button-spinner"></span>
              保存中...
            </>
          ) : (
            <>
              <span className="button-icon">💾</span>
              設定を保存
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SettingsEnhanced;