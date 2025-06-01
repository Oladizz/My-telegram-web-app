import React, { useState, useEffect, useCallback } from 'react';
import './HomePage.css';
import { db, functions } from '../../firebaseConfig'; // Import functions
import { httpsCallable } from 'firebase/functions'; // Import httpsCallable
import { sendNotificationToBot } from '../../App';
import { doc, getDoc, setDoc, updateDoc, Timestamp, increment, writeBatch } from "firebase/firestore";

const BASE_MINING_RATE_PER_DAY = 12; // Tokens per 24-hour cycle
const TOTAL_MINING_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const REFERRER_BONUS_POINTS = 1000; // Example points for the referrer
const REFERRED_USER_BONUS_POINTS = 500; // Example points for the new user

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
  const [isClaiming, setIsClaiming] = useState(false); // New state for claim loading
  const [error, setError] = useState(null);

  const calculatedMiningRate = BASE_MINING_RATE_PER_DAY * miningRateModifier;

  // Fetch User Data or Create New User
  const fetchUserData = useCallback(async (userId, userDetails, startParam) => { // Added startParam
    setIsLoading(true);
    setError(null);
    const userRef = doc(db, 'users', String(userId));
    try {
      let docSnap = await getDoc(userRef); // Use let for potential re-assignment after referral bonus

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
        let initialPoints = 0;
        let referredBy = null;
        let referrerId = null;

        if (startParam && startParam.startsWith('ref_')) {
          referrerId = startParam.substring(4);
          if (referrerId && referrerId !== String(userId)) { // User cannot refer themselves
            referredBy = referrerId;
            initialPoints += REFERRED_USER_BONUS_POINTS; // Bonus for the new user
            console.log(`User ${userId} referred by ${referrerId}. Awarding ${REFERRED_USER_BONUS_POINTS} points.`);
          } else {
            referrerId = null; // Invalid self-referral
          }
        }

        const newUserData = {
          userId: String(userId),
          username: userDetails?.username || '',
          firstName: userDetails?.firstName || 'User',
          points: initialPoints,
          miningRateModifier: 1.0,
          lastMinedTime: null,
          currentMiningProgress: 0,
          lastSessionStartTime: null,
          createdAt: Timestamp.now(),
          ...(referredBy && { referredBy: referredBy }), // Add referredBy field if applicable
        };
        await setDoc(userRef, newUserData);

        setTotalPoints(newUserData.points);
        setMiningRateModifier(newUserData.miningRateModifier);
        setLastMinedTime(newUserData.lastMinedTime);
        setCurrentMiningProgressDb(newUserData.currentMiningProgress);
        setLastSessionStartTimeDb(newUserData.lastSessionStartTime);
        setProgress(0);
        setTimeLeftForFullMineMs(TOTAL_MINING_DURATION_MS);

        // If referred, try to award bonus to referrer (client-side simulation, ideally a Cloud Function)
        if (referrerId) {
          try {
            const referrerRef = doc(db, 'users', referrerId);
            // Use a batch or transaction for atomicity if possible, though here it's a separate operation.
            // For now, direct update. Cloud Function would be better.
            await updateDoc(referrerRef, {
              points: increment(REFERRER_BONUS_POINTS),
              // Optionally, add to a subcollection of `referredUsers` on the referrer's doc.
            });
            console.log(`Awarded ${REFERRER_BONUS_POINTS} points to referrer ${referrerId}.`);
          } catch (refError) {
            console.error(`Failed to award bonus to referrer ${referrerId}:`, refError);
            // Store this failure for later processing by a Cloud Function if needed.
            // e.g., addDoc(collection(db, 'pendingReferralBonuses'), { referrerId, newUserId: userId, error: refError.message, createdAt: Timestamp.now() });
          }
        }
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
    const startParam = tg.initDataUnsafe?.start_param; // Get start_param

    if (user && user.id) {
      setTelegramUser(user);
      fetchUserData(user.id, user, startParam); // Pass startParam to fetchUserData
    } else {
      setError("Unable to identify Telegram user. Please try launching from Telegram.");
      setIsLoading(false);
    }
  }, [fetchUserData]);

  // Save User Progress (Mid-session) - Direct Firestore write
  const saveMidSessionProgress = useCallback(async () => {
    if (!telegramUser || !telegramUser.id || progress >= 100) return false;

    setIsLoading(true); // Indicate general loading for mid-session save
    const userRef = doc(db, 'users', String(telegramUser.id));
    try {
      await updateDoc(userRef, {
        // Only update progress and session start time if actively mining mid-cycle
        currentMiningProgress: progress,
        lastSessionStartTime: lastSessionStartTimeDb || Timestamp.now(), // Use existing or set new if somehow null
        // Do NOT update total points here, that's for cycle completion.
      });
      setCurrentMiningProgressDb(progress); // Sync local DB state with visual progress
      // tokensEarnedThisSession is visual, no direct DB field for it mid-session.
      console.log("Mid-session progress saved.");
      setIsLoading(false);
      return true;
    } catch (e) {
      console.error("Error saving mid-session progress:", e);
      setError("Failed to save current progress. Please check connection.");
      setIsLoading(false);
      return false;
    }
  }, [telegramUser, progress, lastSessionStartTimeDb]);


  // Claim Mining Rewards via Cloud Function
  const claimMiningRewards = async () => {
    if (!telegramUser || !telegramUser.id) {
      setError("User not identified. Cannot claim rewards.");
      return;
    }
    if (progress < 100) {
      // This case should ideally not be hit if button is "Start New Cycle" only at 100%
      console.log("Not yet at 100% to claim.");
      return;
    }

    setIsClaiming(true); // Specific loading state for this action
    setError(null);

    try {
      const claimRewardsFunction = httpsCallable(functions, 'claimMiningRewards');
      const dataToSend = {
        // telegramInitData: window.Telegram.WebApp.initData, // Send for server-side validation
        clientTimestamp: new Date().toISOString(),
        // lastKnownClientProgress: progress, // Could be useful for server to double check state
      };

      console.log("Calling 'claimMiningRewards' Cloud Function...");
      const result = await claimRewardsFunction(dataToSend);
      console.log('Claim rewards result:', result.data);

      if (result.data && result.data.success) {
        // Update local state based on the function's response
        setTotalPoints(result.data.newTotalPoints);
        setCurrentMiningProgressDb(0); // Reset by function
        setLastMinedTime(Timestamp.now()); // Reflect claim time, or use server timestamp from result
        setLastSessionStartTimeDb(null); // Reset by function
        setProgress(0); // Reset visual progress
        setTokensEarnedThisSession(0);
        setTimeLeftForFullMineMs(TOTAL_MINING_DURATION_MS);
        setIsMining(false); // Stop mining after claim

        sendNotificationToBot(telegramUser.id, 'MINING_CYCLE_COMPLETE', { pointsEarned: result.data.pointsAwarded });
        alert(`Rewards claimed! You earned ${result.data.pointsAwarded.toFixed(4)} points.`);
      } else {
        throw new Error(result.data?.message || "Failed to claim rewards. Unknown error from function.");
      }
    } catch (error) {
      console.error("Error calling claimMiningRewards function:", error);
      setError(error.message || "Failed to claim rewards. Please try again.");
      // Potentially, refetch user data to ensure client is in sync with server state if claim failed.
      // fetchUserData(telegramUser.id, telegramUser, window.Telegram.WebApp.initDataUnsafe?.start_param);
    } finally {
      setIsClaiming(false);
    }
  };


  // Mining Simulation Effect
  useEffect(() => {
    let intervalId;
    if (isMining && progress < 100 && telegramUser?.id) {
      const visualProgressAlreadyMadeThisCycle = currentMiningProgressDb || 0;
      const actualStartOfThisMiningSegmentMs = Date.now() - (progress - visualProgressAlreadyMadeThisCycle) / 100 * TOTAL_MINING_DURATION_MS;

      intervalId = setInterval(async () => {
        const elapsedTimeThisSegment = Date.now() - actualStartOfThisMiningSegmentMs;
        let currentVisualProgress = visualProgressAlreadyMadeThisCycle + (elapsedTimeThisSegment / TOTAL_MINING_DURATION_MS) * 100;
        currentVisualProgress = Math.min(100, currentVisualProgress);

        setProgress(currentVisualProgress);

        const visualProgressIncreaseSinceLastDBSave = currentVisualProgress - (currentMiningProgressDb || 0);
        setTokensEarnedThisSession((visualProgressIncreaseSinceLastDBSave / 100) * calculatedMiningRate);
        setTimeLeftForFullMineMs(Math.max(0, TOTAL_MINING_DURATION_MS * (1 - currentVisualProgress / 100)));

        if (currentVisualProgress >= 100) {
          setIsMining(false);
          // When 100% is reached, user needs to click "Start New Cycle" which now calls claimMiningRewards
          // No automatic save/claim here anymore, button press will trigger it.
          // We can save the 100% progress to DB though.
          const userRef = doc(db, 'users', String(telegramUser.id));
          try {
            await updateDoc(userRef, { currentMiningProgress: 100, lastSessionStartTime: lastSessionStartTimeDb });
            setCurrentMiningProgressDb(100);
          } catch (e) { console.error("Error saving 100% progress pre-claim:", e); }
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
    };
  }, [isMining, progress, calculatedMiningRate, lastSessionStartTimeDb, currentMiningProgressDb, telegramUser?.id]); // Added telegramUser.id

  // Effect for saving on unmount - using a ref for isMining
  const isMiningRef = React.useRef(isMining);
  useEffect(() => { isMiningRef.current = isMining; }, [isMining]);
  useEffect(() => {
    return () => {
      // Save mid-session progress if user was actively mining and progress is not 100%
      if (isMiningRef.current && telegramUser?.id && progress < 100) {
        console.log("Component unmounting, saving mid-session progress...");
        saveMidSessionProgress();
      }
    }
  }, [saveMidSessionProgress, telegramUser, progress]); // Added progress to condition


  const handleMineButtonClick = async () => {
    if (!telegramUser || !telegramUser.id) {
      setError("User not identified. Cannot start mining.");
      return;
    }

    if (progress >= 100) { // If cycle is full, button action is to claim.
      await claimMiningRewards();
      // After successful claim, state should be reset, allowing user to start a new cycle.
      // The button text will change to "Start Mining" if claim was successful and progress reset.
      return;
    }

    const newIsMining = !isMining;
    setIsMining(newIsMining);

    if (newIsMining) { // Starting to mine (or resuming)
      const now = Timestamp.now();
      // Only update lastSessionStartTimeDb if it's a truly new session or progress was 0
      if (!lastSessionStartTimeDb || progress === 0) {
        setLastSessionStartTimeDb(now);
        setCurrentMiningProgressDb(0); // Reset current DB progress for a fresh cycle start
        const userRef = doc(db, 'users', String(telegramUser.id));
        try {
          // Ensure DB reflects this new session start if it's a truly new cycle
          await updateDoc(userRef, { lastSessionStartTime: now, currentMiningProgress: 0 });
        } catch (e) { console.error("Error setting new session start time:", e); }
      } else {
        // Resuming a session that was previously saved mid-progress
        // lastSessionStartTimeDb should already be set from fetchUserData or previous saveMidSessionProgress
        // currentMiningProgressDb should also be up-to-date
      }
    } else { // Stopping mining (mid-session)
      saveMidSessionProgress();
    }
  };

  const circleText = () => {
    if (isLoading) return "Loading...";
    if (isClaiming) return "Claiming...";
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
          className={`mining-circle ${isLoading || isClaiming || (!telegramUser?.id) ? 'disabled' : ''}`}
          style={{ backgroundImage: `conic-gradient(white ${progress * 3.6}deg, transparent ${progress * 3.6}deg)` }}
          onClick={(!isLoading && !isClaiming && telegramUser?.id) ? handleMineButtonClick : undefined}
        >
          <span className="mining-text">{circleText()}</span>
        </div>
      </div>
      <button
        onClick={handleMineButtonClick}
        className="mine-button"
        disabled={isLoading || isClaiming || (!telegramUser?.id)}
      >
        {progress >= 100 ? 'Claim Rewards & Start New Cycle' : (isMining ? 'Stop Mining' : 'Start Mining')}
      </button>
    </div>
  );
}

export default HomePage;
