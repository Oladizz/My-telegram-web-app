import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage/HomePage';
import TasksPage from './components/TasksPage/TasksPage';
import ReferralPage from './components/ReferralPage/ReferralPage';
import PurchasePage from './components/PurchasePage/PurchasePage';
import LeaderboardPage from './components/LeaderboardPage/LeaderboardPage';
import AdminPage from './components/Admin/AdminPage';
import PromotionalPage from './components/PromotionalPage/PromotionalPage'; // Import PromotionalPage
import NavigationBar from './components/Navigation/NavigationBar';
import './App.css';

function App() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    const user = tg.initDataUnsafe?.user;
    if (user) {
      setUserData(user);
    }
  }, []);

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Mining Game</h1>
          {userData && <p>Welcome, {userData?.firstName || 'User'}</p>}
        </header>
        <NavigationBar /> {/* Place it here */}
        <main className="content"> {/* Optional: wrap content */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/referrals" element={<ReferralPage />} />
            <Route path="/purchase" element={<PurchasePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/promo" element={<PromotionalPage />} /> {/* Add PromotionalPage route */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
