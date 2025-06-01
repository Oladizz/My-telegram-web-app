import React from 'react';
import { NavLink } from 'react-router-dom'; // Changed Link to NavLink
import './NavigationBar.css';

function NavigationBar() {
  return (
    <nav className="bottom-nav">
      <ul>
        <li><NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Home</NavLink></li>
        <li><NavLink to="/tasks" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Tasks</NavLink></li>
        <li><NavLink to="/referrals" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Referrals</NavLink></li>
        <li><NavLink to="/purchase" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Shop</NavLink></li>
        <li><NavLink to="/promo" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Boosters</NavLink></li> {/* Added Boosters (Promo) link */}
        <li><NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Leaderboard</NavLink></li>
      </ul>
    </nav>
  );
}

export default NavigationBar;
