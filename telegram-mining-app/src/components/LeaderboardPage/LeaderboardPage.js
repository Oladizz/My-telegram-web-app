import React, { useState, useEffect, useCallback } from 'react';
import './LeaderboardPage.css';
import { db } from '../../firebaseConfig'; // Adjusted path
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const usersCol = collection(db, 'users');
      const q = query(usersCol, orderBy('points', 'desc'), limit(100)); // Get top 100 users

      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map((doc, index) => ({
        id: doc.id,
        rank: index + 1, // Assign rank based on Firestore order
        ...doc.data(),
      }));
      setLeaderboardData(users);
    } catch (e) {
      console.error("Error fetching leaderboard data:", e);
      setError("Failed to load leaderboard. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  if (isLoading) {
    return <div className="leaderboard-page"><div className="loading-spinner"></div><p>Loading leaderboard...</p></div>;
  }

  if (error) {
    return <div className="leaderboard-page"><p className="error-message">{error}</p></div>;
  }

  return (
    <div className="leaderboard-page">
      <h2>Leaderboard</h2>
      {leaderboardData.length === 0 && !isLoading && <p>Leaderboard is currently empty.</p>}
      {leaderboardData.length > 0 && (
        <div className="leaderboard-container">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Username</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map((user) => (
                <tr key={user.id}>
                  <td>{user.rank}</td>
                  <td>{user.firstName || 'N/A'}</td>
                  <td>{user.username || 'Anonymous'}</td>
                  <td>{user.points ? user.points.toLocaleString() : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LeaderboardPage;
