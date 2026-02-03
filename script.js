// =========================
// Firebase Setup (compat)
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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// =========================
// DOM Elements
// =========================

const taskInput            = document.getElementById('taskInput');
const addTaskBtn           = document.getElementById('addTaskBtn');
const taskList             = document.getElementById('taskList');
const filterButtons        = document.querySelectorAll('.filter-btn');
const clearAllBtn          = document.getElementById('clearAllBtn');

const darkModeToggle       = document.getElementById('darkModeToggle');
const scrollToTopBtn       = document.getElementById('scrollToTopBtn');

const quoteElement         = document.getElementById('quote');
const messageBox           = document.getElementById('messageBox');

const googleLoginBtn       = document.getElementById('googleLoginBtn');
const logoutBtn            = document.getElementById('logoutBtn');

const personalizedGreeting = document.getElementById('personalizedGreeting');
const userNameSpan         = document.getElementById('userName');

const welcomeOverlay       = document.getElementById('welcomeOverlay');
const welcomeModal         = document.getElementById('welcomeModal');
const userNameInput        = document.getElementById('userNameInput');
const submitNameBtn        = document.getElementById('submitNameBtn');
const welcomeDescription   = document.getElementById('welcomeDescription');

const emailAddressFooter   = document.getElementById('emailAddressFooter');
const copyEmailBtnFooter   = document.getElementById('copyEmailBtnFooter');

const statsBar             = document.getElementById('statsBar');

// =========================
// State
// =========================

let currentFilter = 'all';
let currentUser   = null;   // firebase user
let tasks         = [];

// =========================
// Helper – toast messages
// =========================

function showMessage(text, type = 'info') {
  if (!messageBox) return;
  messageBox.textContent = text;
  messageBox.style.display = 'block';
  messageBox.style.opacity = '1';

  if (type === 'error') {
    messageBox.style.backgroundColor = '#fee2e2';
    messageBox.style.color = '#b91c1c';
  } else {
    messageBox.style.backgroundColor = '#d1fae5';
    messageBox.style.color = '#065f46';
  }

  setTimeout(() => {
    messageBox.style.opacity = '0';
    setTimeout(() => {
      messageBox.style.display = 'none';
    }, 300);
  }, 2000);
}

// =========================
// Name handling + greeting
// =========================

function saveLocalName(name) {
  if (!name) return;
  localStorage.setItem('userName', name);
}

function getLocalName() {
  return localStorage.getItem('userName') || '';
}

function clearLocalName() {
  localStorage.removeItem('userName');
}

// AI message for popup card (only inside modal)
function getPopupAiMessage(name) {
  const now  = new Date();
  const hour = now.getHours();

  let line = 'Let’s start with one tiny task.';
  if (hour >= 5 && hour < 12) {
    line = 'Perfect time to set the tone for your morning.';
  } else if (hour >= 12 && hour < 17) {
    line = 'Afternoon boost: pick one task and move it forward.';
  } else if (hour >= 17 && hour < 22) {
    line = 'Evening focus: wrap the day with one solid win.';
  } else {
    line = 'Late hours, but a small step now will make tomorrow easier.';
  }

  const cleanName = name && name.trim() ? name.trim() : 'there';
  return `${cleanName}, ${line}`;
}

// Card greeting: sirf "Hello.. name🚀"
function updateGreeting(name) {
  const greetingEl = document.getElementById('personalizedGreeting');
  const nameEl     = document.getElementById('userName');
  if (!greetingEl || !nameEl) return;

  if (name && name.trim() !== '') {
    greetingEl.textContent = 'Hello.. ';
    nameEl.textContent = name;
    greetingEl.appendChild(nameEl);
    greetingEl.innerHTML += '🚀';
    greetingEl.style.display = 'block';
  } else {
    nameEl.textContent = '';
    greetingEl.style.display = 'none';
  }
}

// =========================
// AI Welcome modal
// =========================

function openWelcomeModal() {
  if (!welcomeOverlay) return;
  welcomeOverlay.style.display = 'flex';
}

function closeWelcomeModal() {
  if (!welcomeOverlay) return;
  welcomeOverlay.style.display = 'none';
}

