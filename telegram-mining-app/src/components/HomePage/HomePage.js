import React, { useState, useEffect, useCallback } from 'react';
import './HomePage.css';
import { db } from '../../firebaseConfig'; // Adjusted path
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";

const BASE_MINING_RATE_PER_DAY = 12; // Tokens per 24-hour cycle
const TOTAL_MINING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function formatTimeLeft(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function HomePage() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [isMining, setIsMining] = useState(false);
  const [progress, setProgress] = useState(0); // Visual progress for the current mining session (0-100)
  const [tokensEarnedThisSession, setTokensEarnedThisSession] = useState(0); // Tokens earned in the current visual session

  // Firebase-driven state
  const [totalPoints, setTotalPoints] = useState(0);
  const [miningRateModifier, setMiningRateModifier] = useState(1.0);
  const [lastMinedTime, setLastMinedTime] = useState(null); // Firestore Timestamp
  const [currentMiningProgressDb, setCurrentMiningProgressDb] = useState(0); // Progress stored in DB
  const [lastSessionStartTimeDb, setLastSessionStartTimeDb] = useState(null); // Firestore Timestamp for when mining officially started

  const [timeLeftForFullMineMs, setTimeLeftForFullMineMs] = useState(TOTAL_MINING_DURATION_MS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculatedMiningRate = BASE_MINING_RATE_PER_DAY * miningRateModifier;

  // Fetch User Data or Create New User
  const fetchUserData = useCallback(async (userId, userDetails) => {
    setIsLoading(true);
    setError(null);
    const userRef = doc(db, 'users', String(userId));
    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTotalPoints(data.points || 0);
        setMiningRateModifier(data.miningRateModifier || 1.0);
        setLastMinedTime(data.lastMinedTime);
        setCurrentMiningProgressDb(data.currentMiningProgress || 0);
        setLastSessionStartTimeDb(data.lastSessionStartTime);

        // Initialize visual progress and time left based on DB data
        // This logic needs to be robust to calculate offline progress
        let initialProgress = data.currentMiningProgress || 0;
        if (data.lastSessionStartTime && data.currentMiningProgress < 100) {
            const now = Date.now();
            const lastStartTimeMs = data.lastSessionStartTime.toMillis();
            const elapsedTimeSinceLastStart = now - lastStartTimeMs;
            const expectedProgress = (elapsedTimeSinceLastStart / TOTAL_MINING_DURATION_MS) * 100;
            initialProgress = Math.min(100, Math.max(data.currentMiningProgress, expectedProgress));
        }
        setProgress(initialProgress);
        setTimeLeftForFullMineMs(TOTAL_MINING_DURATION_MS * (1 - initialProgress / 100));
        if (initialProgress >= 100) setIsMining(false); // Ensure mining stops if loaded full

      } else {
        const newUserData = {
          userId: String(userId),
          username: userDetails?.username || '',
          firstName: userDetails?.firstName || 'User',
          points: 0,
          miningRateModifier: 1.0,
          lastMinedTime: null, // No mining done yet
          currentMiningProgress: 0,
          lastSessionStartTime: null, // Not started yet
          createdAt: Timestamp.now(),
        };
        await setDoc(userRef, newUserData);
        setTotalPoints(newUserData.points);
        setMiningRateModifier(newUserData.miningRateModifier);
        setLastMinedTime(newUserData.lastMinedTime);
        setCurrentMiningProgressDb(newUserData.currentMiningProgress);
        setLastSessionStartTimeDb(newUserData.lastSessionStartTime);
        setProgress(0);
        setTimeLeftForFullMineMs(TOTAL_MINING_DURATION_MS);
      }
    } catch (e) {
      console.error("Error fetching/creating user data:", e);
      setError("Failed to load user data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize Telegram Web App & Fetch User
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    const user = tg.initDataUnsafe?.user;
    if (user && user.id) {
      setTelegramUser(user);
      fetchUserData(user.id, user);
    } else {
      setError("Unable to identify Telegram user. Please try launching from Telegram.");
      setIsLoading(false);
      // console.error("Telegram user data not available.", tg.initDataUnsafe);
    }
  }, [fetchUserData]);

  // Save User Progress to Firebase
  const saveUserProgress = useCallback(async () => {
    if (!telegramUser || !telegramUser.id) return;

    const userRef = doc(db, 'users', String(telegramUser.id));
    let pointsToAdd = tokensEarnedThisSession;
    let newProgress = progress;
    let newLastMinedTime = lastMinedTime;
    let newLastSessionStartTime = lastSessionStartTimeDb;

    if (progress >= 100) {
      pointsToAdd = calculatedMiningRate * (progress/100) - (currentMiningProgressDb/100 * calculatedMiningRate); // only add delta
      newProgress = 0; // Reset progress for next cycle
      newLastMinedTime = Timestamp.now();
      newLastSessionStartTime = null; // Ready for a new session
    } else {
       // If stopping mid-session, pointsToAdd is how much was visually accumulated this session
       // newProgress is the current visual progress
       // newLastSessionStartTime should ideally be the *actual* start time of this visual session
       // For simplicity, if isMining was true, we assume current lastSessionStartTimeDb is correct or will be updated on start.
    }

    try {
      await updateDoc(userRef, {
        points: totalPoints + pointsToAdd,
        currentMiningProgress: newProgress,
        lastMinedTime: newLastMinedTime,
        lastSessionStartTime: newLastSessionStartTime,
        // Potentially update other fields like miningRateModifier if it changes
      });
      setTotalPoints(totalPoints + pointsToAdd);
      setCurrentMiningProgressDb(newProgress);
      setLastMinedTime(newLastMinedTime);
      setLastSessionStartTimeDb(newLastSessionStartTime);
      setTokensEarnedThisSession(0); // Reset session earnings
      if (newProgress === 0) { // If cycle completed and reset
        setProgress(0);
        setTimeLeftForFullMineMs(TOTAL_MINING_DURATION_MS);
      }
      console.log("Progress saved.");
    } catch (e) {
      console.error("Error saving user progress:", e);
      setError("Failed to save progress. Please check connection.");
    }
  }, [telegramUser, progress, tokensEarnedThisSession, totalPoints, calculatedMiningRate, lastMinedTime, lastSessionStartTimeDb, currentMiningProgressDb]);


  // Mining Simulation Effect
  useEffect(() => {
    let intervalId;
    if (isMining && progress < 100) {
      // Determine the actual start time for this session's progress calculation
      // This could be now, or based on lastSessionStartTimeDb if resuming
      const sessionEffectiveStartTime = (lastSessionStartTimeDb && currentMiningProgressDb > 0 && currentMiningProgressDb < 100)
                                     ? lastSessionStartTimeDb.toMillis()
                                     : Date.now();

      // Adjust for existing progress if resuming a session
      const progressOffsetMs = (currentMiningProgressDb / 100) * TOTAL_MINING_DURATION_MS;
      const adjustedStartTime = sessionEffectiveStartTime - progressOffsetMs;

      intervalId = setInterval(() => {
        const elapsedTimeSinceAdjustedStart = Date.now() - adjustedStartTime;
        const currentVisualProgress = Math.min(100, (elapsedTimeSinceAdjustedStart / TOTAL_MINING_DURATION_MS) * 100);

        setProgress(currentVisualProgress);
        // Calculate tokens earned *this visual session* based on progress increase
        const progressIncrease = currentVisualProgress - (currentMiningProgressDb > 0 ? currentMiningProgressDb : 0);
        setTokensEarnedThisSession((progressIncrease / 100) * calculatedMiningRate);
        setTimeLeftForFullMineMs(Math.max(0, TOTAL_MINING_DURATION_MS - elapsedTimeSinceAdjustedStart));

        if (currentVisualProgress >= 100) {
          setIsMining(false);
          // setTokensEarnedThisSession(calculatedMiningRate); // Full rate earned over the cycle
          saveUserProgress(); // Auto-save/claim when full
        }
      }, 1000);
    } else {
      clearInterval(intervalId);
      // If stopped or loaded full, ensure time left is 0
      if (progress >= 100) setTimeLeftForFullMineMs(0);
      // If paused mid-session, preserve time left based on current visual progress
      else if (!isMining && progress > 0 && progress < 100) {
         setTimeLeftForFullMineMs(TOTAL_MINING_DURATION_MS * (1 - progress / 100));
      }
    }
    return () => {
      clearInterval(intervalId);
      // Save progress on unmount if mining was active
      // This check needs to be more robust, e.g. by checking a ref, as state might not be latest in cleanup
      // if (isMiningRef.current) { saveUserProgress(); }
    };
  }, [isMining, progress, calculatedMiningRate, saveUserProgress, lastSessionStartTimeDb, currentMiningProgressDb]);

  // Effect for saving on unmount - using a ref for isMining
  const isMiningRef = React.useRef(isMining);
  useEffect(() => { isMiningRef.current = isMining; }, [isMining]);
  useEffect(() => {
    return () => {
      if (isMiningRef.current && telegramUser?.id) {
        console.log("Component unmounting, saving progress...");
        saveUserProgress();
      }
    }
  }, [saveUserProgress, telegramUser]);


  const handleMineButtonClick = async () => {
    if (!telegramUser || !telegramUser.id) {
      setError("User not identified. Cannot start mining.");
      return;
    }

    if (progress >= 100) {
      // Cycle is complete, user effectively "claims" by starting new cycle or if auto-claimed
      // saveUserProgress() should have handled resetting progress in DB
      // We re-initialize the visual state for a new cycle
      setProgress(0);
      setTokensEarnedThisSession(0);
      setTimeLeftForFullMineMs(TOTAL_MINING_DURATION_MS);
      setLastSessionStartTimeDb(Timestamp.now()); // Mark DB for new session start
      setCurrentMiningProgressDb(0); // DB progress is 0 for new cycle

      const userRef = doc(db, 'users', String(telegramUser.id));
      try {
        await updateDoc(userRef, { // Ensure DB reflects the new cycle start
            currentMiningProgress: 0,
            lastSessionStartTime: Timestamp.now(),
            lastMinedTime: Timestamp.now() // Also update lastMinedTime as a full cycle was completed
        });
      } catch(e) { console.error("Error updating for new cycle:", e); }

      setIsMining(true); // Start new cycle
      return;
    }

    const newIsMining = !isMining;
    setIsMining(newIsMining);

    if (newIsMining) { // Starting to mine
      const now = Timestamp.now();
      setLastSessionStartTimeDb(now); // Set this for current session
      // If progress is 0, this is a fresh start for the current DB cycle
      if (progress === 0) setCurrentMiningProgressDb(0);

      const userRef = doc(db, 'users', String(telegramUser.id));
      try {
        await updateDoc(userRef, { lastSessionStartTime: now, currentMiningProgress: progress }); // Save current progress as starting point
      } catch (e) {
        console.error("Error updating lastSessionStartTime:", e);
        // Optionally revert isMining state or handle error
      }
    } else { // Stopping mining
      saveUserProgress();
    }
  };

  const circleText = () => {
    if (isLoading) return "Loading...";
    if (progress >= 100) return "Full!";
    if (isMining) return `${progress.toFixed(1)}%`;
    return "Start";
  };

  if (error) {
    return <div className="home-page"><p className="error-message">{error}</p></div>;
  }

  return (
    <div className="home-page">
      <h2>Home {telegramUser?.firstName && `- ${telegramUser.firstName}`}</h2>
      <div className="stats-container">
        <p>Total Points: {totalPoints.toLocaleString()}</p>
        <p>Tokens This Session: {tokensEarnedThisSession.toFixed(4)}</p>
        <p>Mining Rate: {calculatedMiningRate.toFixed(2)} tokens / 24h</p>
        <p>Time Left: {formatTimeLeft(timeLeftForFullMineMs)}</p>
        {isLoading && <p>Syncing...</p>}
      </div>
      <div className="mining-circle-container">
        <div
          className={`mining-circle ${isLoading || (!telegramUser?.id) ? 'disabled' : ''}`}
          style={{ backgroundImage: `conic-gradient(white ${progress * 3.6}deg, transparent ${progress * 3.6}deg)` }}
          onClick={(!isLoading && telegramUser?.id) ? handleMineButtonClick : undefined}
        >
          <span className="mining-text">{circleText()}</span>
        </div>
      </div>
      <button
        onClick={handleMineButtonClick}
        className="mine-button"
        disabled={isLoading || (!telegramUser?.id)}
      >
        {isMining ? 'Stop Mining' : (progress >= 100 ? 'Start New Cycle' : 'Start Mining')}
      </button>
    </div>
  );
}

export default HomePage;
