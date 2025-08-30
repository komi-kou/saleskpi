import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Navigation.css';

const Navigation: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        <h1>営業KPI管理</h1>
        
        <button 
          className={`hamburger ${menuOpen ? 'active' : ''}`} 
          onClick={toggleMenu}
          aria-label="メニュー"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
          <Link to="/dashboard" onClick={handleLinkClick}>ダッシュボード</Link>
          <Link to="/goals" onClick={handleLinkClick}>目標設定</Link>
          <Link to="/daily-input" onClick={handleLinkClick}>日次入力</Link>
          <Link to="/weekly-review" onClick={handleLinkClick}>週次レビュー</Link>
          <Link to="/export" onClick={handleLinkClick}>エクスポート</Link>
          <Link to="/settings" onClick={handleLinkClick}>設定</Link>
          
          <div className="mobile-user-info">
            <span>{user.name}</span>
            <button onClick={handleLogout}>ログアウト</button>
          </div>
        </div>
        
        <div className="nav-user">
          <span>{user.name}</span>
          <button onClick={handleLogout}>ログアウト</button>
        </div>
      </div>
      
      {menuOpen && <div className="overlay" onClick={toggleMenu}></div>}
    </nav>
  );
};

export default Navigation;