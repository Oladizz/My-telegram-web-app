import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage/HomePage';
import TasksPage from './components/TasksPage/TasksPage';
import ReferralPage from './components/ReferralPage/ReferralPage';
import PurchasePage from './components/PurchasePage/PurchasePage';
import LeaderboardPage from './components/LeaderboardPage/LeaderboardPage';
import AdminPage from './components/Admin/AdminPage';
import NavigationBar from './components/Navigation/NavigationBar';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <NavigationBar /> {/* Place it here */}
        <main className="content"> {/* Optional: wrap content */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/referrals" element={<ReferralPage />} />
            <Route path="/purchase" element={<PurchasePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
