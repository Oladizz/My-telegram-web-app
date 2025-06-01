import React, { useState, useEffect } from 'react';
import './PromotionalPage.css';
import { db } from '../../firebaseConfig'; // Adjusted path
import { doc, updateDoc, increment, getDoc } from "firebase/firestore"; // Added getDoc for checking user existence

function PromotionalPage() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [isProcessingBoost, setIsProcessingBoost] = useState(false);
  const [error, setError] = useState(null);
  const [boostAppliedMessage, setBoostAppliedMessage] = useState('');

  // Get Telegram User Info
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready(); // Ensure WebApp is ready
    const user = tg.initDataUnsafe?.user;
    if (user && user.id) {
      setTelegramUser(user);
    } else {
      // This case might occur if the app is opened outside Telegram or data is unavailable
      setError("Unable to identify Telegram user. Please try launching from Telegram.");
      console.warn("Telegram user data not available or user ID is missing.");
    }
  }, []);

  const handleWatchAd = async () => {
    if (!telegramUser || !telegramUser.id) {
      setError("User not identified. Cannot apply boost.");
      setBoostAppliedMessage('');
      return;
    }

    setIsProcessingBoost(true);
    setError(null);
    setBoostAppliedMessage('');

    const boostAmount = 0.25; // Increment modifier by 0.25

    try {
      const userRef = doc(db, 'users', String(telegramUser.id));

      // Optional: Check if user document exists before trying to update
      // This is good practice, though HomePage usually creates the user.
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error("User profile not found. Please visit the Home page first.");
      }

      await updateDoc(userRef, {
        miningRateModifier: increment(boostAmount)
      });

      setBoostAppliedMessage(`Boost applied! Your mining rate modifier has increased by ${boostAmount}.`);
      // Optionally, you could fetch the new modifier to display it, but not strictly necessary here.

    } catch (e) {
      console.error("Error applying boost:", e);
      setError(`Failed to apply boost: ${e.message}. Please try again.`);
    } finally {
      setIsProcessingBoost(false);
    }
  };

  return (
    <div className="promotional-page">
      <h2>Boost Your Mining!</h2>

      <div className="promo-content">
        <div className="promo-image-placeholder">
          <span>🚀</span> {/* Rocket emoji for boost */}
        </div>

        <p className="promo-description">
          Watch a short (simulated) advertisement to permanently increase your mining rate modifier by 0.25!
        </p>

        <button
          onClick={handleWatchAd}
          className="promo-button"
          disabled={isProcessingBoost || !telegramUser?.id}
        >
          {isProcessingBoost ? 'Applying Boost...' : 'Watch Ad & Boost'}
        </button>

        {error && <p className="error-message promo-feedback">{error}</p>}
        {boostAppliedMessage && <p className="success-message promo-feedback">{boostAppliedMessage}</p>}
      </div>

      <div className="more-promos-soon">
        <p>More promotional offers coming soon. Check back regularly!</p>
        <p className="small-print">(Note: This is a permanent modifier increase for now. Temporary boosts or daily limits are future considerations.)</p>
      </div>
    </div>
  );
}

export default PromotionalPage;
