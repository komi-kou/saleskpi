import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './Auth.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState(localStorage.getItem('savedEmail') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(localStorage.getItem('rememberMe') === 'true');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // ログイン情報を保存
        if (rememberMe) {
          localStorage.setItem('savedEmail', email);
          localStorage.setItem('rememberMe', 'true');
        } else {
          localStorage.removeItem('savedEmail');
          localStorage.setItem('rememberMe', 'false');
        }
        
        // 成功メッセージを表示してからリダイレクト
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        setError(data.error || 'ログインに失敗しました');
      }
    } catch (err) {
      setError('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>営業KPI管理ツール</h2>
        <h3>ログイン</h3>
        {error && <div className="error-message">⚠️ {error}</div>}
        {success && (
          <div className="success-message">
            ✅ ログイン成功！ダッシュボードへ移動します...
          </div>
        )}
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className="remember-me">
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>ログイン情報を保存</span>
          </label>
        </div>
        <button type="submit" disabled={loading || success}>
          {loading ? 'ログイン中...' : success ? 'リダイレクト中...' : 'ログイン'}
        </button>
        <p>
          アカウントをお持ちでない方は{' '}
          <Link to="/register">新規登録</Link>
        </p>
        <div className="demo-info">
          <p className="demo-title">🔑 デモアカウント</p>
          <p>Email: demo@example.com</p>
          <p>Password: demo123</p>
        </div>
      </form>
    </div>
  );
};

export default Login;