// "Let's Go" + AI message inside popup
if (submitNameBtn) {
  submitNameBtn.addEventListener('click', () => {
    const name = userNameInput.value.trim();
    if (!name) {
      showMessage('Please enter your name.', 'error');
      return;
    }

    // Naam store + outer greeting update
    saveLocalName(name);
    updateGreeting(name);

    // Button label change
    submitNameBtn.textContent = 'Nice, let’s go!';

    // Zyada time ke लिए popup dikhana (e.g. 2500ms)
    setTimeout(() => {
      closeWelcomeModal();
      submitNameBtn.textContent = "Let's Go";
    }, 2500); // yaha duration adjust karo (ms me)
  });
}


// =========================
// Firestore helpers (per user)
// =========================

function getTasksCollectionRef(uid) {
  return db.collection('users').doc(uid).collection('tasks');
}

async function loadTasksForUser(uid) {
  if (!uid) {
    tasks = [];
    renderTasks();
    return;
  }
  try {
    const snap = await getTasksCollectionRef(uid).orderBy('createdAt', 'asc').get();
    tasks = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderTasks();
  } catch (err) {
    console.error('Error loading tasks:', err);
    showMessage('Could not load tasks (check Firestore rules).', 'error');
    tasks = [];
    renderTasks();
  }
}

async function addTaskToUser(uid, text) {
  if (!uid) return;
  const colRef = getTasksCollectionRef(uid);
  const docRef = await colRef.add({
    text,
    completed: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  tasks.push({ id: docRef.id, text, completed: false });
  renderTasks();
}

async function updateTaskCompletion(uid, taskId, completed) {
  if (!uid) return;
  const colRef = getTasksCollectionRef(uid);
  await colRef.doc(taskId).update({ completed });
  const t = tasks.find(t => t.id === taskId);
  if (t) t.completed = completed;
  renderTasks();
}

async function deleteTask(uid, taskId) {
  if (!uid) return;
  const colRef = getTasksCollectionRef(uid);
  await colRef.doc(taskId).delete();
  tasks = tasks.filter(t => t.id !== taskId);
  renderTasks();
}

async function clearAllTasks(uid) {
  if (!uid) return;
  const colRef = getTasksCollectionRef(uid);
  const snap = await colRef.get();
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  tasks = [];
  renderTasks();
}

// =========================
// Render tasks + stats
// =========================

function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = '';

  let filtered = tasks;
  if (currentFilter === 'active') {
    filtered = tasks.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    filtered = tasks.filter(t => t.completed);
  }

  filtered.forEach(task => {
    const li = document.createElement('li');
    if (task.completed) li.classList.add('completed');

    const span = document.createElement('span');
    span.textContent = task.text;

    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'flex space-x-2';

    const completeBtn = document.createElement('button');
    completeBtn.textContent = task.completed ? 'Undo' : 'Complete';
    completeBtn.className = 'complete-btn';
    completeBtn.addEventListener('click', async () => {
      if (!currentUser) {
        showMessage('Sign in to manage tasks.', 'error');
        return;
      }
      const newState = !task.completed;
      await updateTaskCompletion(currentUser.uid, task.id, newState);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', async () => {
      if (!currentUser) {
        showMessage('Sign in to delete tasks.', 'error');
        return;
      }
      await deleteTask(currentUser.uid, task.id);
    });

    btnWrapper.appendChild(completeBtn);
    btnWrapper.appendChild(deleteBtn);

    li.appendChild(span);
    li.appendChild(btnWrapper);

    taskList.appendChild(li);
  });

  if (statsBar) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    statsBar.textContent = `Total: ${total} • Active: ${active} • Completed: ${completed}`;
  }
}

// =========================
// Filters
// =========================

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter || 'all';
    renderTasks();
  });
});

// =========================
// Add Task
// =========================

addTaskBtn.addEventListener('click', async () => {
  const text = taskInput.value.trim();
  if (!text) {
    showMessage('Please enter a task.', 'error');
    return;
  }
  if (!currentUser) {
    showMessage('Sign in with Google to save tasks.', 'error');
    return;
  }
  try {
    await addTaskToUser(currentUser.uid, text);
    taskInput.value = '';
  } catch (err) {
    console.error('Error adding task:', err);
    showMessage('Could not add task.', 'error');
  }
});

taskInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') addTaskBtn.click();
});

// =========================
// Clear All
// =========================

if (clearAllBtn) {
  clearAllBtn.addEventListener('click', async () => {
    if (!currentUser) {
      showMessage('Sign in to clear tasks.', 'error');
      return;
    }
    if (!confirm('Delete all tasks?')) return;
    try {
      await clearAllTasks(currentUser.uid);
      showMessage('All tasks cleared.');
    } catch (err) {
      console.error('Error clearing tasks:', err);
      showMessage('Could not clear tasks.', 'error');
    }
  });
}

