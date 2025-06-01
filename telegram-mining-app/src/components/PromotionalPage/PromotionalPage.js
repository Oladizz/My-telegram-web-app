import React from 'react';
import './PromotionalPage.css';

function PromotionalPage() {
  const handleWatchAd = () => {
    // Simulate ad watching and boost application
    alert('Ad watched! Your mining rate will be boosted for the next cycle (simulation).');
    console.log('Watch Ad button clicked. Boost applied (simulated).');
  };

  return (
    <div className="promotional-page">
      <h2>Boost Your Mining!</h2>

      <div className="promo-content">
        <div className="promo-image-placeholder">
          {/* Placeholder for an image or animation */}
          <span>🎁</span> {/* Example emoji, replace with img or more complex div */}
        </div>

        <p className="promo-description">
          Watch a short advertisement to temporarily increase your daily mining rate or gain other exciting bonuses!
        </p>

        <button onClick={handleWatchAd} className="promo-button">
          Watch Ad & Boost
        </button>
      </div>

      <div className="more-promos-soon">
        <p>More promotional offers coming soon. Check back regularly!</p>
      </div>
    </div>
  );
}

export default PromotionalPage;
