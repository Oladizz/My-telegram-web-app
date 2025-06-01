import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage/HomePage';
import TasksPage from './components/TasksPage/TasksPage';
import ReferralPage from './components/ReferralPage/ReferralPage';
import PurchasePage from './components/PurchasePage/PurchasePage';
import LeaderboardPage from './components/LeaderboardPage/LeaderboardPage';
import AdminPage from './components/Admin/AdminPage';
import PromotionalPage from './components/PromotionalPage/PromotionalPage';
import ProfilePage from './components/ProfilePage/ProfilePage'; // Import ProfilePage
import NavigationBar from './components/Navigation/NavigationBar';
import './App.css';

// Placeholder for sending notifications to the bot
export const sendNotificationToBot = (userId, messageType, eventData = {}) => {
  console.log(`Simulating sending notification to bot for user ${userId}:`);
  console.log(`  Message Type: ${messageType}`);
  console.log(`  Event Data: `, eventData);
  // alert(`Simulated notification trigger: ${messageType} for user ${userId}`);
  // Alert can be noisy, console log is usually enough for simulation
  // In a real scenario, this would make an API call to your bot's backend.
};

// Function to request write access if needed
const requestWriteAccessIfNeeded = async () => {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    if (tg.initDataUnsafe?.user?.id) { // Check if user context is available
      console.log("Requesting write access to send messages to the bot...");
      tg.requestWriteAccess((accessGranted) => {
        if (accessGranted) {
          console.log("Write access granted. App can now send messages to the bot.");
          // You could store this status, e.g., in localStorage or state
          // localStorage.setItem('tgWriteAccessGranted', 'true');
        } else {
          console.warn("Write access denied by user or platform.");
          // localStorage.setItem('tgWriteAccessGranted', 'false');
        }
      });
    } else {
      console.log("User ID not available, skipping requestWriteAccess.");
    }
  } else {
    console.log("Telegram WebApp environment not found, skipping requestWriteAccess.");
  }
};


function App() {
  const [userData, setUserData] = useState(null); // This state seems local to App.js header

  useEffect(() => {
    const tg = window.Telegram.WebApp;
    if (tg) {
      tg.ready();
      console.log("Telegram WebApp is ready.");
      const user = tg.initDataUnsafe?.user;
      if (user && user.id) { // Check for user.id specifically
        setUserData(user); // For the header display
        console.log("User data loaded:", user);
        requestWriteAccessIfNeeded(); // Request write access after user is identified
      } else {
        console.warn("Telegram user data or user.id not available on init.");
        // Handle cases where user data might not be immediately available or app is outside Telegram
      }
    } else {
      console.error("Telegram WebApp object not found.");
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
            <Route path="/promo" element={<PromotionalPage />} />
            <Route path="/profile" element={<ProfilePage />} /> {/* Add ProfilePage route */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