// =========================
// Dark Mode
// =========================

function applySavedTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.body.classList.add('dark-mode');
    if (darkModeToggle) darkModeToggle.textContent = 'Light Mode';
  } else {
    document.body.classList.remove('dark-mode');
    if (darkModeToggle) darkModeToggle.textContent = 'Dark Mode';
  }
}
applySavedTheme();

if (darkModeToggle) {
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    darkModeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
  });
}

// =========================
// Scroll to top
// =========================

window.addEventListener('scroll', () => {
  if (!scrollToTopBtn) return;
  scrollToTopBtn.style.display =
    document.documentElement.scrollTop > 200 ? 'block' : 'none';
});

if (scrollToTopBtn) {
  scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// =========================
// Motivational Quote
// =========================

const quotes = [
  "Small steps every day lead to big results.",
  "Done is better than perfect.",
  "You don’t have to be great to start, but you have to start to be great.",
  "Focus on the next task, not the whole mountain.",
  "Progress, not perfection.",
  "One small task now makes tomorrow easier.",
  "You’re one focused session away from feeling proud of yourself.",
  "If it takes less than 2 minutes, do it now.",
  "Slow progress is still progress.",
  "Discipline beats motivation.",
  "Your future self is watching what you do today.",
  "Action cures overthinking.",
  "Clarity comes from doing, not from thinking.",
  "Win the day by winning the next 10 minutes.",
  "You don’t need more time, you need more focus.",
  "Tiny habits, big impact.",
  "Don’t break the chain—do one tiny thing today.",
  "A finished small task is better than a perfect idea in your head.",
  "The best time to start was yesterday. The next best time is now.",
  "Momentum is built, not found."
];

function showRandomQuote() {
  if (!quoteElement) return;
  const idx = Math.floor(Math.random() * quotes.length);
  quoteElement.textContent = quotes[idx];
}
showRandomQuote();

// =========================
// Copy email footer
// =========================

if (copyEmailBtnFooter && emailAddressFooter) {
  copyEmailBtnFooter.addEventListener('click', async () => {
    const email = emailAddressFooter.textContent.trim();
    try {
      await navigator.clipboard.writeText(email);
      showMessage('Email copied to clipboard.');
    } catch {
      showMessage('Could not copy email.', 'error');
    }
  });
}

// =========================
// Google Auth (sirf sync)
// =========================

const provider = new firebase.auth.GoogleAuthProvider();

if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    try {
      const result = await auth.signInWithPopup(provider);
      console.log('Signed in as:', result.user && result.user.email);
    } catch (err) {
      console.error('Google sign-in error:', err.code, err.message);
      showMessage('Google sign-in failed.', 'error');
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    try {
      await auth.signOut();

      currentUser = null;
      tasks = [];
      renderTasks();

      clearLocalName();
      updateGreeting('');

      if (googleLoginBtn) googleLoginBtn.style.display = 'inline-block';
      if (logoutBtn)      logoutBtn.style.display = 'none';

      showMessage('You are signed out.');
    } catch (err) {
      console.error('Error signing out:', err);
      showMessage('Error while signing out.', 'error');
    }
  });
}

// =========================
// Auth State Observer
// =========================

auth.onAuthStateChanged(async (user) => {
  currentUser = user;

  if (user) {
    if (googleLoginBtn) googleLoginBtn.style.display = 'none';
    if (logoutBtn)      logoutBtn.style.display = 'inline-block';

    const savedName = getLocalName();
    if (savedName) {
      updateGreeting(savedName);
    } else {
      updateGreeting('');
      openWelcomeModal();   // logged-in but no name yet
    }

    await loadTasksForUser(user.uid);
  } else {
    if (googleLoginBtn) googleLoginBtn.style.display = 'inline-block';
    if (logoutBtn)      logoutBtn.style.display = 'none';

    tasks = [];
    renderTasks();

    clearLocalName();
    updateGreeting('');
  }
});

// =========================
// Initial UI
// =========================

window.addEventListener('load', () => {
  const savedName = getLocalName();
  if (savedName) {
    updateGreeting(savedName);
  } else {
    updateGreeting('');
    openWelcomeModal();   // first visit / no name → AI welcome
  }
  renderTasks();
});
