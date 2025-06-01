import React, { useState, useEffect, useCallback } from 'react';
import './ReferralPage.css';
import { db } from '../../firebaseConfig'; // Adjusted path
// Firebase functions that *might* be used here or in backend:
// import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, writeBatch } from "firebase/firestore";

// Constants - Bot username and Mini App name should be configured elsewhere ideally
const YOUR_BOT_USERNAME = "your_test_bot"; // Replace with your actual bot username
const YOUR_MINI_APP_NAME = "your_mini_app"; // Replace with your Mini App name (from BotFather)

function ReferralPage() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [referredUsersCount, setReferredUsersCount] = useState(0); // Mocked for now
  const [pointsEarnedFromReferrals, setPointsEarnedFromReferrals] = useState(0); // Mocked for now
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Get Telegram User Info
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    const user = tg.initDataUnsafe?.user;

    if (user && user.id) {
      setTelegramUser(user);
      const userReferralCode = `ref_${user.id}`; // Or just user.id
      setReferralCode(userReferralCode);
      // Construct the referral link: https://t.me/YOUR_BOT_USERNAME/YOUR_MINI_APP_NAME?startapp=REFERRAL_CODE
      setReferralLink(`https://t.me/${YOUR_BOT_USERNAME}/${YOUR_MINI_APP_NAME}?startapp=${userReferralCode}`);
      setIsLoading(false);
    } else {
      setError("Unable to identify Telegram user. Please try launching from Telegram.");
      setIsLoading(false);
      console.warn("Telegram user data not available or user ID is missing.");
    }
  }, []);

  // Mock fetchReferralData - In a real app, this would query Firestore
  const fetchReferralData = useCallback(async (userId) => {
    if (!userId) return;
    // setIsLoading(true); // Assuming this is part of a larger loading state
    // Simulate fetching data:
    // const usersRef = collection(db, 'users');
    // const q = query(usersRef, where('referredBy', '==', userId));
    // const snapshot = await getDocs(q);
    // setReferredUsersCount(snapshot.size);

    // Mocked values:
    setReferredUsersCount(5); // Example
    setPointsEarnedFromReferrals(500); // Example
    // setIsLoading(false);
  }, []);

  useEffect(() => {
    if (telegramUser?.id) {
      fetchReferralData(telegramUser.id);
    }
  }, [telegramUser, fetchReferralData]);

  const handleCopyLink = () => {
    if (navigator.clipboard && referralLink) {
      navigator.clipboard.writeText(referralLink)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000); // Reset copied status after 2s
        })
        .catch(err => {
          console.error('Failed to copy referral link: ', err);
          alert('Failed to copy link. Please copy it manually.');
        });
    } else {
      // Fallback for browsers that don't support navigator.clipboard or if link is not ready
      alert('Referral link: ' + referralLink + '\nPlease copy it manually.');
    }
  };

  if (isLoading && !error) { // Show loading only if no error yet
    return <div className="referral-page"><div className="loading-spinner"></div><p>Loading referral info...</p></div>;
  }

  if (error) {
    return <div className="referral-page"><p className="error-message">{error}</p></div>;
  }

  if (!telegramUser) { // Should be caught by error state, but as a safeguard
    return <div className="referral-page"><p className="error-message">User information not available.</p></div>;
  }

  return (
    <div className="referral-page">
      <h2>Invite Friends, Earn Rewards!</h2>

      <div className="referral-instructions">
        <p>Share your unique referral link with friends. When they join using your link:</p>
        <ul>
          <li>You earn <strong>1000</strong> points (example bonus).</li>
          <li>They receive <strong>500</strong> points as a welcome gift (example bonus).</li>
        </ul>
      </div>

      <div className="referral-code-section">
        <h3>Your Referral Code:</h3>
        <p className="referral-code-display">{referralCode}</p>
      </div>

      <div className="referral-link-section">
        <h3>Your Referral Link:</h3>
        <div className="referral-link-display-container">
          <input type="text" value={referralLink} readOnly className="referral-link-input" />
          <button onClick={handleCopyLink} className="copy-link-button">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="referral-stats">
        <h3>Your Referral Stats (Mocked):</h3>
        <p>Friends Referred: <strong>{referredUsersCount}</strong></p>
        <p>Points Earned from Referrals: <strong>{pointsEarnedFromReferrals.toLocaleString()}</strong></p>
      </div>

      <p className="referral-footer">
        Start sharing now and climb the leaderboard!
      </p>
    </div>
  );
}

export default ReferralPage;
