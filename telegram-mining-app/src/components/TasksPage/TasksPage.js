import React, { useState, useEffect, useCallback } from 'react';
import './TasksPage.css';
import { db } from '../../firebaseConfig'; // Adjusted path
import { collection, getDocs, doc, runTransaction, Timestamp, writeBatch } from "firebase/firestore";

function TasksPage() {
  const [telegramUser, setTelegramUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completingTaskId, setCompletingTaskId] = useState(null); // For loading state on specific button

  // Get Telegram User Info
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    const user = tg.initDataUnsafe?.user;
    if (user && user.id) {
      setTelegramUser(user);
    } else {
      setError("Unable to identify Telegram user. Please try launching from Telegram.");
      setIsLoading(false);
    }
  }, []);

  // Fetch Tasks and User Completions
  const fetchTasksAndUserCompletions = useCallback(async (userId) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch all active tasks
      const tasksCol = collection(db, 'tasks');
      // Query q = query(tasksCol, where("isActive", "==", true)); // Example if filtering by isActive
      const taskSnapshot = await getDocs(tasksCol);
      const fetchedTasks = taskSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Filter for isActive client-side if not done in query, or if isActive field might be missing
      setTasks(fetchedTasks.filter(task => task.isActive !== false));

      // Fetch current user's completed tasks
      if (userId) {
        const completedTasksPath = `users/${userId}/completedTasks`;
        const completedTasksCol = collection(db, completedTasksPath);
        const completedSnapshot = await getDocs(completedTasksCol);
        const completedIds = new Set(completedSnapshot.docs.map(doc => doc.id));
        setCompletedTasks(completedIds);
      }
    } catch (e) {
      console.error("Error fetching tasks or completions:", e);
      setError("Failed to load tasks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (telegramUser && telegramUser.id) {
      fetchTasksAndUserCompletions(telegramUser.id);
    } else if (!telegramUser && !isLoading && !error) { // Handles case where tg user is null initially but not an error
        setError("Telegram user not available. Cannot load tasks specific data.");
        setIsLoading(false);
    }
  }, [telegramUser, fetchTasksAndUserCompletions, isLoading, error]);


  const handleCompleteTask = async (taskId, taskPoints) => {
    if (!telegramUser || !telegramUser.id) {
      setError("User not identified. Cannot complete task.");
      return;
    }
    if (completedTasks.has(taskId)) {
      alert("Task already completed!");
      return;
    }

    setCompletingTaskId(taskId);
    setError(null);

    try {
      const userIdStr = String(telegramUser.id);
      const userRef = doc(db, 'users', userIdStr);
      const completedTaskRef = doc(db, `users/${userIdStr}/completedTasks`, taskId);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error("User document does not exist!");
          // Or create it: transaction.set(userRef, { points: taskPoints, ...defaultUserData });
          // For this flow, we assume user doc is created on HomePage visit.
        }

        const currentPoints = userDoc.data().points || 0;
        transaction.update(userRef, { points: currentPoints + taskPoints });
        transaction.set(completedTaskRef, {
          completedAt: Timestamp.now(),
          pointsEarned: taskPoints
        });
      });

      setCompletedTasks(prev => new Set(prev).add(taskId));
      // Optionally, update a global state for total points if not relying on HomePage to show it.
      alert(`Task completed! ${taskPoints} points awarded.`);

    } catch (e) {
      console.error("Error completing task:", e);
      setError(`Failed to complete task: ${e.message}. Please try again.`);
      alert(`Error: ${e.message}`);
    } finally {
      setCompletingTaskId(null);
    }
  };

  const handleTaskAction = (task) => {
    if (task.link) {
      window.open(task.link, '_blank');
      // Optionally, some tasks might auto-complete after link click with a delay or confirmation
      // For now, manual completion is required via the "Mark as Complete" button
    }
  };

  if (isLoading) {
    return <div className="tasks-page"><div className="loading-spinner"></div><p>Loading tasks...</p></div>;
  }

  if (error) {
    return <div className="tasks-page"><p className="error-message">{error}</p></div>;
  }

  return (
    <div className="tasks-page">
      <h2>Available Tasks</h2>
      {tasks.length === 0 && !isLoading && <p>No tasks available at the moment. Check back soon!</p>}
      <ul className="tasks-list">
        {tasks.map(task => (
          <li key={task.id} className={`task-item ${completedTasks.has(task.id) ? 'completed' : ''}`}>
            <div className="task-info">
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <p className="task-points">Points: {task.points}</p>
            </div>
            <div className="task-actions">
              {task.link && !completedTasks.has(task.id) && (
                <button
                  onClick={() => handleTaskAction(task)}
                  className="task-action-button"
                  disabled={completingTaskId === task.id}
                >
                  Go to Task
                </button>
              )}
              <button
                onClick={() => handleCompleteTask(task.id, task.points)}
                disabled={completedTasks.has(task.id) || completingTaskId === task.id}
                className="complete-button"
              >
                {completingTaskId === task.id
                  ? "Completing..."
                  : completedTasks.has(task.id)
                    ? 'Completed'
                    : 'Mark as Complete'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TasksPage;
