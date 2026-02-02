// =========================
// Firebase Setup (top level)
// =========================

const firebaseConfig = {
  apiKey: "AIzaSyDJfJ1NkJOmmsYSb7RLJPFeZR_8-tqoUgQ",
  authDomain: "advanced-todo-b93ba.firebaseapp.com",
  projectId: "advanced-todo-b93ba",
  storageBucket: "advanced-todo-b93ba.firebasestorage.app",
  messagingSenderId: "685947792786",
  appId: "1:685947792786:web:e49cf23e4a977c4c0be54b",
  measurementId: "G-CWBZZYCR1M"
};

// Initialize Firebase (compat)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null; // Firebase user (null if logged out)


// =========================
// Main App Logic
// =========================

document.addEventListener('DOMContentLoaded', async function () {
  // --- Core To-Do List Elements ---
  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');

  // In-memory tasks, synced with Firestore
  let tasks = [];

  // --- AI Welcome / User Name Elements ---
  const welcomeOverlay = document.getElementById('welcomeOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const userNameInput = document.getElementById('userNameInput');
  const submitNameBtn = document.getElementById('submitNameBtn');
  const closeWelcomeBtn = document.getElementById('closeWelcomeBtn');
  const storedUserName = localStorage.getItem('todoUserName');
  const userNameDisplay = document.getElementById('userName');
  const welcomeGoogleBtn = document.getElementById('welcomeGoogleBtn');

  // --- Auth Buttons ---
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // --- Misc UI Elements ---
  const messageBox = document.getElementById('messageBox');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const quoteEl = document.getElementById('quote');
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  const emailAddressFooter = document.getElementById('emailAddressFooter');
  const copyEmailBtnFooter = document.getElementById('copyEmailBtnFooter');

  // Stats bar
  let statsBar = document.getElementById('statsBar');
  if (!statsBar) {
    statsBar = document.createElement('div');
    statsBar.id = 'statsBar';
    statsBar.style.margin = '10px 0 15px';
    statsBar.style.fontSize = '0.9em';
    statsBar.style.color = '#555';
    if (taskList && taskList.parentElement) {
      taskList.parentElement.insertBefore(statsBar, taskList);
    }
  }

  // =========================
  // Helper Functions
  // =========================

  function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  // Simplified: no Netlify function, just static AI-like message
  async function fetchAiWelcomeMessage(userName) {
    return `Hello ${userName}, ready for a productive ${getTimeOfDay()}?`;
  }

  async function handleWelcomeFlow(userName) {
    if (!welcomeOverlay) return;

    // Loading state
    modalTitle.textContent = 'Welcome back!';
    modalMessage.textContent = 'Generating a personalized message...';
    if (userNameInput) userNameInput.style.display = 'none';
    if (submitNameBtn) submitNameBtn.style.display = 'none';
    if (closeWelcomeBtn) closeWelcomeBtn.style.display = 'none';
    welcomeOverlay.style.display = 'flex';

    if (userNameDisplay) userNameDisplay.textContent = userName;

    const aiMessage = await fetchAiWelcomeMessage(userName);
    modalMessage.textContent = aiMessage;

    // Auto-close after 4s
    setTimeout(() => {
      welcomeOverlay.style.display = 'none';
    }, 4000);
  }

  // =========================
  // Firestore: Tasks CRUD
  // =========================

  function getUserTodosCollection() {
    if (!currentUser) return null;
    return db.collection('todos').doc(currentUser.uid).collection('items');
  }

  async function loadTasksFromFirestore() {
    if (!currentUser) {
      tasks = [];
      renderTasks();
      return;
    }

    const colRef = getUserTodosCollection();
    if (!colRef) return;

    try {
      const snapshot = await colRef.orderBy('createdAt', 'asc').get();
      tasks = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        tasks.push({
          id: doc.id,
          text: data.text,
          completed: data.completed || false
        });
      });
      renderTasks();
    } catch (err) {
      console.error('Error loading tasks from Firestore:', err);
      showMessage('Failed to load tasks.');
    }
  }

  async function addTaskToFirestore(text) {
    if (!currentUser) {
      showMessage('Please sign in to save tasks.');
      return;
    }
    const colRef = getUserTodosCollection();
    if (!colRef) return;

    try {
      const docRef = await colRef.add({
        text,
        completed: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      tasks.push({
        id: docRef.id,
        text,
        completed: false
      });
      renderTasks();
    } catch (err) {
      console.error('Error adding task:', err);
      showMessage('Failed to add task.');
    }
  }

  async function toggleTaskCompletionInFirestore(task) {
    if (!currentUser || !task.id) return;
    const colRef = getUserTodosCollection();
    if (!colRef) return;

    try {
      await colRef.doc(task.id).update({
        completed: !task.completed
      });
    } catch (err) {
      console.error('Error updating task:', err);
      showMessage('Failed to update task.');
    }
  }

  async function deleteTaskFromFirestore(task) {
    if (!currentUser || !task.id) return;
    const colRef = getUserTodosCollection();
    if (!colRef) return;

    try {
      await colRef.doc(task.id).delete();
    } catch (err) {
      console.error('Error deleting task:', err);
      showMessage('Failed to delete task.');
    }
  }

  // =========================
  // Welcome Logic Initial Check (local name)
  // =========================

  if (storedUserName) {
    if (userNameDisplay) userNameDisplay.textContent = storedUserName;
    handleWelcomeFlow(storedUserName);
  } else if (welcomeOverlay) {
    welcomeOverlay.style.display = 'flex';
    modalTitle.textContent = 'Welcome to your Advanced TODO!';
    modalMessage.textContent = 'What should I call you?';
    if (userNameInput) userNameInput.style.display = 'block';
    if (submitNameBtn) submitNameBtn.style.display = 'block';
    if (closeWelcomeBtn) closeWelcomeBtn.style.display = 'none';

    if (submitNameBtn) {
      submitNameBtn.onclick = async () => {
        const name = userNameInput.value.trim();
        if (name) {
          localStorage.setItem('todoUserName', name);
          await handleWelcomeFlow(name);
        }
      };
    }
  }

  if (closeWelcomeBtn && welcomeOverlay) {
    closeWelcomeBtn.addEventListener('click', () => {
      welcomeOverlay.style.display = 'none';
    });
  }

  // =========================
  // Tasks (in-memory + Firestore)
  // =========================

  let currentFilter = 'all';

  function getFilteredTasks() {
    if (currentFilter === 'active') {
      return tasks.filter(t => !t.completed);
    }
    if (currentFilter === 'completed') {
      return tasks.filter(t => t.completed);
    }
    return tasks;
  }

  function renderTasks() {
    if (!taskList) return;
    taskList.innerHTML = '';

    const filtered = getFilteredTasks();

    filtered.forEach(task => {
      const li = document.createElement('li');
      if (task.completed) li.classList.add('completed');

      const textSpan = document.createElement('span');
      textSpan.textContent = task.text;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'flex space-x-2';

      const completeBtn = document.createElement('button');
      completeBtn.className = 'complete-btn';
      completeBtn.textContent = task.completed ? 'Undo' : 'Done';
      completeBtn.addEventListener('click', async () => {
        task.completed = !task.completed;
        renderTasks();
        await toggleTaskCompletionInFirestore(task);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', async () => {
        tasks = tasks.filter(t => t !== task);
        renderTasks();
        await deleteTaskFromFirestore(task);
      });

      actionsDiv.appendChild(completeBtn);
      actionsDiv.appendChild(deleteBtn);

      li.appendChild(textSpan);
      li.appendChild(actionsDiv);
      taskList.appendChild(li);
    });

    updateStats();
  }

  function updateStats() {
    if (!statsBar) return;
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const remaining = total - completed;
    statsBar.textContent = `Total: ${total} · Completed: ${completed} · Remaining: ${remaining}`;
  }

  async function addTask() {
    if (!taskInput) return;
    const text = taskInput.value.trim();
    if (!text) return;

    await addTaskToFirestore(text);
    taskInput.value = '';
  }

  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addTask);
  }
  if (taskInput) {
    taskInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') addTask();
    });
  }

  // =========================
  // Filter Buttons
  // =========================

  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filterValue = btn.dataset.filter || 'all';
      currentFilter = filterValue;

      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      renderTasks();
    });
  });

  const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
  if (allBtn) allBtn.classList.add('active');

  // =========================
  // Dark Mode
  // =========================

  function applyDarkModeFromStorage() {
    const isDark = localStorage.getItem('darkMode') === 'enabled';
    if (isDark) {
      document.body.classList.add('dark-mode');
      if (darkModeToggle) darkModeToggle.textContent = 'Light Mode';
    } else {
      document.body.classList.remove('dark-mode');
      if (darkModeToggle) darkModeToggle.textContent = 'Dark Mode';
    }
  }

  applyDarkModeFromStorage();

  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-mode');
      localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
      darkModeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    });
  }

  // =========================
  // Motivational Quote
  // =========================

  if (quoteEl) {
    const quotes = [
      'Small steps every day lead to big results.',
      'Your future is created by what you do today, not tomorrow.',
      'Focus on being productive, not busy.',
      'Done is better than perfect.',
      'Every task you finish is a win.',
      'Start with one small task, then another.',
      'Every finished task is a step forward.',
      'Five focused minutes can change your whole day.',
      'Write it down, do it, then relax.',
      'Tiny progress every day beats big plans someday.',
      'Clear list, clear mind, better focus.',
      'If it takes less than two minutes, do it now.',
      'Your future self will thank you for this task.',
      'One thing at a time, done well.',
      'Today’s actions are tomorrow’s results.'
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    quoteEl.textContent = randomQuote;
  }

  // =========================
  // Scroll to Top Button
  // =========================

  if (scrollToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 200) {
        scrollToTopBtn.style.display = 'block';
      } else {
        scrollToTopBtn.style.display = 'none';
      }
    });

    scrollToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // =========================
  // Copy Email + Messages
  // =========================

  function showMessage(text) {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.style.display = 'block';
    messageBox.style.opacity = '1';
    messageBox.style.backgroundColor = '#e6fffa';
    messageBox.style.border = '1px solid #38b2ac';
    messageBox.style.color = '#234e52';

    setTimeout(() => {
      messageBox.style.opacity = '0';
      setTimeout(() => {
        messageBox.style.display = 'none';
      }, 300);
    }, 2000);
  }

  if (copyEmailBtnFooter && emailAddressFooter) {
    copyEmailBtnFooter.addEventListener('click', async () => {
      const email = emailAddressFooter.textContent.trim();
      try {
        await navigator.clipboard.writeText(email);
        showMessage('Email copied to clipboard!');
      } catch (err) {
        showMessage('Failed to copy email.');
      }
    });
  }

  // =========================
  // Name hover glow
  // =========================

  if (userNameDisplay) {
    userNameDisplay.addEventListener('mouseenter', () => {
      userNameDisplay.classList.add('hovered');
    });
    userNameDisplay.addEventListener('mouseleave', () => {
      userNameDisplay.classList.remove('hovered');
    });
  }

  // =========================
  // Auth: Google Login / Logout
  // =========================

  async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (err) {
      console.error('Google sign-in error:', err);
      showMessage('Sign-in failed.');
    }
  }

  async function signOutUser() {
    try {
      await auth.signOut();
    } catch (err) {
      console.error('Sign-out error:', err);
      showMessage('Sign-out failed.');
    }
  }

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', signInWithGoogle);
  }

  if (welcomeGoogleBtn) {
    welcomeGoogleBtn.addEventListener('click', signInWithGoogle);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', signOutUser);
  }

  // =========================
  // Auth State Listener
  // =========================

  auth.onAuthStateChanged(async (user) => {
    currentUser = user || null;

    if (currentUser) {
      if (googleLoginBtn) googleLoginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';

      if (!storedUserName && userNameDisplay) {
        userNameDisplay.textContent = currentUser.displayName || 'Friend';
      }

      await loadTasksFromFirestore();
      showMessage('Signed in successfully!');
    } else {
      tasks = [];
      renderTasks();

      if (googleLoginBtn) googleLoginBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';

      showMessage('You are signed out.');
    }
  });

  // Initial render
  renderTasks();
});
