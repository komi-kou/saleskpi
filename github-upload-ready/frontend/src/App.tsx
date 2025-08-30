import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import DashboardV4 from './components/DashboardV4';
import GoalSettingV2 from './components/GoalSettingV2';
import EnhancedDailyInputV2 from './components/EnhancedDailyInputV2';
import WeeklyReviewV2 from './components/WeeklyReviewV2';
import DataExport from './components/DataExport';
import SettingsEnhanced from './components/SettingsEnhanced';
import Navigation from './components/Navigation';
import './App.css';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <div className="App">
        {isAuthenticated && <Navigation />}
        <Routes>
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={isAuthenticated ? <DashboardV4 /> : <Navigate to="/login" />} />
          <Route path="/goals" element={isAuthenticated ? <GoalSettingV2 /> : <Navigate to="/login" />} />
          <Route path="/daily-input" element={isAuthenticated ? <EnhancedDailyInputV2 /> : <Navigate to="/login" />} />
          <Route path="/weekly-review" element={isAuthenticated ? <WeeklyReviewV2 /> : <Navigate to="/login" />} />
          <Route path="/export" element={isAuthenticated ? <DataExport /> : <Navigate to="/login" />} />
          <Route path="/settings" element={isAuthenticated ? <SettingsEnhanced /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;