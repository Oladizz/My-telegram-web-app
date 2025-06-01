import React, { useState, useEffect } from 'react';
import './LeaderboardPage.css';

const sampleLeaderboardData = [
  { id: 1, username: 'UserAlpha', points: 15000 },
  { id: 2, username: 'BetaGamer', points: 12500 },
  { id: 3, username: 'CharlieMiner', points: 10000 },
  { id: 4, username: 'DeltaPlayer', points: 17000 },
  { id: 5, username: 'EchoStriker', points: 9500 },
  { id: 6, username: 'FoxtrotPro', points: 12500 }, // Duplicate points for testing sort stability
  { id: 7, username: 'GammaUser', points: 20000 },
];

// Helper to sort and rank data
const getRankedData = (data) => {
  return data
    .sort((a, b) => b.points - a.points) // Sort by points descending
    .map((user, index) => ({
      ...user,
      rank: index + 1, // Assign rank based on sorted order
    }));
};

function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState([]);

  useEffect(() => {
    setLeaderboardData(getRankedData(sampleLeaderboardData));
    // In a real app, you might fetch this data from an API:
    // fetch('/api/leaderboard')
    //   .then(res => res.json())
    //   .then(data => setLeaderboardData(getRankedData(data)));
  }, []);

  return (
    <div className="leaderboard-page">
      <h2>Leaderboard</h2>
      <div className="leaderboard-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Username</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((user) => (
              <tr key={user.id}>
                <td>{user.rank}</td>
                <td>{user.username}</td>
                <td>{user.points.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LeaderboardPage;
