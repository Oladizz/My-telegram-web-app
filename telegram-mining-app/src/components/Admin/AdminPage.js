import React, { useState, useEffect, useCallback } from 'react';
import './AdminPage.css';
import { db } from '../../firebaseConfig'; // Adjusted path
import {
  collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp,
  query, where, orderBy // Added query, where, orderBy for user search
} from "firebase/firestore";

function AdminPage() {
  // Task Management State
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState('');
  const [newTaskLink, setNewTaskLink] = useState('');
  const [editingTask, setEditingTask] = useState(null); // { id, title, description, points, link, isActive }
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [errorTasks, setErrorTasks] = useState('');

  // User Management State
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null); // { id, username, firstName, points, miningRateModifier }
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState('');
  const [editUserPoints, setEditUserPoints] = useState('');
  const [editUserMiningRateModifier, setEditUserMiningRateModifier] = useState('');


  // Fetch Tasks
  const fetchAdminTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    setErrorTasks('');
    try {
      const tasksCol = collection(db, 'tasks');
      const taskSnapshot = await getDocs(tasksCol);
      setTasks(taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error("Error fetching tasks:", e);
      setErrorTasks("Failed to fetch tasks.");
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminTasks();
  }, [fetchAdminTasks]);


  // Fetch Users
  const fetchAdminUsers = useCallback(async (searchQuery = null) => {
    setIsLoadingUsers(true);
    setErrorUsers('');
    try {
      const usersColRef = collection(db, 'users');
      let q;
      if (searchQuery) {
        // Firestore is case-sensitive. For case-insensitive, you'd need to store a normalized field.
        // This example tries searching by userId first, then by username.
        // Note: Searching effectively across multiple fields often requires more complex setups or backend search.
        // For simplicity, we'll allow searching by ID (exact match) or username (exact match).
        // Check if searchQuery could be a user ID (though IDs are usually longer and non-numeric)
        // This part is tricky as Telegram IDs are numbers but stored as strings in Firestore docs.
        // Let's assume search by username for now for simplicity with `where`.
        // For a numeric ID that is the document ID, you'd do a getDoc.
        // For a field `userId` that is a string: query(usersColRef, where('userId', '==', searchQuery))
        q = query(usersColRef, where('username', '==', searchQuery), orderBy('points', 'desc'));
        // If you want to search by document ID directly (if searchTerm is the ID)
        // const userById = await getDoc(doc(db, 'users', searchQuery)); if (userById.exists()) ...
      } else {
        q = query(usersColRef, orderBy('points', 'desc'));
      }
      const userSnapshot = await getDocs(q);
      if (userSnapshot.empty && searchQuery) {
         // If username search yields nothing, try by userId field (if you have one)
         // q = query(usersColRef, where('userId', '==', searchQuery));
         // const idSnapshot = await getDocs(q);
         // setUsers(idSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
         // For now, just set to empty if first query is empty
         setUsers([]);
      } else {
        setUsers(userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (e) {
      console.error("Error fetching users:", e);
      setErrorUsers(`Failed to fetch users: ${e.message}. Ensure 'username' and 'points' indexes are configured in Firestore if searching/ordering by them.`);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminUsers(); // Initial fetch of all users (or top users by points)
  }, [fetchAdminUsers]);

  const handleSearchUser = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      fetchAdminUsers(); // Fetch all if search term is cleared
      return;
    }
    fetchAdminUsers(searchTerm.trim());
  };

  const clearUserSearch = () => {
    setSearchTerm('');
    fetchAdminUsers();
  };

  // Initiate Edit User
  const handleInitiateEditUser = (user) => {
    setEditingUser({ ...user });
    setEditUserPoints(String(user.points || 0)); // Ensure string for input field
    setEditUserMiningRateModifier(String(user.miningRateModifier || 1.0)); // Ensure string
    window.scrollTo(0, document.body.scrollHeight); // Scroll to bottom where edit form might be
  };

  // Update User
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!editingUser || !editingUser.id) {
      setErrorUsers("No user selected for updating.");
      return;
    }
    setErrorUsers('');
    try {
      const userRef = doc(db, 'users', editingUser.id);
      const updatedUserData = {
        points: Number(editUserPoints),
        miningRateModifier: parseFloat(editUserMiningRateModifier),
      };
      // Add validation for points and modifier if necessary
      if (isNaN(updatedUserData.points) || isNaN(updatedUserData.miningRateModifier)) {
        setErrorUsers("Points and Mining Rate Modifier must be valid numbers.");
        return;
      }

      await updateDoc(userRef, updatedUserData);
      setEditingUser(null); // Exit edit mode
      fetchAdminUsers(searchTerm.trim() || null); // Refresh list, maintaining current search if any
    } catch (e) {
      console.error("Error updating user:", e);
      setErrorUsers("Failed to update user.");
    }
  };

  // Add Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskPoints) {
      setErrorTasks("Task title and points are required.");
      return;
    }
    setErrorTasks('');
    try {
      await addDoc(collection(db, 'tasks'), {
        title: newTaskTitle,
        description: newTaskDescription,
        points: Number(newTaskPoints),
        link: newTaskLink || '', // Ensure empty string if not provided
        isActive: true,
        createdAt: serverTimestamp(),
      });
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPoints('');
      setNewTaskLink('');
      fetchAdminTasks(); // Refresh list
    } catch (e) {
      console.error("Error adding task:", e);
      setErrorTasks("Failed to add task.");
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      setErrorTasks('');
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        fetchAdminTasks(); // Refresh list
      } catch (e) {
        console.error("Error deleting task:", e);
        setErrorTasks("Failed to delete task.");
      }
    }
  };

  // Initiate Edit Task
  const handleInitiateEditTask = (task) => {
    setEditingTask({ ...task }); // Populate editingTask with the selected task's data
    // Form fields for editing will be bound to editingTask state properties
    // To simplify, we'll reuse the 'Add New Task' form structure but with different handlers/values
    // Or, more cleanly, have a separate editing form/modal.
    // For this implementation, let's assume a separate form section appears.
    window.scrollTo(0, 0); // Scroll to top to see edit form easily
  };

  // Update Task (when in edit mode)
  const handleUpdateTask = async (e) => {
    e.preventDefault();
    if (!editingTask || !editingTask.id || !editingTask.title.trim() || !editingTask.points) {
      setErrorTasks("Task title and points are required for updating.");
      return;
    }
    setErrorTasks('');
    try {
      const taskRef = doc(db, 'tasks', editingTask.id);
      // Prepare data for update, excluding 'id' and potentially 'createdAt'
      const { id, createdAt, ...taskDataToUpdate } = editingTask;
      await updateDoc(taskRef, taskDataToUpdate);

      setEditingTask(null); // Exit edit mode
      fetchAdminTasks(); // Refresh list
    } catch (e) {
      console.error("Error updating task:", e);
      setErrorTasks("Failed to update task.");
    }
  };

  // Handle input changes for the editing task
  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingTask(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value)
    }));
  };


  return (
    <div className="admin-page">
      <h2>Admin Panel</h2>

      {/* Task Management Section */}
      <section className="admin-section task-management">
        <h3>Task Management</h3>

        {/* Edit Task Form (conditional) */}
        {editingTask && (
          <div className="edit-task-form-container">
            <h4>Edit Task (ID: {editingTask.id})</h4>
            <form onSubmit={handleUpdateTask} className="admin-form">
              <div className="form-group">
                <label htmlFor="editTaskTitle">Title:</label>
                <input type="text" id="editTaskTitle" name="title" value={editingTask.title} onChange={handleEditInputChange} placeholder="Enter task title" />
              </div>
              <div className="form-group">
                <label htmlFor="editTaskDescription">Description:</label>
                <textarea id="editTaskDescription" name="description" value={editingTask.description} onChange={handleEditInputChange} placeholder="Enter task description"></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="editTaskPoints">Points:</label>
                <input type="number" id="editTaskPoints" name="points" value={editingTask.points} onChange={handleEditInputChange} placeholder="Enter points" />
              </div>
              <div className="form-group">
                <label htmlFor="editTaskLink">Link (Optional):</label>
                <input type="text" id="editTaskLink" name="link" value={editingTask.link || ''} onChange={handleEditInputChange} placeholder="Enter task link" />
              </div>
              <div className="form-group">
                <label htmlFor="editTaskIsActive">Active:</label>
                <input type="checkbox" id="editTaskIsActive" name="isActive" checked={editingTask.isActive} onChange={handleEditInputChange} />
              </div>
              <div className="form-actions">
                <button type="submit" className="admin-button">Update Task</button>
                <button type="button" className="admin-button cancel-button" onClick={() => setEditingTask(null)}>Cancel Edit</button>
              </div>
            </form>
            <hr/>
          </div>
        )}

        {/* Add New Task Form (always visible unless editing) */}
        {!editingTask && (
          <>
            <h4>Add New Task</h4>
            <form onSubmit={handleAddTask} className="admin-form">
              <div className="form-group">
                <label htmlFor="newTaskTitle">Title:</label>
                <input type="text" id="newTaskTitle" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Enter task title" />
              </div>
              <div className="form-group">
                <label htmlFor="newTaskDescription">Description:</label>
                <textarea id="newTaskDescription" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} placeholder="Enter task description"></textarea>
              </div>
              <div className="form-group">
                <label htmlFor="newTaskPoints">Points:</label>
                <input type="number" id="newTaskPoints" value={newTaskPoints} onChange={(e) => setNewTaskPoints(e.target.value)} placeholder="Enter points" />
              </div>
              <div className="form-group">
                <label htmlFor="newTaskLink">Link (Optional):</label>
                <input type="text" id="newTaskLink" value={newTaskLink} onChange={(e) => setNewTaskLink(e.target.value)} placeholder="Enter task link" />
              </div>
              <button type="submit" className="admin-button">Add Task</button>
            </form>
          </>
        )}
        {errorTasks && <p className="error-message">{errorTasks}</p>}

        <h4>Current Tasks</h4>
        {isLoadingTasks && <p>Loading tasks...</p>}
        <div className="admin-list-placeholder"> {/* This class name might need adjustment if it implies static content */}
          {tasks.length > 0 ? tasks.map(task => (
            <div key={task.id} className="admin-list-item">
              <span>{task.title} ({task.points} points) - Active: {task.isActive ? 'Yes' : 'No'}</span>
              <div>
                <button onClick={() => handleInitiateEditTask(task)} className="admin-button-small edit">Edit</button>
                <button onClick={() => handleDeleteTask(task.id)} className="admin-button-small delete">Delete</button>
              </div>
            </div>
          )) : !isLoadingTasks && <p>No tasks found.</p>}
        </div>
      </section>

      {/* User Management Section */}
      <section className="admin-section user-management">
        <h3>User Management</h3>
        <form onSubmit={handleSearchUser} className="admin-search-form">
          <input
            type="text"
            placeholder="Search by exact username"
            className="admin-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="admin-button search-button">Search</button>
          <button type="button" className="admin-button clear-button" onClick={clearUserSearch}>Clear</button>
        </form>
        {errorUsers && <p className="error-message">{errorUsers}</p>}

        {/* Edit User Form (conditional) */}
        {editingUser && (
          <div className="edit-user-form-container">
            <h4>Edit User: {editingUser.username || editingUser.id}</h4>
            <form onSubmit={handleUpdateUser} className="admin-form">
              <p>User ID: {editingUser.id}</p>
              <p>Username: {editingUser.username || 'N/A'}</p>
              <p>First Name: {editingUser.firstName || 'N/A'}</p>
              <div className="form-group">
                <label htmlFor="editUserPoints">Points:</label>
                <input type="number" id="editUserPoints" value={editUserPoints} onChange={(e) => setEditUserPoints(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="editUserMiningRateModifier">Mining Rate Modifier:</label>
                <input type="number" step="0.01" id="editUserMiningRateModifier" value={editUserMiningRateModifier} onChange={(e) => setEditUserMiningRateModifier(e.target.value)} />
              </div>
              <div className="form-actions">
                <button type="submit" className="admin-button">Update User</button>
                <button type="button" className="admin-button cancel-button" onClick={() => setEditingUser(null)}>Cancel Edit</button>
              </div>
            </form>
            <hr />
          </div>
        )}

        <h4>User List</h4>
        {isLoadingUsers && <p>Loading users...</p>}
        <div className="admin-list-placeholder"> {/* This class name might need adjustment */}
          {users.length > 0 ? users.map(user => (
            <div key={user.id} className="admin-list-item">
              <span>
                ID: {user.id} <br />
                Username: {user.username || 'N/A'} | Name: {user.firstName || 'N/A'} <br />
                Points: {user.points || 0} | Modifier: {user.miningRateModifier || 1.0}
              </span>
              <div>
                <button onClick={() => handleInitiateEditUser(user)} className="admin-button-small edit">Edit</button>
                {/* Add other user actions if needed, e.g., View Details, Ban (requires more fields/logic) */}
              </div>
            </div>
          )) : !isLoadingUsers && <p>No users found for the current search/filter.</p>}
        </div>
      </section>
    </div>
  );
}

export default AdminPage;
