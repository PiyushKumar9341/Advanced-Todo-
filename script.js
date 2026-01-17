document.addEventListener('DOMContentLoaded', async function() {
    // --- Core To-Do List Elements ---
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    // --- AI Welcome Pop-up Elements ---
    const welcomeOverlay = document.getElementById('welcomeOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const userNameInput = document.getElementById('userNameInput');
    const submitNameBtn = document.getElementById('submitNameBtn');
    const closeWelcomeBtn = document.getElementById('closeWelcomeBtn');
    const storedUserName = localStorage.getItem('todoUserName');
    const userNameDisplay = document.getElementById('userName');

    // --- Footer & UI Elements ---
    const copyEmailBtn = document.getElementById('copyEmailBtnFooter');
    const emailAddressSpan = document.getElementById('emailAddressFooter');
    const messageBox = document.getElementById('messageBox');
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const quoteEl = document.getElementById('quote');
    const sections = document.querySelectorAll('section');
    const sectionTitles = document.querySelectorAll('.section-title');

    // --- Export/Import Elements ---
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importInput = document.getElementById('importInput');

    // --- Helper Functions ---

    function showMessage(message, type) {
        if (!messageBox) return;
        messageBox.textContent = message;
        messageBox.style.display = 'block';
        const isDark = document.body.classList.contains('dark-mode');
        
        messageBox.style.backgroundColor = type === 'success' ? (isDark ? '#3A3A3A' : '#d4edda') : (isDark ? '#4A2A2A' : '#f8d7da');
        messageBox.style.color = type === 'success' ? (isDark ? '#A8DADC' : '#155724') : (isDark ? '#FFC1CC' : '#721c24');
        
        setTimeout(() => { messageBox.style.display = 'none'; }, 3000);
    }

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
            return response.ok ? data.message : `Hello ${userName}, let's tackle your goals!`;
        } catch (error) {
            return `Hello ${userName}, ready for a productive ${getTimeOfDay()}?`;
        }
    }

    async function showWelcomeOverlay(userName, isNewUser) {
        if (!welcomeOverlay) return;
        if (userNameDisplay) userNameDisplay.textContent = userName;
        
        modalTitle.textContent = isNewUser ? "Welcome to Advanced TODO!" : `Welcome back, ${userName}!`;
        userNameInput.style.display = 'none';
        submitNameBtn.style.display = 'none';
        if (closeWelcomeBtn) closeWelcomeBtn.style.display = 'none';

        modalMessage.textContent = 'Generating a personalized message...';
        welcomeOverlay.style.display = 'flex';

        const aiMessage = await fetchAiWelcomeMessage(userName);
        modalMessage.textContent = aiMessage;

        setTimeout(() => { welcomeOverlay.style.display = 'none'; }, 4000);
    }

    // --- Task Management ---

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks(filter = 'all') {
        if (!taskList) return;
        taskList.innerHTML = '';
        
        let filteredTasks = tasks;
        if (filter === 'active') filteredTasks = tasks.filter(t => !t.completed);
        else if (filter === 'completed') filteredTasks = tasks.filter(t => t.completed);

        filteredTasks.forEach((task) => {
            const li = document.createElement('li');
            li.className = `flex justify-between items-center p-2 mb-2 rounded-md ${task.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <div class="flex flex-col items-start flex-grow">
                    <span>${task.text}</span>
                </div>
                <div class="flex space-x-2">
                    <button class="complete-btn">${task.completed ? 'Undo' : 'Complete'}</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;
            
            const masterIndex = tasks.indexOf(task);
            li.querySelector('.complete-btn').onclick = () => {
                tasks[masterIndex].completed = !tasks[masterIndex].completed;
                saveTasks();
                renderTasks(filter);
            };
            li.querySelector('.delete-btn').onclick = () => {
                tasks.splice(masterIndex, 1);
                saveTasks();
                renderTasks(filter);
            };
            taskList.appendChild(li);
        });
    }

    function addTask() {
        const text = taskInput.value.trim();
        if (text) {
            tasks.push({ text: text, completed: false });
            taskInput.value = '';
            saveTasks();
            renderTasks();
        }
    }

    // --- Features ---

    async function loadQuote() {
        if (!quoteEl) return;
        const fallbacks = ["Focus on being productive instead of busy.", "Little things make big days.", "Start where you are."];
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);
            const resp = await fetch('https://api.quotable.io/random', { signal: controller.signal });
            if (resp.ok) {
                const data = await resp.json();
                quoteEl.textContent = data.content;
            } else { throw new Error(); }
            clearTimeout(id);
        } catch (e) {
            quoteEl.textContent = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }
    }

    function highlightActiveSection() {
        let current = "";
        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= sectionTop - 60) { current = section.getAttribute("id"); }
        });
        sectionTitles.forEach((title) => {
            title.classList.remove("active");
            if (title.parentElement && title.parentElement.id === current) { title.classList.add("active"); }
        });
    }

    // --- Event Listeners ---

    if (addTaskBtn) addTaskBtn.onclick = addTask;
    if (taskInput) taskInput.onkeypress = (e) => e.key === 'Enter' && addTask();

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => renderTasks(btn.getAttribute('data-filter'));
    });

    if (darkModeToggle) {
        const saved = localStorage.getItem('darkMode');
        const apply = (isDark) => {
            document.body.classList.toggle('dark-mode', isDark);
            darkModeToggle.textContent = isDark ? 'Light Mode' : 'Dark Mode';
            localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
        };
        darkModeToggle.onclick = () => apply(!document.body.classList.contains('dark-mode'));
        if (saved === 'enabled') apply(true);
    }

    if (copyEmailBtn && emailAddressSpan) {
        copyEmailBtn.onclick = () => {
            navigator.clipboard.writeText(emailAddressSpan.textContent);
            showMessage('Email copied to clipboard!', 'success');
        };
    }

    if (exportBtn) {
        exportBtn.onclick = () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "tasks.json");
            downloadAnchor.click();
        };
    }

    // --- Initialization ---

    if (storedUserName) {
        showWelcomeOverlay(storedUserName, false);
    } else if (welcomeOverlay) {
        welcomeOverlay.style.display = 'flex';
        userNameInput.style.display = 'block';
        submitNameBtn.style.display = 'block';
        submitNameBtn.onclick = async () => {
            const name = userNameInput.value.trim();
            if (name) {
                localStorage.setItem('todoUserName', name);
                await showWelcomeOverlay(name, true);
            }
        };
    }

    window.addEventListener('scroll', highlightActiveSection);
    if (scrollToTopBtn) {
        window.onscroll = () => scrollToTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
        scrollToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderTasks();
    loadQuote();
});