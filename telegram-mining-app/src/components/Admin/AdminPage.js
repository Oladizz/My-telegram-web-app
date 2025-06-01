import React from 'react';
import './AdminPage.css';

function AdminPage() {
  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>

      <section className="admin-section task-management">
        <h3>Task Management</h3>

        <h4>Add New Task</h4>
        <form className="admin-form">
          <div className="form-group">
            <label htmlFor="taskTitle">Title:</label>
            <input type="text" id="taskTitle" name="taskTitle" placeholder="Enter task title" />
          </div>
          <div className="form-group">
            <label htmlFor="taskDescription">Description:</label>
            <textarea id="taskDescription" name="taskDescription" placeholder="Enter task description"></textarea>
          </div>
          <div className="form-group">
            <label htmlFor="taskPoints">Points:</label>
            <input type="number" id="taskPoints" name="taskPoints" placeholder="Enter points" />
          </div>
          <div className="form-group">
            <label htmlFor="taskLink">Link (Optional):</label>
            <input type="text" id="taskLink" name="taskLink" placeholder="Enter task link" />
          </div>
          <button type="submit" className="admin-button">Add Task</button>
        </form>

        <h4>Current Tasks</h4>
        <div className="admin-list-placeholder">
          {/* This would typically be a table or a list of task items */}
          <div className="admin-list-item">
            <span>Follow us on X (100 points)</span>
            <div>
              <button className="admin-button-small edit">Edit</button>
              <button className="admin-button-small delete">Delete</button>
            </div>
          </div>
          <div className="admin-list-item">
            <span>Join Telegram Channel (50 points)</span>
            <div>
              <button className="admin-button-small edit">Edit</button>
              <button className="admin-button-small delete">Delete</button>
            </div>
          </div>
          <p><em>More tasks would be listed here...</em></p>
        </div>
      </section>

      <section className="admin-section user-management">
        <h3>User Management</h3>
        <input type="text" placeholder="Search user by Telegram username or ID" className="admin-search-input" />
        <button className="admin-button search-button">Search</button>

        <h4>User List</h4>
        <div className="admin-list-placeholder">
          {/* This would typically be a table or a list of user items */}
          <div className="admin-list-item">
            <span>UserAlpha (Points: 15,000)</span>
            <div>
              <button className="admin-button-small edit">Edit Points</button>
              <button className="admin-button-small view">View Details</button>
            </div>
          </div>
          <div className="admin-list-item">
            <span>BetaGamer (Points: 12,500)</span>
            <div>
              <button className="admin-button-small edit">Edit Points</button>
              <button className="admin-button-small view">View Details</button>
            </div>
          </div>
          <p><em>More users would be listed here...</em></p>
        </div>
      </section>
    </div>
  );
}

export default AdminPage;
