// Данные приложения
let appData = {
    userLevel: 'Новичок',
    xp: 0,
    sessionsCompleted: 0,
    focusTime: 0,
    currentStreak: 0,
    currentTask: null,
    subtasks: []
};

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadUserData();
});

// Инициализация MAX WebApp
function initializeApp() {
    if (window.WebApp) {
        window.WebApp.ready();
        console.log('MAX WebApp инициализирован');
        
        // Получаем стартовые параметры от бота
        const startParam = window.WebApp.initDataUnsafe?.start_param;
        if (startParam) {
            try {
                // Декодируем base64 данные
                const decodedData = atob(startParam);
                const botData = JSON.parse(decodedData);
                console.log('Получены данные от бота:', botData);
                
                // Обновляем данные приложения
                if (botData.task) {
                    appData.currentTask = botData.task;
                }
                if (botData.subtasks && botData.subtasks.length > 0) {
                    appData.subtasks = botData.subtasks;
                }
                if (botData.sessions !== undefined) {
                    appData.sessionsCompleted = botData.sessions;
                }
                if (botData.minutes !== undefined) {
                    appData.focusTime = botData.minutes;
                }
                if (botData.streak !== undefined) {
                    appData.currentStreak = botData.streak;
                }
                if (botData.xp !== undefined) {
                    appData.xp = botData.xp;
                }
                
                // Обновляем уровень на основе XP
                if (appData.xp >= 100) {
                    appData.userLevel = 'Ученик';
                } else if (appData.xp >= 50) {
                    appData.userLevel = 'Новичок+';
                } else {
                    appData.userLevel = 'Новичок';
                }
                
                // Сохраняем и обновляем UI
                saveUserData();
                updateUI();
                
                // Показываем уведомление
                if (botData.task) {
                    showNotification('Данные обновлены из бота! 🎯');
                }
            } catch (e) {
                console.error('Ошибка при обработке данных от бота:', e);
            }
        }
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение вкладок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

// Переключение вкладок
function switchTab(tabId) {
    // Деактивируем все вкладки
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Активируем выбранную вкладку
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Загрузка данных пользователя
function loadUserData() {
    // В реальном приложении здесь будет загрузка с сервера
    const savedData = localStorage.getItem('focusAssistantData');
    if (savedData) {
        appData = { ...appData, ...JSON.parse(savedData) };
    }
    updateUI();
}

// Сохранение данных
function saveUserData() {
    localStorage.setItem('focusAssistantData', JSON.stringify(appData));
}

// Обновление интерфейса
function updateUI() {
    // Обновляем статистику
    document.getElementById('sessionsCompleted').textContent = appData.sessionsCompleted;
    document.getElementById('focusTime').textContent = Math.floor(appData.focusTime / 60) + 'ч';
    document.getElementById('currentStreak').textContent = appData.currentStreak;
    
    // Обновляем уровень и XP
    const levelElement = document.querySelector('.level strong');
    const xpElement = document.querySelector('.xp');
    if (levelElement) {
        levelElement.textContent = appData.userLevel;
    }
    if (xpElement) {
        xpElement.textContent = appData.xp + ' XP';
    }
    
    // Обновляем текущую задачу
    const currentTaskElement = document.getElementById('currentTask');
    if (currentTaskElement) {
        if (appData.currentTask) {
            currentTaskElement.innerHTML = `
                <h3>${appData.currentTask}</h3>
                <button class="btn primary" onclick="startNewTask()">🎯 Создать новую задачу</button>
            `;
        } else {
            currentTaskElement.innerHTML = `
                <p>Нет активных задач</p>
                <button class="btn primary" onclick="startNewTask()">🎯 Создать задачу</button>
            `;
        }
    }
    
    // Обновляем список подзадач
    updateSubtasksList();
    
    // Обновляем достижения
    updateAchievements();
}

// Обновление списка подзадач
function updateSubtasksList() {
    const container = document.getElementById('subtasksList');
    
    if (!appData.currentTask || appData.subtasks.length === 0) {
        container.innerHTML = '<p class="empty-state">Создайте первую задачу в боте</p>';
        return;
    }
    
    let html = '';
    appData.subtasks.forEach((subtask, index) => {
        html += `
            <div class="subtask-item">
                <input type="checkbox" id="subtask-${index}" onchange="toggleSubtask(${index})">
                <label for="subtask-${index}">${subtask}</label>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Обновление достижений
function updateAchievements() {
    const achievements = [
        { id: 'first-steps', unlocked: appData.sessionsCompleted >= 1 },
        { id: 'weekly-learner', unlocked: appData.sessionsCompleted >= 7 },
        { id: 'focus-master', unlocked: appData.currentStreak >= 10 }
    ];
    
    const container = document.getElementById('achievementsList');
    let html = '';
    
    achievements.forEach(achievement => {
        const className = achievement.unlocked ? 'achievement' : 'achievement locked';
        let text = '';
        
        if (achievement.id === 'first-steps') {
            text = '<span>🎯 Первые шаги</span><small>Выполните 1 сессию</small>';
        } else if (achievement.id === 'weekly-learner') {
            text = '<span>🔥 Ученик недели</span><small>7 сессий за неделю</small>';
        } else if (achievement.id === 'focus-master') {
            text = '<span>⚡ Фокус-мастер</span><small>10 дней подряд</small>';
        }
        
        html += `<div class="${className}">${text}</div>`;
    });
    
    container.innerHTML = html;
}

// Функции взаимодействия
function startNewTask() {
    if (window.WebApp && window.WebApp.openLink) {
        window.WebApp.openLink('https://max.ru/your-bot-username');
    } else {
        alert('Откройте бота для создания новой задачи');
    }
}

function startPomodoro() {
    if (!appData.currentTask) {
        alert('Сначала создайте задачу в боте');
        return;
    }
    
    // Имитация начала сессии
    const minutes = 25;
    let timeLeft = minutes * 60;
    
    const timer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        console.log(`Осталось: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            completeSession();
        }
        timeLeft--;
    }, 1000);
    
    alert(`🍅 Сессия началась! Фокусируйтесь 25 минут`);
}

function completeSession() {
    appData.sessionsCompleted++;
    appData.focusTime += 25;
    appData.xp += 10;
    appData.currentStreak++;
    
    // Проверка уровня
    if (appData.xp >= 100) {
        appData.userLevel = 'Ученик';
    }
    
    saveUserData();
    updateUI();
    
    alert('🎉 Сессия завершена! +10 XP');
}

function openBot() {
    if (window.WebApp && window.WebApp.openLink) {
        window.WebApp.openLink('https://max.ru/your-bot-username');
    }
}

function getNewQuote() {
    const quotes = [
        { text: "Единственный способ сделать великую работу — любить то, что ты делаешь.", author: "Стив Джобс" },
        { text: "Не откладывай на завтра то, что можно сделать сегодня.", author: "Народная мудрость" },
        { text: "Маленькие ежедневные улучшения со временем приводят к огромным результатам.", author: "Неизвестно" },
        { text: "Дорогу осилит идущий.", author: "Лао-цзы" },
        { text: "Успех — это способность двигаться от неудачи к неудаче, не теряя энтузиазма.", author: "Уинстон Черчилль" }
    ];
    
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    document.getElementById('dailyQuote').textContent = `"${randomQuote.text}"`;
    document.getElementById('quoteAuthor').textContent = `— ${randomQuote.author}`;
}

function shareAchievement() {
    if (window.WebApp && window.WebApp.shareContent) {
        window.WebApp.shareContent(
            `Я уже выполнил ${appData.sessionsCompleted} сессий в ФокусПомощнике! 🎯\n` +
            `Сфокусировался ${Math.floor(appData.focusTime / 60)} часов и набрал ${appData.xp} XP.\n` +
            `Текущий уровень: ${appData.userLevel} 🚀\n\n` +
            `Присоединяйся к продуктивности!`,
            'https://max.ru/focus-assistant'
        );
    } else {
        alert('Поделиться прогрессом можно в приложении MAX');
    }
}

function toggleSubtask(index) {
    const checkbox = document.getElementById(`subtask-${index}`);
    if (checkbox.checked) {
        // Добавляем XP за выполненную подзадачу
        appData.xp += 5;
        saveUserData();
        updateUI();
        
        // Визуальная обратная связь
        checkbox.parentElement.style.opacity = '0.6';
        checkbox.parentElement.style.textDecoration = 'line-through';
    }
}

// Дополнительные функции для интеграции с ботом
function receiveTaskFromBot(taskData) {
    appData.currentTask = taskData.task;
    appData.subtasks = taskData.subtasks;
    saveUserData();
    updateUI();
    
    // Показываем уведомление
    showNotification('Новая задача получена из бота! 🎯');
}

function showNotification(message) {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Имитация получения данных от бота (для демо)
function simulateBotIntegration() {
    setTimeout(() => {
        receiveTaskFromBot({
            task: "Подготовиться к экзамену по экономике",
            subtasks: [
                "1. Повтори лекции 1-2",
                "2. Сделать конспект ключевых терминов", 
                "3. Решить практические задачи",
                "4. Пройти тест для самопроверки"
            ]
        });
    }, 2000);
}

// Запускаем демо-интеграцию при загрузке
// simulateBotIntegration();