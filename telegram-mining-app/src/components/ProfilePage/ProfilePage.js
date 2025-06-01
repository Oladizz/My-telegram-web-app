import React, { useState, useEffect, useCallback } from 'react';
import './ProfilePage.css';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getCountFromServer, updateDoc } from "firebase/firestore"; // Added updateDoc

// Assuming BASE_MINING_RATE_PER_DAY is defined somewhere accessible or define it here
const BASE_MINING_RATE_PER_DAY = 12;
const PREDEFINED_COLORS = [
  { name: 'Neon Green', value: '#39FF14' },
  { name: 'Electric Blue', value: '#00FFFF' },
  { name: 'Hot Pink', value: '#FF00FF' },
  { name: 'Solar Yellow', value: '#FFFF00' },
  { name: 'Classic White', value: '#FFFFFF' },
];

function ProfilePage() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [userStats, setUserStats] = useState({
    points: 0,
    tasksCompleted: 0,
    referralsMade: 0,
    miningRateModifier: 1.0,
    calculatedMiningRate: BASE_MINING_RATE_PER_DAY,
    displayColor: '#39FF14', // Default neon green
    username: '',
    firstName: '',
    userId: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [isSavingColor, setIsSavingColor] = useState(false);
  const [colorSaveMessage, setColorSaveMessage] = useState('');


  // Get Telegram User Info
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    const user = tg.initDataUnsafe?.user;
    if (user && user.id) {
      setTelegramUser(user);
    } else {
      setError("Unable to identify Telegram user. Please try launching from Telegram.");
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfileData = useCallback(async (userId) => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    setColorSaveMessage(''); // Clear previous save messages
    try {
      let fetchedStats = {
        points: 0,
        tasksCompleted: 0,
        referralsMade: 0,
        miningRateModifier: 1.0,
        calculatedMiningRate: BASE_MINING_RATE_PER_DAY,
        displayColor: '#39FF14', // Default
        username: '',
        firstName: '',
        userId: String(userId)
      };

      // Fetch User Document
      const userRef = doc(db, 'users', String(userId));
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        fetchedStats.points = userData.points || 0;
        fetchedStats.miningRateModifier = userData.miningRateModifier || 1.0;
        fetchedStats.calculatedMiningRate = BASE_MINING_RATE_PER_DAY * (userData.miningRateModifier || 1.0);
        fetchedStats.displayColor = userData.displayColor || PREDEFINED_COLORS[0].value; // Default to first predefined color
        fetchedStats.username = userData.username || '';
        fetchedStats.firstName = userData.firstName || 'User';
        setSelectedColor(fetchedStats.displayColor); // Initialize selectedColor
      } else {
        console.warn("User document not found for ID:", userId);
        if(telegramUser){ // Use TG data if Firestore doc doesn't exist
            fetchedStats.username = telegramUser.username || '';
            fetchedStats.firstName = telegramUser.first_name || 'User';
        }
        setSelectedColor(PREDEFINED_COLORS[0].value); // Default if no user doc
      }

      // Fetch Tasks Completed Count
      const completedTasksCol = collection(db, 'users', String(userId), 'completedTasks');
      const completedTasksSnapshot = await getCountFromServer(completedTasksCol);
      fetchedStats.tasksCompleted = completedTasksSnapshot.data().count;

      // Fetch Referrals Made Count
      const referralsQuery = query(collection(db, 'users'), where('referredBy', '==', String(userId)));
      const referralsSnapshot = await getCountFromServer(referralsQuery);
      fetchedStats.referralsMade = referralsSnapshot.data().count;

      setUserStats(fetchedStats);

    } catch (e) {
      console.error("Error fetching user profile data:", e);
      setError("Failed to load profile data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [telegramUser]); // Add telegramUser to dependencies

  useEffect(() => {
    if (telegramUser && telegramUser.id) {
      fetchUserProfileData(telegramUser.id);
    }
  }, [telegramUser, fetchUserProfileData]);

  if (isLoading) {
    return <div className="profile-page"><div className="loading-spinner"></div><p>Loading profile...</p></div>;
  }

  if (error) {
    return <div className="profile-page"><p className="error-message">{error}</p></div>;
  }

  if (!telegramUser) {
     return <div className="profile-page"><p className="error-message">User information not available.</p></div>;
  }

  const handleColorChange = (e) => {
    setSelectedColor(e.target.value);
    setColorSaveMessage(''); // Clear message when color changes
  };

  const saveDisplayColor = async () => {
    if (!telegramUser || !telegramUser.id || !selectedColor) {
      setColorSaveMessage('Could not save color. User or color not selected.');
      return;
    }
    setIsSavingColor(true);
    setColorSaveMessage('');
    try {
      const userRef = doc(db, 'users', String(telegramUser.id));
      await updateDoc(userRef, { displayColor: selectedColor });
      setUserStats(prevStats => ({ ...prevStats, displayColor: selectedColor }));
      setColorSaveMessage('Display color saved successfully!');
    } catch (e) {
      console.error("Error saving display color:", e);
      setColorSaveMessage('Failed to save display color.');
    } finally {
      setIsSavingColor(false);
    }
  };

  return (
    <div className="profile-page">
      <h2 style={{ color: userStats.displayColor }}>{userStats.firstName || userStats.username || 'Your'}'s Profile</h2>

      <section className="profile-stats-section">
        <h3>Statistics</h3>
        <div className="stat-item">Telegram User ID: <strong>{userStats.userId}</strong></div>
        <div className="stat-item">Username: <strong>@{userStats.username || 'N/A'}</strong></div>
        <div className="stat-item">Total Points: <strong>{userStats.points.toLocaleString()}</strong></div>
        <div className="stat-item">Tasks Completed: <strong>{userStats.tasksCompleted}</strong></div>
        <div className="stat-item">Friends Referred: <strong>{userStats.referralsMade}</strong></div>
        <div className="stat-item">Mining Rate Modifier: <strong>x{userStats.miningRateModifier.toFixed(2)}</strong></div>
        <div className="stat-item">Effective Mining Rate: <strong>{userStats.calculatedMiningRate.toFixed(2)} points/24h</strong></div>
      </section>

      <section className="profile-customization-section">
        <h3>Customize Your Profile</h3>
        <div className="color-selector-container">
          <label htmlFor="colorSelect">Display Name Color:</label>
          <select id="colorSelect" value={selectedColor} onChange={handleColorChange} className="color-select">
            {PREDEFINED_COLORS.map(color => (
              <option key={color.value} value={color.value} style={{ color: color.value }}>
                {color.name}
              </option>
            ))}
          </select>
          <button onClick={saveDisplayColor} disabled={isSavingColor || userStats.displayColor === selectedColor} className="save-color-button">
            {isSavingColor ? 'Saving...' : 'Save Color'}
          </button>
        </div>
        {colorSaveMessage && (
          <p className={`save-message ${colorSaveMessage.includes('Failed') ? 'error-message' : 'success-message'}`}>
            {colorSaveMessage}
          </p>
        )}
        <p>Preview:</p>
        <div className="color-preview" style={{ color: selectedColor, borderColor: selectedColor }}>
          {userStats.firstName || userStats.username || 'Sample Name'}
        </div>
      </section>
    </div>
  );
}

export default ProfilePage;
