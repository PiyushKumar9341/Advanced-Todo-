document.addEventListener('DOMContentLoaded', async function() {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    const welcomeOverlay = document.getElementById('welcomeOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const userNameInput = document.getElementById('userNameInput');
    const submitNameBtn = document.getElementById('submitNameBtn');
    const closeWelcomeBtn = document.getElementById('closeWelcomeBtn');
    const storedUserName = localStorage.getItem('todoUserName');
    const userNameDisplay = document.getElementById('userName');

    const messageBox = document.getElementById('messageBox');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const quoteEl = document.getElementById('quote');

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
            return response.ok ? data.message : `Hello ${userName}, let's get organized!`;
        } catch (error) {
            return `Hello ${userName}, ready for a productive ${getTimeOfDay()}?`;
        }
    }

    async function handleWelcomeFlow(userName) {
        // 1. Update the UI to "Loading" state
        modalTitle.textContent = `Welcome back!`;
        modalMessage.textContent = 'Generating a personalized message...';
        userNameInput.style.display = 'none';
        submitNameBtn.style.display = 'none';
        if (closeWelcomeBtn) closeWelcomeBtn.style.display = 'none';
        welcomeOverlay.style.display = 'flex';

        if (userNameDisplay) userNameDisplay.textContent = userName;

        // 2. Get AI Message
        const aiMessage = await fetchAiWelcomeMessage(userName);
        modalMessage.textContent = aiMessage;

        // 3. Auto-close
        setTimeout(() => {
            welcomeOverlay.style.display = 'none';
        }, 4000);
    }

    // --- Welcome Logic Initial Check ---
    if (storedUserName) {
        handleWelcomeFlow(storedUserName);
    } else {
        // First time user experience
        welcomeOverlay.style.display = 'flex';
        modalTitle.textContent = "Welcome to your Advanced TODO!";
        modalMessage.textContent = "What should I call you?";
        userNameInput.style.display = 'block';
        submitNameBtn.style.display = 'block';
        if (closeWelcomeBtn) closeWelcomeBtn.style.display = 'none';

        submitNameBtn.onclick = async () => {
            const name = userNameInput.value.trim();
            if (name) {
                localStorage.setItem('todoUserName', name);
                await handleWelcomeFlow(name);
            }
        };
    }

    // --- Task & UI Logic (Keeping your existing features) ---
    function saveTasks() { localStorage.setItem('tasks', JSON.stringify(tasks)); }

    function renderTasks() {
        if (!taskList) return;
        taskList.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.className = task.completed ? 'completed' : '';
            li.innerHTML = `<span>${task.text}</span>
                            <div>
                                <button onclick="toggle(${index})">${task.completed ? 'Undo' : 'Done'}</button>
                                <button onclick="del(${index})">Delete</button>
                            </div>`;
            taskList.appendChild(li);
        });
    }

    window.toggle = (i) => { tasks[i].completed = !tasks[i].completed; saveTasks(); renderTasks(); };
    window.del = (i) => { tasks.splice(i, 1); saveTasks(); renderTasks(); };

    if (addTaskBtn) addTaskBtn.onclick = () => {
        if (taskInput.value.trim()) {
            tasks.push({ text: taskInput.value.trim(), completed: false });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    };

    // Dark Mode Toggle
    if (darkModeToggle) {
        darkModeToggle.onclick = () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
            darkModeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
        };
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = 'Light Mode';
        }
    }

    renderTasks();
});