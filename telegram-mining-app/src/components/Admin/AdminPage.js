import React from 'react';
import './AdminPage.css';

function AdminPage() {
  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>

      <section className="admin-section">
        <h3>Task Management</h3>
        <p>Area to add/edit tasks and their XP rewards.</p>
        {/* Placeholder for task form or list */}
      </section>

      <section className="admin-section">
        <h3>User Management</h3>
        <p>Area to view user list, search users, and manually edit their XP.</p>
        <input type="text" placeholder="Search user by Telegram username" className="admin-search-input" />
        {/* Placeholder for user list */}
      </section>
    </div>
  );
}

export default AdminPage;
