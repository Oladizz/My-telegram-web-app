import React from 'react';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-page">
      <h2>Home</h2>
      <div className="mining-circle-container">
        <div className="mining-circle">
          <span className="mining-text">Tap to Mine</span>
        </div>
      </div>
      <p>Time remaining: 12:00:00</p> {/* Placeholder */}
    </div>
  );
}

export default HomePage;
