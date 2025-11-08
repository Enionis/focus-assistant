let WebApp = null;

if (typeof window !== 'undefined' && window.WebApp) {
    WebApp = window.WebApp;
} else {
    WebApp = {
        DeviceStorage: {
            getItem: async (key) => localStorage.getItem(key),
            setItem: async (key, value) => localStorage.setItem(key, value),
            removeItem: async (key) => localStorage.removeItem(key),
        },
        sendData: (data) => console.log('Send data to bot:', data),
        ready: () => console.log('WebApp ready'),
        expand: () => console.log('Expand webapp'),
    };
}

let appState = {
    settings: {
        dailyHours: 4,
        productiveTime: 'morning',
        pomodoroLength: 25,
        breakLength: 5,
        isOnboarded: false,
        activeHours: { start: 9, end: 22 },
    },
    stats: {
        totalSessions: 0,
        totalFocusTime: 0,
        currentStreak: 0,
        longestStreak: 0,
        level: 1,
        xp: 0,
        achievements: [],
        lastActiveDate: null,
    },
    tasks: [],
    activeTask: null,
    activeTaskId: null,
    currentView: 'loading',
    userId: null,
    chatId: null,
};

async function loadData() {
    try {
        const settingsStr = await WebApp.DeviceStorage.getItem('focus_settings');
        const statsStr = await WebApp.DeviceStorage.getItem('focus_stats');
        const tasksStr = await WebApp.DeviceStorage.getItem('focus_tasks');

        if (settingsStr) {
            appState.settings = { ...appState.settings, ...JSON.parse(settingsStr) };
        }
        if (statsStr) {
            appState.stats = { ...appState.stats, ...JSON.parse(statsStr) };
        }
        if (tasksStr) {
            appState.tasks = JSON.parse(tasksStr);
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function saveSettings(settings) {
    appState.settings = { ...appState.settings, ...settings };
    await WebApp.DeviceStorage.setItem('focus_settings', JSON.stringify(appState.settings));
    render();
}

async function saveStats(stats) {
    appState.stats = { ...appState.stats, ...stats };
    await WebApp.DeviceStorage.setItem('focus_stats', JSON.stringify(appState.stats));
    render();
}

async function saveTasks(tasks) {
    appState.tasks = tasks;
    await WebApp.DeviceStorage.setItem('focus_tasks', JSON.stringify(appState.tasks));
    render();
}

function navigateTo(view) {
    appState.currentView = view;
    render();
}

async function init() {
    await loadData();
    
    if (!appState.settings.isOnboarded) {
        navigateTo('onboarding');
    } else {
        navigateTo('home');
    }
    
    if (WebApp.ready) {
        WebApp.ready();
    }
    
    if (WebApp.expand) {
        WebApp.expand();
    }
    
    sendTasksToBot();
}

function sendTasksToBot() {
    const incompleteTasks = appState.tasks.filter(task => {
        const progress = (task.completedPomodoros / task.totalPomodoros) * 100;
        return progress < 100;
    });
    
    const data = {
        type: 'tasks_update',
        incompleteTasks: incompleteTasks.length,
        tasks: incompleteTasks.map(t => ({
            id: t.id,
            title: t.title,
            progress: Math.round((t.completedPomodoros / t.totalPomodoros) * 100),
        })),
        activeHours: appState.settings.activeHours,
    };
    
    if (WebApp.sendData) {
        try {
            WebApp.sendData(data);
        } catch (error) {
            console.error('Error sending data to bot:', error);
        }
    }
}

function render() {
    const root = document.getElementById('root');
    if (!root) return;
    
    switch (appState.currentView) {
        case 'loading':
            root.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
            break;
        case 'onboarding':
            root.innerHTML = renderOnboarding();
            break;
        case 'home':
            root.innerHTML = renderHome();
            break;
        case 'create-task':
            root.innerHTML = renderCreateTask();
            break;
        case 'task-details':
            root.innerHTML = renderTaskDetails(appState.activeTaskId || appState.activeTask);
            break;
        case 'pomodoro':
            root.innerHTML = renderPomodoro();
            break;
        case 'statistics':
            root.innerHTML = renderStatistics();
            break;
    }
    
    attachEventHandlers();
}

function renderOnboarding() {
    return `
        <div class="container">
            <div class="card">
                <h1 class="text-center">🎯 Добро пожаловать в Фокус Помощник!</h1>
                <p class="text-center text-secondary mb-4">
                    Я помогу разбить большие задачи на маленькие шаги и сфокусироваться на их выполнении с помощью техники Pomodoro.
                </p>
                <div class="flex flex-col gap-4">
                    <div>
                        <label class="text-secondary mb-2">Активные часы для напоминаний:</label>
                        <div class="flex gap-2">
                            <input type="number" id="activeHoursStart" class="input" min="0" max="23" value="${appState.settings.activeHours.start}" placeholder="Начало">
                            <input type="number" id="activeHoursEnd" class="input" min="0" max="23" value="${appState.settings.activeHours.end}" placeholder="Конец">
                        </div>
                    </div>
                    <div>
                        <label class="text-secondary mb-2">Длина сессии Pomodoro (минут):</label>
                        <input type="number" id="pomodoroLength" class="input" value="${appState.settings.pomodoroLength}" min="5" max="120">
                    </div>
                    <div>
                        <label class="text-secondary mb-2">Длина перерыва (минут):</label>
                        <input type="number" id="breakLength" class="input" value="${appState.settings.breakLength}" min="1" max="30">
                    </div>
                    <button class="btn btn-primary" onclick="completeOnboarding()">Начать!</button>
                </div>
            </div>
        </div>
    `;
}

function renderHome() {
    const incompleteTasks = appState.tasks.filter(task => {
        const progress = (task.completedPomodoros / task.totalPomodoros) * 100;
        return progress < 100;
    });
    
    return `
        <div class="container">
            <div class="flex justify-between items-center mb-4">
                <h1>Мои задачи</h1>
                <button class="btn btn-primary" onclick="navigateTo('create-task')">+ Создать</button>
            </div>
            
            ${incompleteTasks.length === 0 ? `
                <div class="card text-center">
                    <p class="text-secondary mb-4">У вас пока нет задач. Создайте первую задачу!</p>
                    <button class="btn btn-primary" onclick="navigateTo('create-task')">Создать задачу</button>
                </div>
            ` : `
                <div class="task-list">
                    ${incompleteTasks.map(task => {
                        const progress = (task.completedPomodoros / task.totalPomodoros) * 100;
                        return `
                            <div class="task-item" onclick="openTaskDetails('${task.id}')">
                                <div class="task-header">
                                    <div class="flex flex-col">
                                        <div class="task-title">${escapeHtml(task.title)}</div>
                                        <div class="task-meta">
                                            🍅 ${task.completedPomodoros}/${task.totalPomodoros} сессий • ${Math.round(progress)}%
                                        </div>
                                    </div>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progress}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `}
            
            <div class="nav">
                <button class="nav-btn active" onclick="navigateTo('home')">📋 Задачи</button>
                <button class="nav-btn" onclick="navigateTo('statistics')">📊 Статистика</button>
            </div>
        </div>
    `;
}

function renderCreateTask() {
    return `
        <div class="container">
            <div class="card">
                <h2>Создать задачу</h2>
                <textarea id="taskDescription" class="textarea" placeholder="Опишите вашу задачу..."></textarea>
                <input type="text" id="taskDeadline" class="input" placeholder="Дедлайн (опционально)">
                <button class="btn btn-primary" onclick="analyzeTask()">Разобрать задачу с AI</button>
                <div id="taskPlan" class="hidden mt-4"></div>
            </div>
        </div>
    `;
}

function renderTaskDetails(taskId) {
    if (!taskId) {
        return '<div class="container"><div class="card"><p>Задача не выбрана</p><button class="btn btn-secondary" onclick="navigateTo(\'home\')">Назад</button></div></div>';
    }
    
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) {
        return '<div class="container"><div class="card"><p>Задача не найдена</p><button class="btn btn-secondary" onclick="navigateTo(\'home\')">Назад</button></div></div>';
    }
    
    const progress = (task.completedPomodoros / task.totalPomodoros) * 100;
    
    return `
        <div class="container">
            <div class="card">
                <h2>${escapeHtml(task.title)}</h2>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <p class="text-secondary">${Math.round(progress)}% завершено</p>
                
                <h3 class="mt-4">План действий</h3>
                <div class="task-list">
                    ${task.subTasks.map((subTask, index) => {
                        const subProgress = (subTask.completedPomodoros / subTask.estimatedPomodoros) * 100;
                        return `
                            <div class="task-item ${subTask.completed ? 'completed' : ''}">
                                <div class="task-header">
                                    <div class="flex flex-col">
                                        <div class="task-title ${subTask.completed ? 'completed' : ''}">
                                            ${index + 1}. ${escapeHtml(subTask.title)}
                                        </div>
                                        <div class="task-meta">
                                            🍅 ${subTask.completedPomodoros}/${subTask.estimatedPomodoros} сессий
                                        </div>
                                    </div>
                                    ${!subTask.completed ? `
                                        <button class="btn btn-primary" onclick="startPomodoro('${task.id}', '${subTask.id}')">
                                            ▶ Начать
                                        </button>
                                    ` : ''}
                                </div>
                                ${subTask.completedPomodoros > 0 ? `
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${subProgress}%"></div>
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <button class="btn btn-secondary mt-4" onclick="navigateTo('home')">Назад</button>
            </div>
        </div>
    `;
}

function renderPomodoro() {
    if (!appState.activeTask) {
        return '<div class="container"><div class="card"><p>Задача не выбрана</p></div></div>';
    }
    
    const task = appState.tasks.find(t => t.id === appState.activeTask.taskId);
    const subTask = task?.subTasks.find(st => st.id === appState.activeTask.subTaskId);
    
    if (!task || !subTask) {
        return '<div class="container"><div class="card"><p>Задача не найдена</p></div></div>';
    }
    
    return `
        <div class="pomodoro-container">
            <h3>${escapeHtml(subTask.title)}</h3>
            <p class="text-secondary">${escapeHtml(task.title)}</p>
            
            <div class="timer-circle">
                <div class="timer-text" id="timerDisplay">25:00</div>
                <div class="timer-label" id="timerLabel">Фокус-режим 🍅</div>
            </div>
            
            <div class="progress-bar" style="max-width: 300px;">
                <div class="progress-fill" id="timerProgress" style="width: 0%"></div>
            </div>
            
            <div class="pomodoro-controls">
                <button class="pomodoro-btn" id="pauseBtn" onclick="togglePause()">⏸</button>
                <button class="pomodoro-btn" onclick="cancelPomodoro()">✕</button>
            </div>
        </div>
    `;
}

function renderStatistics() {
    const hoursSpent = Math.floor(appState.stats.totalFocusTime / 60);
    const minutesSpent = appState.stats.totalFocusTime % 60;
    const levelProgress = appState.stats.xp % 100;
    
    return `
        <div class="container">
            <div class="card">
                <h2>Уровень ${appState.stats.level}</h2>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${levelProgress}%"></div>
                </div>
                <p class="text-secondary">${levelProgress}/100 XP до следующего уровня</p>
            </div>
            
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-value">${appState.stats.totalSessions}</div>
                    <div class="stat-label">Всего сессий</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${hoursSpent}ч ${minutesSpent}м</div>
                    <div class="stat-label">Время фокуса</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${appState.stats.currentStreak}</div>
                    <div class="stat-label">Текущая серия</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${appState.stats.longestStreak}</div>
                    <div class="stat-label">Лучшая серия</div>
                </div>
            </div>
            
            <div class="nav">
                <button class="nav-btn" onclick="navigateTo('home')">📋 Задачи</button>
                <button class="nav-btn active" onclick="navigateTo('statistics')">📊 Статистика</button>
            </div>
        </div>
    `;
}

function attachEventHandlers() {
}

window.completeOnboarding = async function() {
    const activeHoursStart = parseInt(document.getElementById('activeHoursStart').value) || 9;
    const activeHoursEnd = parseInt(document.getElementById('activeHoursEnd').value) || 22;
    const pomodoroLength = parseInt(document.getElementById('pomodoroLength').value) || 25;
    const breakLength = parseInt(document.getElementById('breakLength').value) || 5;
    
    await saveSettings({
        isOnboarded: true,
        activeHours: { start: activeHoursStart, end: activeHoursEnd },
        pomodoroLength,
        breakLength,
    });
    
    navigateTo('home');
};

window.navigateTo = navigateTo;

window.openTaskDetails = function(taskId) {
    appState.activeTaskId = taskId;
    navigateTo('task-details');
};

window.startPomodoro = function(taskId, subTaskId) {
    appState.activeTask = { taskId, subTaskId };
    appState.activeTaskId = taskId;
    navigateTo('pomodoro');
    startPomodoroTimer();
};

window.analyzeTask = async function() {
    const description = document.getElementById('taskDescription').value;
    const deadline = document.getElementById('taskDeadline').value;
    
    if (!description.trim()) {
        alert('Пожалуйста, опишите задачу');
        return;
    }
    
    const planDiv = document.getElementById('taskPlan');
    planDiv.classList.remove('hidden');
    planDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    setTimeout(() => {
        const subTasks = [
            { title: 'Изучить материал', estimatedPomodoros: 3 },
            { title: 'Сделать конспект', estimatedPomodoros: 2 },
            { title: 'Выполнить практические задания', estimatedPomodoros: 4 },
            { title: 'Повторить пройденное', estimatedPomodoros: 2 },
        ];
        
        planDiv.innerHTML = `
            <h3>План готов!</h3>
            <div class="task-list">
                ${subTasks.map((st, i) => `
                    <div class="task-item">
                        <div class="task-title">${i + 1}. ${escapeHtml(st.title)}</div>
                        <div class="task-meta">🍅 ${st.estimatedPomodoros} сессий</div>
                    </div>
                `).join('')}
            </div>
            <button class="btn btn-primary mt-4" onclick="saveTask()">Сохранить план</button>
        `;
    }, 1000);
};

window.saveTask = async function() {
    const description = document.getElementById('taskDescription').value;
    const deadline = document.getElementById('taskDeadline').value;
    
    const subTasks = [
        { id: 'st1', title: 'Изучить материал', completed: false, estimatedPomodoros: 3, completedPomodoros: 0 },
        { id: 'st2', title: 'Сделать конспект', completed: false, estimatedPomodoros: 2, completedPomodoros: 0 },
        { id: 'st3', title: 'Выполнить практические задания', completed: false, estimatedPomodoros: 4, completedPomodoros: 0 },
        { id: 'st4', title: 'Повторить пройденное', completed: false, estimatedPomodoros: 2, completedPomodoros: 0 },
    ];
    
    const task = {
        id: 'task-' + Date.now(),
        title: description,
        deadline: deadline || undefined,
        subTasks,
        createdAt: new Date().toISOString(),
        totalPomodoros: subTasks.reduce((sum, st) => sum + st.estimatedPomodoros, 0),
        completedPomodoros: 0,
    };
    
    await saveTasks([...appState.tasks, task]);
    navigateTo('home');
    sendTasksToBot();
};

let pomodoroTimer = null;
let pomodoroTimeLeft = 0;
let pomodoroIsPaused = false;

function startPomodoroTimer() {
    pomodoroTimeLeft = appState.settings.pomodoroLength * 60;
    pomodoroIsPaused = false;
    updateTimerDisplay();
    
    if (pomodoroTimer) {
        clearInterval(pomodoroTimer);
    }
    
    pomodoroTimer = setInterval(() => {
        if (!pomodoroIsPaused) {
            pomodoroTimeLeft--;
            updateTimerDisplay();
            
            if (pomodoroTimeLeft <= 0) {
                completePomodoro();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    const display = document.getElementById('timerDisplay');
    if (display) {
        display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    const progress = document.getElementById('timerProgress');
    if (progress && appState.activeTask) {
        const total = appState.settings.pomodoroLength * 60;
        const completed = total - pomodoroTimeLeft;
        progress.style.width = `${(completed / total) * 100}%`;
    }
    
    const label = document.getElementById('timerLabel');
    if (label) {
        label.textContent = pomodoroIsPaused ? 'Пауза' : 'Фокус-режим 🍅';
    }
}

window.togglePause = function() {
    pomodoroIsPaused = !pomodoroIsPaused;
    const btn = document.getElementById('pauseBtn');
    if (btn) {
        btn.textContent = pomodoroIsPaused ? '▶' : '⏸';
    }
};

window.cancelPomodoro = function() {
    if (confirm('Отменить сессию? Прогресс не будет сохранен.')) {
        if (pomodoroTimer) {
            clearInterval(pomodoroTimer);
            pomodoroTimer = null;
        }
        navigateTo('home');
    }
};

async function completePomodoro() {
    if (pomodoroTimer) {
        clearInterval(pomodoroTimer);
        pomodoroTimer = null;
    }
    
    if (appState.activeTask) {
        const { taskId, subTaskId } = appState.activeTask;
        const task = appState.tasks.find(t => t.id === taskId);
        const subTask = task?.subTasks.find(st => st.id === subTaskId);
        
        if (task && subTask) {
            const newStats = {
                ...appState.stats,
                totalSessions: appState.stats.totalSessions + 1,
                totalFocusTime: appState.stats.totalFocusTime + appState.settings.pomodoroLength,
                xp: appState.stats.xp + 10,
                level: Math.floor((appState.stats.xp + 10) / 100) + 1,
            };
            await saveStats(newStats);
            
            const updatedTasks = appState.tasks.map(t => {
                if (t.id === taskId) {
                    const updatedSubTasks = t.subTasks.map(st => {
                        if (st.id === subTaskId) {
                            return { ...st, completedPomodoros: st.completedPomodoros + 1 };
                        }
                        return st;
                    });
                    return {
                        ...t,
                        subTasks: updatedSubTasks,
                        completedPomodoros: t.completedPomodoros + 1,
                    };
                }
                return t;
            });
            await saveTasks(updatedTasks);
            
            sendTasksToBot();
        }
    }
    
    alert('🎉 Сессия завершена! Теперь отдохни ' + appState.settings.breakLength + ' минут!');
    navigateTo('home');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        userId: params.get('user_id'),
        chatId: params.get('chat_id'),
        startapp: params.get('startapp'),
    };
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

const urlParams = getUrlParams();
if (urlParams.userId && urlParams.chatId) {
    appState.userId = urlParams.userId;
    appState.chatId = urlParams.chatId;
}

