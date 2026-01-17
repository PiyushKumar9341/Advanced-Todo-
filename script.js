document.addEventListener('DOMContentLoaded', async function () {
  // --- Core To-Do List Elements ---
  const taskInput = document.getElementById('taskInput');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');
  let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

  // --- AI Welcome / User Name Elements ---
  const welcomeOverlay = document.getElementById('welcomeOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');
  const userNameInput = document.getElementById('userNameInput');
  const submitNameBtn = document.getElementById('submitNameBtn');
  const closeWelcomeBtn = document.getElementById('closeWelcomeBtn');
  const storedUserName = localStorage.getItem('todoUserName');
  const userNameDisplay = document.getElementById('userName');
  const userNameFooter = document.getElementById('userNameFooter');

  // --- Misc UI Elements ---
  const messageBox = document.getElementById('messageBox');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const quoteEl = document.getElementById('quote');
  const scrollToTopBtn = document.getElementById('scrollToTopBtn');
  const emailAddressFooter = document.getElementById('emailAddressFooter');
  const copyEmailBtnFooter = document.getElementById('copyEmailBtnFooter');

  // Stats bar (optional small enhancement)
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

  // --- Helper Functions ---

  function getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  async function fetchAiWelcomeMessage(userName) {
    try {
      const response = await fetch('/.netlify/functions/get-ai-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName: userName, timeOfDay: getTimeOfDay() })
      });
      const data = await response.json();
      return response.ok && data.message
        ? data.message
        : `Hello ${userName}, let's get organized!`;
    } catch (error) {
      return `Hello ${userName}, ready for a productive ${getTimeOfDay()}?`;
    }
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
    if (userNameFooter) userNameFooter.textContent = userName;

    const aiMessage = await fetchAiWelcomeMessage(userName);
    modalMessage.textContent = aiMessage;

    // Auto-close after 4s
    setTimeout(() => {
      welcomeOverlay.style.display = 'none';
    }, 4000);
  }

  // --- Welcome Logic Initial Check ---

  if (storedUserName) {
    // Returning user
    if (userNameDisplay) userNameDisplay.textContent = storedUserName;
    if (userNameFooter) userNameFooter.textContent = storedUserName;
    handleWelcomeFlow(storedUserName);
  } else if (welcomeOverlay) {
    // First time user experience
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

  // Optional: allow closing overlay manually (if you want)
  if (closeWelcomeBtn && welcomeOverlay) {
    closeWelcomeBtn.addEventListener('click', () => {
      welcomeOverlay.style.display = 'none';
    });
  }

  // --- Tasks & LocalStorage ---

  function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    updateStats();
  }

  // Filter handling
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

    filtered.forEach((task, indexInFiltered) => {
      // Map filtered index to real index
      const realIndex = tasks.indexOf(task);

      const li = document.createElement('li');
      if (task.completed) li.classList.add('completed');

      const textSpan = document.createElement('span');
      textSpan.textContent = task.text;

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'flex space-x-2';

      const completeBtn = document.createElement('button');
      completeBtn.className = 'complete-btn';
      completeBtn.textContent = task.completed ? 'Undo' : 'Done';
      completeBtn.addEventListener('click', () => {
        tasks[realIndex].completed = !tasks[realIndex].completed;
        saveTasks();
        renderTasks();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        tasks.splice(realIndex, 1);
        saveTasks();
        renderTasks();
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

  // --- Add Task ---

  function addTask() {
    if (!taskInput) return;
    const text = taskInput.value.trim();
    if (!text) return;

    tasks.push({ text, completed: false });
    taskInput.value = '';
    saveTasks();
    renderTasks();
  }

  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addTask);
  }
  if (taskInput) {
    taskInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') addTask();
    });
  }

  // --- Filter Buttons ---

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

  // Set default active filter button
  const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
  if (allBtn) allBtn.classList.add('active');

  // --- Dark Mode Toggle ---

  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
      darkModeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    });

    // Initial state from localStorage
    if (localStorage.getItem('darkMode') === 'enabled') {
      document.body.classList.add('dark-mode');
      darkModeToggle.textContent = 'Light Mode';
    } else {
      darkModeToggle.textContent = 'Dark Mode';
    }
  }

  // --- Motivational Quote (simple local array) ---

  if (quoteEl) {
    const quotes = [
      'Small steps every day lead to big results.',
      'Your future is created by what you do today, not tomorrow.',
      'Focus on being productive, not busy.',
      'Done is better than perfect.',
      'Every task you finish is a win.'
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    quoteEl.textContent = randomQuote;
  }

  // --- Scroll to Top Button ---

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

  // --- Copy Email to Clipboard + Message Box ---

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

  // --- Name hover glow (matches CSS) ---

  if (userNameDisplay) {
    userNameDisplay.addEventListener('mouseenter', () => {
      userNameDisplay.classList.add('hovered');
    });
    userNameDisplay.addEventListener('mouseleave', () => {
      userNameDisplay.classList.remove('hovered');
    });
  }

  // --- Initial Render ---
  renderTasks();
});
