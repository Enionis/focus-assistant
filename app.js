class FocusHelperApp {
    constructor() {
        this.currentView = 'onboarding'; // Начать с онбординга
        this.userData = null;
        this.eventListenersAttached = false;
        // URL для синхронизации с ботом
        // Для локальной разработки: 'http://localhost:8000'
        // Для продакшена: укажите URL вашего API сервера
        this.apiBaseUrl = 'http://localhost:8000'; // TODO: Замените на URL вашего API сервера для синхронизации
        
        // Получаем данные пользователя из Max Web App SDK
        this.initUserData(); 
        this.timerInterval = null;
        this.timeLeft = 30; // 30 секунд для тестирования (обычно 25 * 60)
        this.isRunning = false;
        this.isPaused = false;
        this.activeTask = null;
        this.selectedTaskId = null; // Для просмотра задачи
        this.lastPomodoroFocus = null; // Последняя тема pomodoro
        this.settings = {
            dailyHours: 4,
            productiveTime: 'morning',
            pomodoroLength: 0.5, // 0.5 минуты (30 секунд) для тестирования (обычно 25)
            breakLength: 5,
            isOnboarded: false
        };
        this.tasks = [];
        this.stats = {
            totalSessions: 0,
            totalFocusTime: 0,
            currentStreak: 0,
            longestStreak: 0,
            level: 1,
            xp: 0,
            achievements: []
        };
        this.init();
    }

    // Инициализация данных пользователя из Max Web App SDK
    initUserData() {
        try {
            // Проверяем наличие Max Web App SDK
            if (typeof window !== 'undefined' && window.MaxWebApp) {
                // Получаем данные пользователя из SDK
                const maxWebApp = window.MaxWebApp;
                if (maxWebApp.getUserData) {
                    this.userData = maxWebApp.getUserData();
                } else if (maxWebApp.user) {
                    this.userData = { userId: maxWebApp.user.id || maxWebApp.user.user_id };
                } else if (maxWebApp.initData) {
                    // Пробуем получить из initData
                    const initData = maxWebApp.initData;
                    if (initData.user) {
                        this.userData = { userId: initData.user.id || initData.user.user_id };
                    }
                }
                console.log('Данные пользователя из Max Web App SDK:', this.userData);
            } else {
                console.log('Max Web App SDK не найден, данные будут храниться только локально');
            }
        } catch (error) {
            console.warn('Ошибка получения данных пользователя:', error);
        }
    }

    // Инициализация
    init() {
        // Проверяем доступность localStorage
        if (!this.isLocalStorageAvailable()) {
            console.error('❌ localStorage недоступен! Данные не будут сохраняться.');
            alert('⚠️ Внимание: localStorage недоступен. Статистика не будет сохраняться после закрытия браузера.\n\nВозможные причины:\n- Режим инкогнито\n- Браузер заблокировал хранилище\n- Недостаточно места');
        }
        
        this.loadData();
        // Загружаем последнюю тему pomodoro
        this.lastPomodoroFocus = localStorage.getItem('lastPomodoroFocus') || null;
        this.attachEventListeners();
        this.renderApp();
    }

    // Проверка доступности localStorage
    isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Методы работы с данными (локальное хранение + синхронизация)
    async loadData() {
        try {
            // Локальное хранение
            const savedSettings = JSON.parse(localStorage.getItem('focus_settings') || '{}');
            this.settings = {
                dailyHours: 4,
                productiveTime: 'morning',
                pomodoroLength: 0.5, // 0.5 минуты (30 секунд) для тестирования (обычно 25)
                breakLength: 5,
                isOnboarded: false,
                ...savedSettings
            };
            // Принудительно устанавливаем 0.5 для тестирования (перезаписываем сохраненное значение)
            this.settings.pomodoroLength = 0.5;
            this.tasks = JSON.parse(localStorage.getItem('focus_tasks') || '[]');
            this.stats = JSON.parse(localStorage.getItem('focus_stats') || '{}');

            // Убеждаемся, что stats валидны
            if (!this.stats || typeof this.stats !== 'object') {
                this.stats = {
                    totalSessions: 0,
                    totalFocusTime: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    level: 1,
                    xp: 0,
                    achievements: []
                };
            }
            
            // Убеждаемся, что achievements всегда массив
            if (!Array.isArray(this.stats.achievements)) {
                this.stats.achievements = [];
            }

            // Синхронизация с ботом
            if (this.userData?.userId) {
                await this.syncWithBot();
            }

            // Если не онбордирован, показать онбординг
            if (!this.settings.isOnboarded) {
                this.currentView = 'onboarding';
            } else {
                this.currentView = 'home';
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            // Fallback для stats
            if (!this.stats || typeof this.stats !== 'object') {
                this.stats = {
                    totalSessions: 0,
                    totalFocusTime: 0,
                    currentStreak: 0,
                    longestStreak: 0,
                    level: 1,
                    xp: 0,
                    achievements: []
                };
            }
            // Убеждаемся, что achievements всегда массив
            if (!Array.isArray(this.stats.achievements)) {
                this.stats.achievements = [];
            }
        }
    }

    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        localStorage.setItem('focus_settings', JSON.stringify(this.settings));
    }

    saveTasks(newTasks) {
        this.tasks = newTasks;
        localStorage.setItem('focus_tasks', JSON.stringify(newTasks));
    }

    saveStats(newStats) {
        this.stats = newStats;
        try {
            localStorage.setItem('focus_stats', JSON.stringify(newStats));
            // Дополнительная проверка: читаем обратно, чтобы убедиться, что сохранилось
            const saved = localStorage.getItem('focus_stats');
            if (!saved) {
                console.warn('⚠️ Не удалось сохранить статистику в localStorage');
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения статистики:', error);
            // Если localStorage переполнен, пытаемся очистить старые данные
            if (error.name === 'QuotaExceededError') {
                console.warn('⚠️ localStorage переполнен, очищаем старые данные...');
                try {
                    // Оставляем только самое важное
                    localStorage.removeItem('focus_tasks');
                    localStorage.setItem('focus_stats', JSON.stringify(newStats));
                } catch (e) {
                    console.error('❌ Критическая ошибка: не удалось сохранить статистику');
                }
            }
        }
    }

    async syncWithBot() {
        // Получаем userId из userData или из Max Web App SDK
        let userId = this.userData?.userId;
        
        // Если userId нет, пытаемся получить из Max Web App SDK напрямую
        if (!userId && typeof window !== 'undefined' && window.MaxWebApp) {
            try {
                const maxWebApp = window.MaxWebApp;
                if (maxWebApp.user?.id) {
                    userId = maxWebApp.user.id;
                } else if (maxWebApp.user?.user_id) {
                    userId = maxWebApp.user.user_id;
                } else if (maxWebApp.initData?.user?.id) {
                    userId = maxWebApp.initData.user.id;
                } else if (maxWebApp.initData?.user?.user_id) {
                    userId = maxWebApp.initData.user.user_id;
                }
            } catch (e) {
                console.warn('Не удалось получить userId из Max Web App SDK:', e);
            }
        }
        
        if (!userId) {
            // Если нет userId, данные хранятся только локально
            console.log('ℹ️ Данные хранятся только локально (localStorage). userId не найден.');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    settings: this.settings,
                    tasks: this.tasks,
                    stats: this.stats
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.settings) this.saveSettings(data.settings);
                if (data.tasks) this.saveTasks(data.tasks);
                if (data.stats) this.saveStats(data.stats);
                console.log('✅ Данные синхронизированы с сервером');
            } else {
                console.warn('⚠️ Синхронизация не удалась, данные сохранены локально');
            }
        } catch (error) {
            console.warn('⚠️ Ошибка синхронизации, данные сохранены локально:', error.message);
            // Данные все равно сохранены в localStorage, так что это не критично
        }
    }

    // Навигация
    navigateTo(view) {
        console.log('navigateTo called with view:', view, 'current view:', this.currentView);
        this.currentView = view;
        this.renderApp();
    }

    // Онбординг
    completeOnboarding(settings) {
        this.saveSettings({ ...this.settings, ...settings, isOnboarded: true });
        this.navigateTo('home');
        this.syncWithBot();
    }

    // Создание задачи (заглушка без AI)
    async createTask(taskDescription, deadline = null) {
        // Заглушка: hardcoded план на основе описания
        let subTasks = [];
        if (taskDescription.includes('экзамен') || taskDescription.includes('курсовая')) {
            subTasks = [
                { id: Date.now() + 1, title: 'Собрать материалы', estimatedPomodoros: 2, completed: false, completedPomodoros: 0 },
                { id: Date.now() + 2, title: 'Написать план', estimatedPomodoros: 1, completed: false, completedPomodoros: 0 },
                { id: Date.now() + 3, title: 'Изучить теорию', estimatedPomodoros: 4, completed: false, completedPomodoros: 0 },
                { id: Date.now() + 4, title: 'Практика и примеры', estimatedPomodoros: 3, completed: false, completedPomodoros: 0 },
                { id: Date.now() + 5, title: 'Подвести итоги', estimatedPomodoros: 2, completed: false, completedPomodoros: 0 }
            ];
        } else {
            subTasks = [
                { id: Date.now() + 1, title: 'Подготовка', estimatedPomodoros: 1, completed: false, completedPomodoros: 0 },
                { id: Date.now() + 2, title: 'Основная работа', estimatedPomodoros: 3, completed: false, completedPomodoros: 0 },
                { id: Date.now() + 3, title: 'Завершение', estimatedPomodoros: 2, completed: false, completedPomodoros: 0 }
            ];
        }

        // Обрабатываем дедлайн: если это строка даты, конвертируем в ISO формат
        let deadlineDate = undefined;
        if (deadline) {
            if (typeof deadline === 'string' && deadline.trim()) {
                // Если это дата в формате YYYY-MM-DD, конвертируем в ISO
                const date = new Date(deadline);
                if (!isNaN(date.getTime())) {
                    deadlineDate = date.toISOString();
                } else {
                    deadlineDate = deadline;
                }
            } else {
                deadlineDate = deadline;
            }
        }
        
        const task = {
            id: Date.now().toString(),
            title: taskDescription,
            deadline: deadlineDate,
            subTasks,
            createdAt: new Date().toISOString(),
            totalPomodoros: subTasks.reduce((sum, st) => sum + st.estimatedPomodoros, 0),
            completedPomodoros: 0
        };

        this.tasks.push(task);
        this.saveTasks(this.tasks);
        await this.syncWithBot();
        // Открываем созданную задачу
        this.selectedTaskId = task.id;
        this.navigateTo('taskDetails');
    }

    // Pomodoro логика
    // Проверка, завершена ли подзадача
    isSubTaskCompleted(subTask) {
        return subTask.completedPomodoros >= subTask.estimatedPomodoros;
    }

    // Проверка, завершена ли задача (все подзадачи выполнены)
    isTaskCompleted(task) {
        if (!task || !task.subTasks || task.subTasks.length === 0) {
            return false;
        }
        return task.subTasks.every(st => this.isSubTaskCompleted(st));
    }

    // Проверка, можно ли начать Pomodoro для подзадачи
    // Можно начинать только первую незавершенную подзадачу
    canStartPomodoroForSubTask(task, subTaskId) {
        if (!task || !task.subTasks || task.subTasks.length === 0) {
            return false;
        }
        
        // Находим индекс текущей подзадачи
        const currentIndex = task.subTasks.findIndex(st => Number(st.id) === Number(subTaskId));
        if (currentIndex === -1) {
            return false;
        }
        
        const currentSubTask = task.subTasks[currentIndex];
        
        // Если текущая подзадача уже завершена, нельзя начинать
        if (this.isSubTaskCompleted(currentSubTask)) {
            return false;
        }
        
        // Проверяем, все ли предыдущие подзадачи завершены
        for (let i = 0; i < currentIndex; i++) {
            if (!this.isSubTaskCompleted(task.subTasks[i])) {
                return false; // Предыдущая подзадача не завершена
            }
        }
        
        return true; // Все предыдущие завершены, текущая не завершена
    }

    startPomodoro(taskId, subTaskId, focusText = null) {
        if (!taskId || !subTaskId) {
            console.error('startPomodoro: missing taskId or subTaskId', { taskId, subTaskId });
            return;
        }
        
        const task = this.tasks.find(t => String(t.id) === String(taskId));
        if (!task) {
            console.error('startPomodoro: task not found', { taskId });
            return;
        }
        
        const subTask = task.subTasks.find(st => Number(st.id) === Number(subTaskId));
        if (!subTask) {
            console.error('startPomodoro: subTask not found', { subTaskId });
            return;
        }
        
        // Проверяем, не завершена ли вся задача
        if (this.isTaskCompleted(task)) {
            alert('Эта задача уже завершена! Все подзадачи выполнены.');
            return;
        }
        
        // Проверяем, не завершена ли подзадача
        if (this.isSubTaskCompleted(subTask)) {
            alert('Эта подзадача уже завершена! Все сессии Pomodoro выполнены.');
            return;
        }
        
        // Проверяем, можно ли начинать Pomodoro для этой подзадачи
        // Можно начинать только первую незавершенную подзадачу
        if (!this.canStartPomodoroForSubTask(task, subTaskId)) {
            // Находим первую незавершенную подзадачу
            const firstIncomplete = task.subTasks.find(st => !this.isSubTaskCompleted(st));
            if (firstIncomplete) {
                alert(`Сначала завершите предыдущие подзадачи! Начните с подзадачи "${firstIncomplete.title}"`);
            } else {
                alert('Все подзадачи уже завершены!');
            }
            return;
        }
        
        this.activeTask = { taskId: String(taskId), subTaskId: Number(subTaskId), focusText: focusText || '' };
        this.timeLeft = Math.round((this.settings.pomodoroLength || 0.5) * 60); // 30 секунд для тестирования
        this.isRunning = false; // Не запускаем сразу
        this.isPaused = false;
        this.navigateTo('pomodoro');
        // Таймер не запускается автоматически - пользователь должен нажать "Начать"
    }

    // Запуск таймера (после того как пользователь нажал "Начать")
    startTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.isRunning = true;
        this.isPaused = false;
        console.log('Таймер запущен, timeLeft:', this.timeLeft);
        
        // Обновляем время каждую секунду
        // Для плавной анимации обновляем только текст таймера, не весь DOM
        this.timerInterval = setInterval(() => {
            if (this.isRunning && !this.isPaused) {
                this.timeLeft--;
                console.log('Таймер тик, timeLeft:', this.timeLeft);
                if (this.timeLeft <= 0) {
                    console.log('Таймер завершен, вызываем completePomodoro');
                    clearInterval(this.timerInterval);
                    this.timerInterval = null;
                    this.completePomodoro();
                    return; // Прерываем выполнение, чтобы не вызывать renderApp после завершения
                }
            }
            // Обновляем только текст таймера и прогресс-бар, не весь DOM
            this.updateTimerDisplay();
        }, 1000);
        this.renderApp();
    }

    pausePomodoro() {
        this.isPaused = !this.isPaused;
    }

    // Обновление только текста таймера и прогресса без пересоздания DOM
    updateTimerDisplay() {
        if (this.currentView !== 'pomodoro' || !this.activeTask) {
            return;
        }
        
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Обновляем текст таймера
        const timerTextElements = document.querySelectorAll('.timer-text');
        timerTextElements.forEach(el => {
            if (el.textContent !== timeText) {
                el.textContent = timeText;
            }
        });
        
        // Обновляем прогресс-бар
        const totalTime = Math.round((this.settings.pomodoroLength || 0.5) * 60);
        const progress = totalTime > 0 ? Math.min(Math.max(((totalTime - this.timeLeft) / totalTime) * 100, 0), 100) : 0;
        const progressFillElements = document.querySelectorAll('.progress-fill');
        progressFillElements.forEach(el => {
            if (el.style.width !== `${progress}%`) {
                el.style.width = `${progress}%`;
            }
        });
    }

    cancelPomodoro() {
        // Сохраняем последнюю тему pomodoro перед выходом
        if (this.activeTask?.focusText) {
            this.lastPomodoroFocus = this.activeTask.focusText;
            localStorage.setItem('lastPomodoroFocus', this.lastPomodoroFocus);
            console.log('Saved last pomodoro focus:', this.lastPomodoroFocus);
        }
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.isRunning = false;
        this.isPaused = false;
        this.activeTask = null;
        this.navigateTo('home');
    }

    // Проверка и открытие достижений
    checkAndUnlockAchievements() {
        if (!Array.isArray(this.stats.achievements)) {
            this.stats.achievements = [];
        }

        const hasAchievement = (id) => {
            return this.stats.achievements.some(a => a && a.id === id);
        };

        // Достижения по уровням
        const levelAchievements = {
            1: { id: 'first_steps', title: 'Первые шаги', icon: '🎯' },
            2: { id: 'level_2', title: 'Новичок', icon: '⭐' },
            3: { id: 'level_3', title: 'Опытный', icon: '🌟' },
            5: { id: 'level_5', title: 'Профессионал', icon: '💪' },
            10: { id: 'level_10', title: 'Мастер', icon: '👑' }
        };

        // Проверяем достижения по уровням
        if (levelAchievements[this.stats.level] && !hasAchievement(levelAchievements[this.stats.level].id)) {
            this.stats.achievements.push(levelAchievements[this.stats.level]);
        }

        // Проверяем достижения по условиям
        const conditionAchievements = [
            {
                id: 'first_steps',
                title: 'Первые шаги',
                icon: '🎯',
                check: () => this.stats.totalSessions >= 1 && !hasAchievement('first_steps')
            },
            {
                id: 'marathon',
                title: 'Марафонец',
                icon: '🏃',
                check: () => this.stats.totalFocusTime >= 600 && !hasAchievement('marathon')
            },
            {
                id: 'dedication',
                title: 'Преданность',
                icon: '🔥',
                check: () => this.stats.totalSessions >= 50 && !hasAchievement('dedication')
            },
            {
                id: 'streak_7',
                title: 'Неделя силы',
                icon: '📅',
                check: () => this.stats.currentStreak >= 7 && !hasAchievement('streak_7')
            },
            {
                id: 'streak_30',
                title: 'Месяц дисциплины',
                icon: '🗓️',
                check: () => this.stats.currentStreak >= 30 && !hasAchievement('streak_30')
            },
            {
                id: 'legend',
                title: 'Легенда',
                icon: '🏆',
                check: () => this.stats.totalFocusTime >= 6000 && !hasAchievement('legend')
            }
        ];

        conditionAchievements.forEach(ach => {
            if (ach.check()) {
                this.stats.achievements.push({ id: ach.id, title: ach.title, icon: ach.icon });
            }
        });
    }

    completePomodoro() {
        console.log('completePomodoro вызван');
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.isRunning = false;
        this.timeLeft = 0; // Убеждаемся, что время = 0

        // Убеждаемся, что stats инициализированы
        if (!this.stats) {
            this.stats = {
                totalSessions: 0,
                totalFocusTime: 0,
                currentStreak: 0,
                longestStreak: 0,
                level: 1,
                xp: 0,
                achievements: []
            };
        }

        // Обновление статистики (упрощенная геймификация)
        const xpGained = 10;
        this.stats.totalSessions = (this.stats.totalSessions || 0) + 1;
        // Используем реальное значение pomodoroLength для статистики
        this.stats.totalFocusTime = (this.stats.totalFocusTime || 0) + (this.settings.pomodoroLength || 0.5);
        const oldLevel = this.stats.level || 1;
        this.stats.xp = (this.stats.xp || 0) + xpGained;
        this.stats.level = Math.floor(this.stats.xp / 100) + 1;
        const levelUp = this.stats.level > oldLevel;

        // Обновление серии дней (streak)
        this.updateStreak();

        // Проверка и открытие достижений
        this.checkAndUnlockAchievements();

        console.log('Статистика после завершения сессии:', {
            totalSessions: this.stats.totalSessions,
            totalFocusTime: this.stats.totalFocusTime,
            xp: this.stats.xp,
            level: this.stats.level,
            currentStreak: this.stats.currentStreak,
            longestStreak: this.stats.longestStreak
        });

        this.saveStats(this.stats);

        // Обновление задачи - ТОЛЬКО если Pomodoro был запущен из задачи с подзадачей
        // Если activeTask содержит taskId и subTaskId - это Pomodoro из задачи
        // Если activeTask содержит только focusText - это быстрый Pomodoro, не обновляем задачи
        if (this.activeTask?.taskId && this.activeTask?.subTaskId) {
            const task = this.tasks.find(t => String(t.id) === String(this.activeTask.taskId));
            if (task) {
                const subTask = task.subTasks.find(st => Number(st.id) === Number(this.activeTask.subTaskId));
                if (subTask) {
                    subTask.completedPomodoros++;
                    task.completedPomodoros++;
                    if (subTask.completedPomodoros >= subTask.estimatedPomodoros) {
                        subTask.completed = true;
                    }
                    this.saveTasks(this.tasks);
                }
            }
        }
        // Если это быстрый Pomodoro (без taskId/subTaskId), обновляем только статистику (уже сделано выше)

        this.activeTask = null;
        
        // Обновляем интерфейс перед показом модального окна
        this.renderApp();
        
        // Показываем модальное окно с поздравлением
        console.log('Показываем модальное окно завершения, xpGained:', xpGained, 'levelUp:', levelUp);
        this.showPomodoroCompleteModal(xpGained, levelUp);
        
        this.syncWithBot();
    }

    // Обновление серии дней (streak)
    updateStreak() {
        const today = new Date().toDateString(); // Получаем дату в формате "Mon Jan 01 2024"
        const lastSessionDate = localStorage.getItem('lastPomodoroDate');
        
        // Инициализируем streak, если его нет
        if (this.stats.currentStreak === undefined || this.stats.currentStreak === null) {
            this.stats.currentStreak = 0;
        }
        if (this.stats.longestStreak === undefined || this.stats.longestStreak === null) {
            this.stats.longestStreak = 0;
        }
        
        if (!lastSessionDate) {
            // Первая сессия - начинаем серию
            this.stats.currentStreak = 1;
            localStorage.setItem('lastPomodoroDate', today);
        } else if (lastSessionDate === today) {
            // Сессия уже была сегодня - не увеличиваем streak, но обновляем дату
            // Это нормально - streak увеличивается только при переходе на новый день
            localStorage.setItem('lastPomodoroDate', today);
        } else {
            // Проверяем, была ли сессия вчера
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayString = yesterday.toDateString();
            
            if (lastSessionDate === yesterdayString) {
                // Сессия была вчера - продолжаем серию
                this.stats.currentStreak = (this.stats.currentStreak || 0) + 1;
                localStorage.setItem('lastPomodoroDate', today);
            } else {
                // Прошло больше дня - сбрасываем серию
                this.stats.currentStreak = 1;
                localStorage.setItem('lastPomodoroDate', today);
            }
        }
        
        // Обновляем рекорд серии, если текущая серия больше
        if (this.stats.currentStreak > this.stats.longestStreak) {
            this.stats.longestStreak = this.stats.currentStreak;
        }
        
        console.log('Streak updated:', {
            currentStreak: this.stats.currentStreak,
            longestStreak: this.stats.longestStreak,
            lastSessionDate: localStorage.getItem('lastPomodoroDate'),
            today: today
        });
    }

    // Получить случайную физ разминку
    getRandomExercise() {
        const exercises = [
            "💪 10 отжиманий",
            "🏃 20 приседаний",
            "🤸 30 секунд планки",
            "🧘 5 минут растяжки",
            "🚶 Пройдись по комнате 2 минуты",
            "👆 20 наклонов головы в стороны",
            "🔄 10 круговых движений плечами",
            "🦵 15 выпадов на каждую ногу",
            "🤲 10 подъемов на носки",
            "💨 Глубокое дыхание: 5 вдохов-выдохов",
            "👋 20 махов руками",
            "🦶 15 подъемов коленей"
        ];
        return exercises[Math.floor(Math.random() * exercises.length)];
    }

    // Показать модальное окно завершения Pomodoro
    showPomodoroCompleteModal(xpGained, levelUp) {
        console.log('showPomodoroCompleteModal вызван');
        const exercise = this.getRandomExercise();
        
        // Удаляем предыдущее модальное окно, если оно есть
        const existingModal = document.querySelector('.pomodoro-complete-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'pomodoro-complete-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease;
        `;

        const modalContent = document.createElement('div');
        modalContent.className = 'pomodoro-complete-modal-content';
        modalContent.style.cssText = `
            background: white;
            border-radius: 24px;
            padding: 32px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
        `;

        let levelUpText = '';
        if (levelUp) {
            levelUpText = `<div style="color: var(--primary); font-weight: bold; margin-bottom: 16px; font-size: 18px;">🎉 Новый уровень! 🎉</div>`;
        }

        modalContent.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
            <h2 style="font-size: 24px; margin-bottom: 8px; color: var(--text);">Молодец!</h2>
            <p style="color: var(--text-secondary); margin-bottom: 24px;">Сессия завершена успешно</p>
            ${levelUpText}
            <div style="background: linear-gradient(135deg, var(--primary), var(--accent)); 
                        color: white; 
                        padding: 16px; 
                        border-radius: 12px; 
                        margin-bottom: 24px;">
                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 4px;">Получено XP</div>
                <div style="font-size: 32px; font-weight: bold;">+${xpGained}</div>
            </div>
            <div style="background: var(--background-secondary); 
                        padding: 20px; 
                        border-radius: 12px; 
                        margin-bottom: 24px;">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text);">
                    ⏰ Отдохни 5 минут
                </div>
                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 16px;">
                    Предлагаем сделать физ разминку:
                </div>
                <div style="font-size: 18px; font-weight: 600; color: var(--primary);">
                    ${exercise}
                </div>
            </div>
            <button class="btn primary" style="width: 100%;" id="closePomodoroModal">
                Продолжить
            </button>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        const closeModal = () => {
            console.log('Закрываем модальное окно');
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            // Переходим на главный экран после закрытия модального окна
            this.navigateTo('home');
        };

        // Ждем, пока DOM обновится, прежде чем добавлять обработчики
        setTimeout(() => {
            const closeBtn = document.getElementById('closePomodoroModal');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeModal);
            }
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
        }, 100);
        
        console.log('Модальное окно добавлено в DOM');
    }

    // Быстрый старт Pomodoro (из навигации) - БЕЗ привязки к задаче
    startQuickPomodoro() {
        console.log('startQuickPomodoro called, activeTask exists:', !!this.activeTask);
        if (this.activeTask) {
            // Если таймер активен (пауза или готов к старту), просто переходим к экрану без модалки
            this.navigateTo('pomodoro');
        } else {
            // Иначе показываем модалку для новой темы (БЕЗ создания задачи)
            this.showQuickPomodoroModal();
        }
    }

    // Удаление задачи
    deleteTask(taskId) {
        if (!taskId) {
            console.error('deleteTask: taskId is missing');
            return;
        }
        // Приводим к строке для сравнения
        const idStr = String(taskId);
        const beforeCount = this.tasks.length;
        console.log('deleteTask before filter:', { taskId: idStr, tasks: this.tasks.map(t => ({ id: String(t.id), title: t.title })) });
        
        // Фильтруем задачи
        const originalTasks = [...this.tasks];
        this.tasks = this.tasks.filter(t => {
            const taskIdStr = String(t.id);
            const shouldKeep = taskIdStr !== idStr;
            console.log('Filtering task:', { taskId: taskIdStr, shouldKeep, match: taskIdStr === idStr });
            return shouldKeep;
        });
        
        const afterCount = this.tasks.length;
        console.log('deleteTask after filter:', { 
            taskId: idStr, 
            beforeCount, 
            afterCount, 
            deleted: beforeCount > afterCount,
            originalTasks: originalTasks.map(t => String(t.id)),
            remainingTasks: this.tasks.map(t => String(t.id))
        });
        
        if (beforeCount === afterCount) {
            console.error('deleteTask: Task was not deleted!', { 
                taskId: idStr, 
                allTaskIds: this.tasks.map(t => String(t.id)),
                originalTaskIds: originalTasks.map(t => String(t.id))
            });
            alert('Ошибка: задача не была удалена. Проверьте консоль для деталей.');
            return;
        }
        
        this.saveTasks(this.tasks);
        this.syncWithBot();
        // Если удалили текущую задачу, возвращаемся на главную
        if (this.selectedTaskId === idStr) {
            this.selectedTaskId = null;
            this.navigateTo('home');
        } else {
            this.renderApp();
        }
    }

    // Показать модальное окно подтверждения удаления задачи
    showDeleteTaskConfirm(taskId) {
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'confirm-modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <h2 style="margin-bottom: 16px;">Удалить задачу?</h2>
            <p style="margin-bottom: 24px; color: #666;">Это действие нельзя отменить.</p>
            <div style="display: flex; gap: 12px;">
                <button class="btn primary" id="confirmDeleteTask" style="flex: 1; background: var(--error);">Удалить</button>
                <button class="btn secondary" id="cancelDeleteTask" style="flex: 1;">Отмена</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        const confirmBtn = document.getElementById('confirmDeleteTask');
        const cancelBtn = document.getElementById('cancelDeleteTask');
        
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };
        
        confirmBtn.addEventListener('click', () => {
            console.log('Calling deleteTask with:', taskId);
            this.deleteTask(taskId);
            closeModal();
        });
        
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Показать модальное окно подтверждения удаления подзадачи
    showDeleteSubTaskConfirm(taskId, subTaskId) {
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'confirm-modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <h2 style="margin-bottom: 16px;">Удалить действие из плана?</h2>
            <p style="margin-bottom: 24px; color: #666;">Это действие нельзя отменить.</p>
            <div style="display: flex; gap: 12px;">
                <button class="btn primary" id="confirmDeleteSubTask" style="flex: 1; background: var(--error);">Удалить</button>
                <button class="btn secondary" id="cancelDeleteSubTask" style="flex: 1;">Отмена</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        const confirmBtn = document.getElementById('confirmDeleteSubTask');
        const cancelBtn = document.getElementById('cancelDeleteSubTask');
        
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };
        
        confirmBtn.addEventListener('click', () => {
            this.deleteSubTask(taskId, subTaskId);
            closeModal();
        });
        
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Удаление подзадачи
    deleteSubTask(taskId, subTaskId) {
        const task = this.tasks.find(t => String(t.id) === String(taskId));
        if (!task) return;
        
        const subTask = task.subTasks.find(st => Number(st.id) === Number(subTaskId));
        if (!subTask) return;

        // Удаляем подзадачу
        const oldPomodoros = subTask.estimatedPomodoros;
        const oldCompleted = subTask.completedPomodoros;
        task.subTasks = task.subTasks.filter(st => Number(st.id) !== Number(subTaskId));
        
        // Пересчитываем общее количество pomodoros
        task.totalPomodoros = task.totalPomodoros - oldPomodoros;
        task.completedPomodoros = Math.max(0, task.completedPomodoros - oldCompleted);
        
        this.saveTasks(this.tasks);
        this.syncWithBot();
        this.renderApp();
    }

    // Показать модальное окно для быстрого Pomodoro (БЕЗ привязки к задаче)
    showQuickPomodoroModal() {
        const modal = document.createElement('div');
        modal.className = 'focus-input-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'focus-input-modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <h2 style="margin-bottom: 16px;">На что фокус?</h2>
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Опиши задачу для фокуса:</label>
            <input type="text" id="focusInput" value="${this.lastPomodoroFocus || ''}" placeholder="Например: Изучить новую тему" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 16px; font-size: 16px;">
            <div style="display: flex; gap: 12px;">
                <button class="btn primary" id="startQuickFocusPomodoro" style="flex: 1;">Начать Pomodoro</button>
                <button class="btn secondary" id="cancelQuickFocusInput" style="flex: 1;">Отмена</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Фокус на поле ввода для показа клавиатуры
        const focusInput = document.getElementById('focusInput');
        setTimeout(() => focusInput.focus(), 100);
        
        // Обработчики
        const startBtn = document.getElementById('startQuickFocusPomodoro');
        const cancelBtn = document.getElementById('cancelQuickFocusInput');
        
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };
        
        const startPomodoro = () => {
            const focusText = document.getElementById('focusInput').value.trim();
            if (!focusText) {
                alert('Пожалуйста, введите задачу для фокуса');
                return;
            }
            
            // Сохраняем последнюю тему
            this.lastPomodoroFocus = focusText;
            localStorage.setItem('lastPomodoroFocus', focusText);
            
            // Создаем быстрый Pomodoro БЕЗ привязки к задаче
            // activeTask будет содержать только focusText, без taskId и subTaskId
            this.activeTask = { focusText: focusText };
            this.timeLeft = Math.round((this.settings.pomodoroLength || 0.5) * 60);
            this.isRunning = false;
            this.isPaused = false;
            
            closeModal();
            this.navigateTo('pomodoro');
        };
        
        startBtn.addEventListener('click', startPomodoro);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Показать модальное окно для ввода фокуса перед pomodoro (для задач)
    showFocusInputModal() {
        const modal = document.createElement('div');
        modal.className = 'focus-input-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'focus-input-modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <h2 style="margin-bottom: 16px;">На что фокус?</h2>
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Опиши задачу для фокуса:</label>
            <input type="text" id="focusInput" value="${this.lastPomodoroFocus || ''}" placeholder="Например: Изучить новую тему" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 16px; font-size: 16px;">
            <div style="display: flex; gap: 12px;">
                <button class="btn primary" id="startFocusPomodoro" style="flex: 1;">Начать Pomodoro</button>
                <button class="btn secondary" id="cancelFocusInput" style="flex: 1;">Отмена</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Фокус на поле ввода для показа клавиатуры
        const focusInput = document.getElementById('focusInput');
        setTimeout(() => focusInput.focus(), 100);
        
        // Обработчики
        const startBtn = document.getElementById('startFocusPomodoro');
        const cancelBtn = document.getElementById('cancelFocusInput');
        
        const closeModal = () => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        };
        
        const startPomodoro = () => {
            const focusText = document.getElementById('focusInput').value.trim();
            if (!focusText) {
                alert('Пожалуйста, введите задачу для фокуса');
                return;
            }
            
            // Сохраняем последнюю тему
            this.lastPomodoroFocus = focusText;
            localStorage.setItem('lastPomodoroFocus', focusText);
            
            // Создаем временную задачу или используем существующую
            if (this.tasks.length > 0) {
                const lastTask = this.tasks[this.tasks.length - 1];
                if (lastTask && lastTask.subTasks.length > 0) {
                    const activeSubTask = lastTask.subTasks.find(st => !st.completed) || lastTask.subTasks[0];
                    this.startPomodoro(lastTask.id, activeSubTask.id, focusText);
                } else {
                    // Создаем быструю задачу
                    this.createTask(focusText).then(() => {
                        const newTask = this.tasks[this.tasks.length - 1];
                        if (newTask && newTask.subTasks.length > 0) {
                            this.startPomodoro(newTask.id, newTask.subTasks[0].id, focusText);
                        }
                    });
                }
            } else {
                // Нет задач, создаем новую
                this.createTask(focusText).then(() => {
                    const newTask = this.tasks[this.tasks.length - 1];
                    if (newTask && newTask.subTasks.length > 0) {
                        this.startPomodoro(newTask.id, newTask.subTasks[0].id, focusText);
                    }
                });
            }
            closeModal();
        };
        
        startBtn.addEventListener('click', startPomodoro);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Сохранение по Enter
        focusInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                startPomodoro();
            }
        });
    }

    // Редактирование подзадачи
    editSubTask(taskId, subTaskId) {
        const task = this.tasks.find(t => String(t.id) === String(taskId));
        if (!task) return;
        
        const subTask = task.subTasks.find(st => Number(st.id) === Number(subTaskId));
        if (!subTask) return;

        // Создаем модальное окно для редактирования
        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'edit-modal-content';
        modalContent.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
        `;
        
        modalContent.innerHTML = `
            <h2 style="margin-bottom: 16px;">Редактировать подзадачу</h2>
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Название:</label>
            <input type="text" id="editSubTaskTitle" value="${subTask.title}" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 16px; font-size: 16px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Количество pomodoro сессий:</label>
            <input type="number" id="editSubTaskPomodoros" value="${subTask.estimatedPomodoros}" min="1" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 16px; font-size: 16px;">
            <div style="display: flex; gap: 12px;">
                <button class="btn primary" id="saveEditSubTask" style="flex: 1;">Сохранить</button>
                <button class="btn secondary" id="cancelEditSubTask" style="flex: 1;">Отмена</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Фокус на первое поле для показа клавиатуры
        const titleInput = document.getElementById('editSubTaskTitle');
        setTimeout(() => titleInput.focus(), 100);
        
        // Обработчики
        const saveBtn = document.getElementById('saveEditSubTask');
        const cancelBtn = document.getElementById('cancelEditSubTask');
        
        const closeModal = () => {
            document.body.removeChild(modal);
        };
        
        const saveChanges = () => {
            const newTitle = document.getElementById('editSubTaskTitle').value.trim();
            const newPomodoros = parseInt(document.getElementById('editSubTaskPomodoros').value);
            
            if (newTitle) {
                subTask.title = newTitle;
            }
            
            if (!isNaN(newPomodoros) && newPomodoros > 0) {
                const oldPomodoros = subTask.estimatedPomodoros;
                subTask.estimatedPomodoros = newPomodoros;
                // Пересчитываем общее количество pomodoros для задачи
                task.totalPomodoros = task.totalPomodoros - oldPomodoros + newPomodoros;
            }
            
            this.saveTasks(this.tasks);
            this.syncWithBot();
            this.renderApp();
            closeModal();
        };
        
        saveBtn.addEventListener('click', saveChanges);
        cancelBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Сохранение по Enter
        titleInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('editSubTaskPomodoros').focus();
            }
        });
        
        document.getElementById('editSubTaskPomodoros').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveChanges();
            }
        });
    }

    // Рендер экранов
    renderOnboarding() {
        return `
            <div class="app-container">
                <div class="container">
                    <div class="flex column center" style="text-align: center; margin-bottom: 32px;">
                        <div style="font-size: 80px; margin-bottom: 16px;">🎯</div>
                        <h1 class="title">Добро пожаловать в FocusHelper!</h1>
                        <p class="body">Настроим Pomodoro под тебя для максимальной продуктивности.</p>
                    </div>

                    <div class="panel">
                        <div class="label">Сколько часов в день ты готов уделять задачам?</div>
                        <div class="grid cols-3 gap-12">
                            <button class="btn secondary ${Number(this.settings.dailyHours) === 2 ? 'selected' : ''}" data-action="setDailyHours" data-value="2">2 часа</button>
                            <button class="btn secondary ${Number(this.settings.dailyHours) === 4 ? 'selected' : ''}" data-action="setDailyHours" data-value="4">4 часа</button>
                            <button class="btn secondary ${Number(this.settings.dailyHours) === 6 ? 'selected' : ''}" data-action="setDailyHours" data-value="6">6+ часов</button>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="label">В какое время ты наиболее продуктивен?</div>
                        <div class="grid cols-2 gap-12">
                            <button class="btn secondary ${String(this.settings.productiveTime) === 'morning' ? 'selected' : ''}" data-action="setProductiveTime" data-value="morning">🌅 Утро</button>
                            <button class="btn secondary ${String(this.settings.productiveTime) === 'afternoon' ? 'selected' : ''}" data-action="setProductiveTime" data-value="afternoon">☀️ День</button>
                            <button class="btn secondary ${String(this.settings.productiveTime) === 'evening' ? 'selected' : ''}" data-action="setProductiveTime" data-value="evening">🌆 Вечер</button>
                            <button class="btn secondary ${String(this.settings.productiveTime) === 'night' ? 'selected' : ''}" data-action="setProductiveTime" data-value="night">🌙 Ночь</button>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="label">Длина сессии Pomodoro</div>
                        <div class="grid cols-3 gap-12">
                            <button class="btn secondary ${Number(this.settings.pomodoroLength) === 25 ? 'selected' : ''}" data-action="setPomodoro" data-value="25">25 мин</button>
                            <button class="btn secondary ${Number(this.settings.pomodoroLength) === 50 ? 'selected' : ''}" data-action="setPomodoro" data-value="50">50 мин</button>
                            <button class="btn secondary ${Number(this.settings.pomodoroLength) === 90 ? 'selected' : ''}" data-action="setPomodoro" data-value="90">90 мин</button>
                        </div>
                    </div>

                    <button class="btn primary" data-action="completeOnboarding">Начать!</button>
                </div>
                ${this.renderNavigation()}
            </div>
        `;
    }

    renderHome() {
        const taskList = this.tasks.map(task => {
            const isTaskDone = this.isTaskCompleted(task);
            return `
            <div class="task-item" ${isTaskDone ? 'style="opacity: 0.7;"' : ''}>
                <div class="task-item-header">
                    <div class="flex center">
                        <div class="emoji-icon">📝</div>
                        <div class="task-item-content">
                            <div class="task-item-title">
                                ${task.title} ${isTaskDone ? '✅' : ''}
                            </div>
                            <div class="task-item-meta">${task.subTasks.length} шагов • ${task.completedPomodoros}/${task.totalPomodoros} сессий ${isTaskDone ? '• Завершено' : ''}</div>
                        </div>
                    </div>
                    ${!isTaskDone ? `
                    <div class="flex gap-8">
                        <button class="icon-btn" data-action="viewTask" data-id="${task.id}" title="Просмотр">👁️</button>
                        <button class="icon-btn" data-action="deleteTask" data-id="${task.id}" title="Удалить">🗑️</button>
                    </div>
                    ` : ''}
                </div>
                <div class="progress-bar" style="margin-top: 12px;">
                    <div class="progress-fill" style="width: ${Math.min((task.completedPomodoros / task.totalPomodoros) * 100, 100)}%;"></div>
                </div>
            </div>
        `;
        }).join('');

        return `
            <div class="app-container">
                <div class="container">
                    <h1 class="title">Твои задачи</h1>
                    <button class="btn primary" data-action="createTask" style="margin-bottom: 16px;">+ Создать задачу</button>
                    <div class="task-list">${taskList || '<p class="caption">Нет задач. Создай первую!</p>'}</div>
                </div>
                ${this.renderNavigation()}
            </div>
        `;
    }

    renderCreateTask() {
        // Получаем сегодняшнюю дату в формате YYYY-MM-DD для минимального значения
        const today = new Date();
        const minDate = today.toISOString().split('T')[0];
        
        return `
            <div class="app-container">
                <div class="container">
                    <h1 class="title">Создать задачу</h1>
                    <div class="panel">
                        <label class="label">Опиши задачу</label>
                        <textarea class="input text-area" id="taskDescription" placeholder="Например: Подготовиться к экзамену"></textarea>
                        <label class="label">Дедлайн (опционально)</label>
                        <input type="date" class="input" id="deadline" min="${minDate}" style="font-size: 16px;">
                        <button class="btn primary" data-action="analyzeTask">Разобрать с AI (заглушка)</button>
                        <div id="generatedPlan"></div>
                        <button class="btn primary" id="saveTask" style="display: none;" data-action="saveTask">Сохранить план</button>
                    </div>
                </div>
                ${this.renderNavigation()}
            </div>
        `;
    }

    renderTaskDetails(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return this.renderHome();

        const isTaskDone = this.isTaskCompleted(task);
        const subTasksList = task.subTasks.map((st, index) => {
            const isSubTaskDone = this.isSubTaskCompleted(st);
            const canStart = this.canStartPomodoroForSubTask(task, st.id);
            return `
            <div class="task-item" data-subtask-id="${st.id}" ${isSubTaskDone ? 'style="opacity: 0.7;"' : ''}>
                <div class="task-item-header">
                    <div class="flex center" style="flex: 1;">
                        <div class="task-item-number">${index + 1}</div>
                        <div class="task-item-content" style="flex: 1;">
                            <div class="task-item-title editable-title" data-editable="true" data-subtask-id="${st.id}">
                                ${st.title} ${isSubTaskDone ? '✅' : ''}
                            </div>
                            <div class="task-item-meta">🍅 ${st.completedPomodoros}/${st.estimatedPomodoros} сессий ${isSubTaskDone ? '(Завершено)' : !canStart ? '(Сначала завершите предыдущие)' : ''}</div>
                        </div>
                    </div>
                    ${!isSubTaskDone && !isTaskDone ? `
                    <div class="flex gap-8">
                        <button class="icon-btn" data-action="editSubTask" data-task-id="${task.id}" data-subtask-id="${st.id}" title="Редактировать">✏️</button>
                        <button class="icon-btn" data-action="deleteSubTask" data-task-id="${task.id}" data-subtask-id="${st.id}" title="Удалить">🗑️</button>
                    </div>
                    ` : ''}
                </div>
                ${!isSubTaskDone && !isTaskDone ? `
                <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
                    ${canStart ? `
                    <button class="btn primary" style="padding: 8px 12px; font-size: 14px;" data-action="startPomodoro" data-task="${task.id}" data-subtask="${st.id}">▶️ Начать</button>
                    ` : `
                    <button class="btn secondary" style="padding: 8px 12px; font-size: 14px; opacity: 0.5; cursor: not-allowed;" disabled title="Сначала завершите предыдущие подзадачи">⏸️ Заблокировано</button>
                    `}
                </div>
                ` : ''}
                ${st.completedPomodoros > 0 ? `
                    <div class="progress-bar" style="margin-top: 12px;">
                        <div class="progress-fill" style="width: ${Math.min((st.completedPomodoros / st.estimatedPomodoros) * 100, 100)}%;"></div>
                    </div>
                ` : ''}
            </div>
        `;
        }).join('');

        return `
            <div class="app-container">
                <div class="container">
                    <div class="flex between center" style="margin-bottom: 16px;">
                        <div style="flex: 1;">
                            <button class="btn tertiary" data-action="navigate" data-view="home" style="padding: 8px 16px; font-size: 14px; width: auto; margin-bottom: 8px;">← Назад</button>
                            <h1 class="title" style="margin-bottom: 0;">${task.title}</h1>
                        </div>
                    </div>
                    ${task.deadline ? `<p class="subtitle" style="margin-top: 8px;">📅 Дедлайн: ${new Date(task.deadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
                    <div class="panel">
                        <div class="flex between center" style="margin-bottom: 12px;">
                            <div class="body">Прогресс</div>
                            <div class="progress-percentage">${Math.round((task.completedPomodoros / task.totalPomodoros) * 100)}%</div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${ (task.completedPomodoros / task.totalPomodoros) * 100 }%;"></div>
                        </div>
                        <div class="grid cols-3 gap-12" style="margin-top: 16px;">
                            <div class="stat-box">
                                <div class="stat-value">${task.completedPomodoros}</div>
                                <div class="stat-label">Завершено</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-value">${task.totalPomodoros - task.completedPomodoros}</div>
                                <div class="stat-label">Осталось</div>
                            </div>
                            <div class="stat-box">
                                <div class="stat-value">${task.subTasks.filter(st => st.completed).length}/${task.subTasks.length}</div>
                                <div class="stat-label">Шаги</div>
                            </div>
                        </div>
                    </div>
                    <div class="panel">
                        <h2 class="subtitle" style="margin-bottom: 16px;">
                            План действий 
                            ${isTaskDone ? '<span style="color: var(--primary); font-size: 14px;">✅ Завершено</span>' : ''}
                        </h2>
                        <div class="task-list">${subTasksList}</div>
                    </div>
                </div>
                ${this.renderNavigation()}
            </div>
        `;
    }

    renderPomodoro() {
        if (!this.activeTask) return this.renderHome();

        // Определяем, это Pomodoro из задачи или быстрый Pomodoro
        const isQuickPomodoro = !this.activeTask.taskId || !this.activeTask.subTaskId;
        
        let focusText = 'Фокус';
        if (isQuickPomodoro) {
            // Быстрый Pomodoro - используем только focusText
            focusText = this.activeTask.focusText || 'Фокус';
        } else {
            // Pomodoro из задачи - получаем информацию о задаче и подзадаче
            const task = this.tasks.find(t => String(t.id) === String(this.activeTask.taskId));
            const subTask = task?.subTasks.find(st => Number(st.id) === Number(this.activeTask.subTaskId));
            focusText = this.activeTask.focusText || (subTask ? subTask.title : 'Фокус');
            
            if (!task || !subTask) {
                console.error('renderPomodoro: task or subTask not found', { 
                    taskId: this.activeTask.taskId, 
                    subTaskId: this.activeTask.subTaskId,
                    tasks: this.tasks.map(t => ({ id: t.id, title: t.title }))
                });
                return this.renderHome();
            }
        }

        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        // Для расчета прогресса используем текущее значение pomodoroLength
        const totalTime = Math.round((this.settings.pomodoroLength || 0.5) * 60);
        // Расчет прогресса для плавной анимации
        const progress = totalTime > 0 ? Math.min(Math.max(((totalTime - this.timeLeft) / totalTime) * 100, 0), 100) : 0;

        // Если таймер еще не запущен, показываем кнопку "Начать"
        if (!this.isRunning && !this.isPaused) {
            return `
                <div class="app-container">
                    <div class="container flex column center" style="text-align: center;">
                        <div class="flex center" style="margin-bottom: 16px;">
                            <div class="emoji-icon">🍅</div>
                            <div class="body">Фокус на: ${focusText}</div>
                        </div>
                        <div class="timer-container">
                            <div class="timer-circle">
                                <div class="timer-text">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</div>
                                <div class="timer-label">Готов начать?</div>
                            </div>
                        </div>
                        <div class="flex gap-16" style="margin-top: 24px;">
                            <button class="btn primary" data-action="startTimer" style="min-width: 200px;">▶️ Начать Pomodoro</button>
                        </div>
                        <div class="flex gap-16" style="margin-top: 16px;">
                            <button class="btn secondary" data-action="cancelPomodoro" style="min-width: 200px;">❌ Отмена</button>
                        </div>
                    </div>
                    ${this.renderNavigation()}
                </div>
            `;
        }

        return `
            <div class="app-container">
                <div class="container flex column center" style="text-align: center;">
                    <div class="flex center" style="margin-bottom: 16px;">
                        <div class="emoji-icon">🍅</div>
                        <div class="body">Фокус на: ${focusText}</div>
                    </div>
                    <div class="timer-container ${this.isRunning && !this.isPaused ? 'pulsing' : ''}">
                        <div class="timer-circle">
                            <div class="timer-text">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</div>
                            <div class="timer-label">${this.isPaused ? 'Пауза' : 'Фокус-режим'}</div>
                        </div>
                    </div>
                    <div class="progress-bar" style="width: 100%; max-width: 280px; margin: 16px 0;">
                        <div class="progress-fill" style="width: ${progress}%;"></div>
                    </div>
                    <div class="flex gap-16">
                        <button class="btn primary" data-action="pausePomodoro" style="min-width: 120px;">
                            ${this.isPaused ? '▶️ Продолжить' : '⏸️ Пауза'}
                        </button>
                        <button class="btn secondary" data-action="cancelPomodoro" style="min-width: 120px;">❌ Отмена</button>
                    </div>
                    <p class="caption" style="margin-top: 16px;">Сосредоточься! Уведомлю по завершении.</p>
                </div>
                ${this.renderNavigation()}
            </div>
        `;
    }

    renderSettings() {
        const productiveTimeOptions = [
            { value: 'morning', label: '🌅 Утро (6:00 - 12:00)' },
            { value: 'afternoon', label: '☀️ День (12:00 - 18:00)' },
            { value: 'evening', label: '🌆 Вечер (18:00 - 24:00)' },
            { value: 'night', label: '🌙 Ночь (0:00 - 6:00)' }
        ];

        return `
            <div class="app-container">
                <div class="container">
                    <h1 class="title">⚙️ Настройки Pomodoro</h1>
                    
                    <div class="panel">
                        <label class="label">Длительность сессии Pomodoro (минуты)</label>
                        <input 
                            type="number" 
                            id="pomodoroLength" 
                            class="input" 
                            min="5" 
                            max="120" 
                            step="5" 
                            value="${this.settings.pomodoroLength || 25}"
                            style="margin-bottom: 8px;"
                        >
                        <p class="caption">Рекомендуется: 25 минут</p>
                    </div>

                    <div class="panel">
                        <label class="label">Продуктивное время</label>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            ${productiveTimeOptions.map(option => `
                                <button 
                                    class="btn secondary ${this.settings.productiveTime === option.value ? 'selected' : ''}" 
                                    data-action="setProductiveTime" 
                                    data-value="${option.value}"
                                    style="text-align: left; justify-content: flex-start;"
                                >
                                    ${option.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="panel">
                        <label class="label">Сколько часов в день уделять задачам</label>
                        <input 
                            type="number" 
                            id="dailyHours" 
                            class="input" 
                            min="1" 
                            max="12" 
                            step="1" 
                            value="${this.settings.dailyHours || 4}"
                            style="margin-bottom: 8px;"
                        >
                        <p class="caption">Рекомендуется: 4-6 часов</p>
                    </div>

                    <div class="panel">
                        <label class="label">Длительность перерыва (минуты)</label>
                        <input 
                            type="number" 
                            id="breakLength" 
                            class="input" 
                            min="1" 
                            max="30" 
                            step="1" 
                            value="${this.settings.breakLength || 5}"
                            style="margin-bottom: 8px;"
                        >
                        <p class="caption">Рекомендуется: 5 минут</p>
                    </div>

                    <button class="btn primary" data-action="saveSettings" style="margin-top: 16px;">
                        💾 Сохранить настройки
                    </button>
                </div>
                ${this.renderNavigation()}
            </div>
        `;
    }

    renderStatistics() {
        console.log('renderStatistics called, current stats:', this.stats);
        
        // Загружаем статистику из localStorage если нужно
        const savedStats = localStorage.getItem('focus_stats');
        if (savedStats) {
            try {
                const parsed = JSON.parse(savedStats);
                console.log('Loaded stats from localStorage:', parsed);
                this.stats = { ...this.stats, ...parsed };
            } catch (e) {
                console.error('Error parsing stats:', e);
            }
        }
        
        // Убеждаемся, что статистика загружена (fallback)
        if (!this.stats) {
            this.stats = {
                totalSessions: 0,
                totalFocusTime: 0,
                currentStreak: 0,
                longestStreak: 0,
                level: 1,
                xp: 0,
                achievements: []
            };
        }
        
        // Убеждаемся, что achievements всегда массив
        if (!Array.isArray(this.stats.achievements)) {
            this.stats.achievements = [];
        }
        
        // Убеждаемся, что все числовые поля существуют
        this.stats.totalSessions = this.stats.totalSessions || 0;
        this.stats.totalFocusTime = this.stats.totalFocusTime || 0;
        this.stats.currentStreak = this.stats.currentStreak || 0;
        this.stats.longestStreak = this.stats.longestStreak || 0;
        this.stats.level = this.stats.level || 1;
        this.stats.xp = this.stats.xp || 0;
        
        // Проверяем и открываем достижения при просмотре статистики
        this.checkAndUnlockAchievements();
        
        console.log('Using stats for render:', this.stats);
        
        const hours = Math.floor(this.stats.totalFocusTime / 60);
        const minutes = this.stats.totalFocusTime % 60;
        const levelProgress = this.stats.xp % 100;

        // Определяем, какие достижения разблокированы
        const hasAchievement = (id) => {
            return Array.isArray(this.stats.achievements) && 
                this.stats.achievements.some(a => a && a.id === id);
        };

        // Все возможные достижения с условиями открытия
        const allAchievements = [
            { 
                id: 'first_steps', 
                title: 'Первые шаги', 
                icon: '🎯',
                description: 'Заверши первую сессию',
                unlockLevel: 1
            },
            { 
                id: 'level_2', 
                title: 'Новичок', 
                icon: '⭐',
                description: 'Достигни 2 уровня',
                unlockLevel: 2
            },
            { 
                id: 'level_3', 
                title: 'Опытный', 
                icon: '🌟',
                description: 'Достигни 3 уровня',
                unlockLevel: 3
            },
            { 
                id: 'level_5', 
                title: 'Профессионал', 
                icon: '💪',
                description: 'Достигни 5 уровня',
                unlockLevel: 5
            },
            { 
                id: 'level_10', 
                title: 'Мастер', 
                icon: '👑',
                description: 'Достигни 10 уровня',
                unlockLevel: 10
            },
            { 
                id: 'marathon', 
                title: 'Марафонец', 
                icon: '🏃',
                description: '10 часов фокуса',
                unlockLevel: 3,
                checkCondition: () => this.stats.totalFocusTime >= 600
            },
            { 
                id: 'dedication', 
                title: 'Преданность', 
                icon: '🔥',
                description: '50 завершенных сессий',
                unlockLevel: 4,
                checkCondition: () => this.stats.totalSessions >= 50
            },
            { 
                id: 'streak_7', 
                title: 'Неделя силы', 
                icon: '📅',
                description: '7 дней подряд',
                unlockLevel: 2,
                checkCondition: () => this.stats.currentStreak >= 7
            },
            { 
                id: 'streak_30', 
                title: 'Месяц дисциплины', 
                icon: '🗓️',
                description: '30 дней подряд',
                unlockLevel: 6,
                checkCondition: () => this.stats.currentStreak >= 30
            },
            { 
                id: 'legend', 
                title: 'Легенда', 
                icon: '🏆',
                description: '100 часов фокуса',
                unlockLevel: 8,
                checkCondition: () => this.stats.totalFocusTime >= 6000
            }
        ];

        // Фильтруем достижения: показываем только те, которые доступны для текущего уровня
        const availableAchievements = allAchievements.filter(ach => 
            this.stats.level >= ach.unlockLevel
        );

        // Проверяем, какие достижения разблокированы
        const achievements = availableAchievements.map(ach => {
            const unlocked = hasAchievement(ach.id);
            
            return {
                ...ach,
                unlocked
            };
        }).map(ach => `
            <div class="task-item ${ach.unlocked ? '' : 'achievement-locked'}">
                <div class="flex center">
                    <span class="emoji-icon" style="opacity: ${ach.unlocked ? '1' : '0.3'};">${ach.icon}</span>
                    <div class="task-item-content" style="flex: 1;">
                        <div class="task-item-title" style="opacity: ${ach.unlocked ? '1' : '0.5'};">${ach.title}</div>
                        <div class="task-item-meta" style="opacity: ${ach.unlocked ? '0.7' : '0.4'};">${ach.description}</div>
                    </div>
                    ${ach.unlocked ? '<span style="color: var(--success); font-size: 20px;">✓</span>' : '<span style="color: var(--text-tertiary); font-size: 16px;">🔒</span>'}
                </div>
            </div>
        `).join('');

        // Показываем закрытые достижения (следующие по уровню)
        const lockedAchievements = allAchievements
            .filter(ach => this.stats.level < ach.unlockLevel)
            .slice(0, 3) // Показываем только 3 следующих
            .map(ach => `
            <div class="task-item achievement-locked">
                <div class="flex center">
                    <span class="emoji-icon" style="opacity: 0.2;">${ach.icon}</span>
                    <div class="task-item-content" style="flex: 1;">
                        <div class="task-item-title" style="opacity: 0.4;">${ach.title}</div>
                        <div class="task-item-meta" style="opacity: 0.3;">Откроется на уровне ${ach.unlockLevel}</div>
                    </div>
                    <span style="color: var(--text-tertiary); font-size: 16px;">🔒</span>
                </div>
            </div>
        `).join('');

        return `
            <div class="app-container">
                <div class="container">
                    <div style="margin-bottom: 16px;">
                        <button class="btn tertiary" data-action="navigate" data-view="home" style="padding: 8px 16px; font-size: 14px; width: auto; margin-bottom: 8px;">← Назад</button>
                        <h1 class="title" style="margin-bottom: 0;">Статистика</h1>
                    </div>
                    <div class="panel">
                        <div class="flex center" style="gap: 16px; margin-bottom: 16px;">
                            <div style="font-size: 32px;">🏆</div>
                            <div>
                                <div class="body">Уровень ${this.stats.level}</div>
                                <div class="caption">${levelProgress}/100 XP</div>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${levelProgress}%;"></div>
                        </div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-value">${this.stats.totalSessions}</div>
                            <div class="stat-label">Сессий</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${hours}ч ${minutes}м</div>
                            <div class="stat-label">Время фокуса</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${this.stats.currentStreak}</div>
                            <div class="stat-label">Серия дней</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-value">${this.stats.longestStreak}</div>
                            <div class="stat-label">Рекорд</div>
                        </div>
                    </div>
                    <div class="panel">
                        <h2 class="subtitle" style="margin-bottom: 16px;">Достижения</h2>
                        <div class="task-list">${achievements}</div>
                        ${lockedAchievements ? `
                            <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border);">
                                <h3 class="subtitle" style="margin-bottom: 16px; opacity: 0.6;">Следующие достижения</h3>
                                <div class="task-list">${lockedAchievements}</div>
                            </div>
                        ` : ''}
                    </div>
                </div>
                ${this.renderNavigation()}
            </div>
        `;
    }

    renderApp() {
        const appDiv = document.getElementById('app');
        let content = '<div class="loading">Загрузка...</div>';

        switch (this.currentView) {
            case 'onboarding':
                content = this.renderOnboarding();
                break;
            case 'home':
                content = this.renderHome();
                break;
            case 'createTask':
                content = this.renderCreateTask();
                break;
            case 'taskDetails':
                const taskId = this.selectedTaskId || ''; // Для деталей
                content = this.renderTaskDetails(taskId);
                break;
            case 'pomodoro':
                content = this.renderPomodoro();
                break;
            case 'statistics':
                content = this.renderStatistics();
                break;
            case 'settings':
                content = this.renderSettings();
                break;
        }

        appDiv.innerHTML = content;

        // Прикрепить слушатели после рендера
        this.attachDynamicEventListeners();
    }

    // Навигация
    renderNavigation() {
        return `
            <nav class="navigation">
                <button class="nav-item ${this.currentView === 'home' ? 'active' : ''}" data-action="navigate" data-view="home">
                    <span class="icon">📋</span>
                    <span class="text">Задачи</span>
                </button>
                <button class="nav-item ${this.currentView === 'createTask' ? 'active' : ''}" data-action="navigate" data-view="createTask">
                    <span class="icon">+</span>
                    <span class="text">Новая</span>
                </button>
                <button class="nav-item ${this.currentView === 'pomodoro' ? 'active' : ''}" data-action="startQuickPomodoro">
                    <span class="icon">🍅</span>
                    <span class="text">Pomodoro</span>
                </button>
                <button class="nav-item ${this.currentView === 'statistics' ? 'active' : ''}" data-action="navigate" data-view="statistics">
                    <span class="icon">📊</span>
                    <span class="text">Статистика</span>
                </button>
                <button class="nav-item ${this.currentView === 'settings' ? 'active' : ''}" data-action="navigate" data-view="settings">
                    <span class="icon">⚙️</span>
                    <span class="text">Настройки</span>
                </button>
            </nav>
        `;
    }

    // Слушатели событий
    attachEventListeners() {
        // Удаляем старый обработчик, если он был
        if (this.clickHandler) {
            document.removeEventListener('click', this.clickHandler);
        }
        
        // Создаем новый обработчик
        this.clickHandler = (e) => {
            // Игнорируем клики на input элементы (включая календарь)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
            
            // Игнорируем клики внутри модальных окон
            if (e.target.closest('.edit-modal') || e.target.closest('.focus-input-modal') || e.target.closest('.confirm-modal')) {
                return;
            }
            
            // Находим элемент с data-action, начиная с целевого элемента и поднимаясь вверх
            let actionElement = null;
            let current = e.target;
            
            // Поднимаемся по DOM дереву, ища элемент с data-action
            while (current && current !== document.body) {
                // Проверяем, есть ли data-action атрибут
                if (current.hasAttribute && current.hasAttribute('data-action')) {
                    actionElement = current;
                    break;
                }
                // Также проверяем через dataset
                if (current.dataset && current.dataset.action) {
                    actionElement = current;
                    break;
                }
                current = current.parentElement;
            }
            
            if (!actionElement) {
                return;
            }
            
            // Получаем action из атрибута или dataset
            const action = actionElement.getAttribute('data-action') || actionElement.dataset.action;
            if (!action) {
                return;
            }

            // Отладка
            console.log('Action clicked:', action, 'element:', actionElement, 'target:', e.target, 'has data-view:', actionElement.hasAttribute('data-view'), 'dataset.view:', actionElement.dataset.view);

            // Останавливаем bubbling сразу после нахождения action (чтобы избежать повторных обработок)
            e.stopPropagation();

            // Предотвращаем стандартное поведение только для кнопок
            if (actionElement.tagName === 'BUTTON' || actionElement.closest('button')) {
                e.preventDefault();
            }

            // Обработка действий
            if (action === 'navigate') {
                const view = actionElement.getAttribute('data-view') || actionElement.dataset.view;
                console.log('navigate clicked:', view, 'element:', actionElement);
                if (view) {
                    console.log('Navigating to:', view);
                    this.navigateTo(view);
                } else {
                    console.error('navigate: view is missing', {
                        actionElement,
                        allAttributes: Array.from(actionElement.attributes).map(attr => ({ name: attr.name, value: attr.value }))
                    });
                }
            } else if (action === 'setDailyHours') {
                const value = actionElement.getAttribute('data-value') || actionElement.dataset.value;
                this.settings.dailyHours = parseInt(value);
                this.saveSettings(this.settings); // Сохраняем сразу для надёжности
                this.renderApp(); // Обновляем интерфейс, чтобы показать выбранную опцию
            } else if (action === 'setProductiveTime') {
                const value = actionElement.getAttribute('data-value') || actionElement.dataset.value;
                this.settings.productiveTime = value;
                this.saveSettings(this.settings); // Сохраняем сразу
                this.renderApp(); // Обновляем интерфейс, чтобы показать выбранную опцию
            } else if (action === 'setPomodoro') {
                const value = actionElement.getAttribute('data-value') || actionElement.dataset.value;
                this.settings.pomodoroLength = parseInt(value);
                this.settings.breakLength = parseInt(value) / 5;
                this.saveSettings(this.settings); // Сохраняем сразу
                this.renderApp(); // Обновляем интерфейс, чтобы показать выбранную опцию
            } else if (action === 'saveSettings') {
                // Сохраняем настройки из формы
                const pomodoroLength = parseInt(document.getElementById('pomodoroLength')?.value) || this.settings.pomodoroLength;
                const dailyHours = parseInt(document.getElementById('dailyHours')?.value) || this.settings.dailyHours;
                const breakLength = parseInt(document.getElementById('breakLength')?.value) || this.settings.breakLength;
                
                this.settings.pomodoroLength = pomodoroLength;
                this.settings.dailyHours = dailyHours;
                this.settings.breakLength = breakLength;
                
                this.saveSettings(this.settings);
                
                // Показываем уведомление об успешном сохранении
                alert('✅ Настройки сохранены!');
                
                // Возвращаемся на главный экран
                this.navigateTo('home');
            } else if (action === 'completeOnboarding') {
                this.completeOnboarding(this.settings);
            } else if (action === 'createTask') {
                this.navigateTo('createTask');
            } else if (action === 'analyzeTask') {
                const desc = document.getElementById('taskDescription')?.value;
                const deadlineInput = document.getElementById('deadline');
                const dl = deadlineInput?.value || null;
                if (desc) {
                    this.createTask(desc, dl); // Заглушка создаст план
                    alert('AI-анализ (заглушка): План создан с базовыми шагами!');
                }
            } else if (action === 'saveTask') {
                // Уже сохранено в createTask
                this.navigateTo('home');
            } else if (action === 'viewTask') {
                const taskId = actionElement.getAttribute('data-id') || actionElement.dataset.id;
                if (taskId) {
                    this.selectedTaskId = taskId;
                    this.navigateTo('taskDetails');
                }
            } else if (action === 'deleteTask') {
                // Получаем ID из атрибута или dataset
                let taskId = actionElement.getAttribute('data-id') || actionElement.dataset.id;
                
                // Если не нашли, ищем в родительских элементах
                if (!taskId) {
                    let current = actionElement;
                    for (let i = 0; i < 5 && current; i++) {
                        if (current.hasAttribute && current.hasAttribute('data-id')) {
                            taskId = current.getAttribute('data-id');
                            break;
                        }
                        if (current.dataset && current.dataset.id) {
                            taskId = current.dataset.id;
                            break;
                        }
                        current = current.parentElement;
                    }
                }
                
                console.log('deleteTask clicked:', {
                    taskId,
                    actionElement,
                    target: e.target
                });
                
                if (taskId) {
                    this.showDeleteTaskConfirm(taskId);
                } else {
                    console.error('deleteTask: taskId not found', {
                        actionElement,
                        allAttributes: Array.from(actionElement.attributes).map(attr => ({ name: attr.name, value: attr.value }))
                    });
                    alert('Ошибка: не удалось найти ID задачи для удаления. Проверьте консоль.');
                }
            } else if (action === 'startPomodoro') {
                const taskId = actionElement.getAttribute('data-task') || actionElement.dataset.task;
                const subTaskId = parseInt(actionElement.getAttribute('data-subtask') || actionElement.dataset.subtask);
                if (taskId && subTaskId && !isNaN(subTaskId)) {
                    this.startPomodoro(taskId, subTaskId);
                }
            } else if (action === 'pausePomodoro') {
                this.pausePomodoro();
                this.renderApp();
            } else if (action === 'cancelPomodoro') {
                this.cancelPomodoro();
                // cancelPomodoro уже вызывает navigateTo, который вызывает renderApp
            } else if (action === 'startQuickPomodoro') {
                this.startQuickPomodoro();
            } else if (action === 'startTimer') {
                this.startTimer();
            } else if (action === 'editSubTask') {
                const taskId = actionElement.getAttribute('data-task-id') || actionElement.dataset.taskId;
                const subTaskId = parseInt(actionElement.getAttribute('data-subtask-id') || actionElement.dataset.subtaskId);
                if (taskId && subTaskId) {
                    this.editSubTask(taskId, subTaskId);
                }
            } else if (action === 'deleteSubTask') {
                const taskId = actionElement.getAttribute('data-task-id') || actionElement.dataset.taskId;
                const subTaskId = parseInt(actionElement.getAttribute('data-subtask-id') || actionElement.dataset.subtaskId);
                if (taskId && subTaskId) {
                    this.showDeleteSubTaskConfirm(taskId, subTaskId);
                }
            }
            
            // Обработка клика на редактируемое название подзадачи
            if (e.target.classList.contains('editable-title') && e.target.dataset.subtaskId) {
                const taskItem = e.target.closest('.task-item');
                if (taskItem) {
                    const taskId = this.selectedTaskId;
                    const subTaskId = parseInt(e.target.dataset.subtaskId);
                    if (taskId && subTaskId) {
                        this.editSubTask(taskId, subTaskId);
                    }
                }
            }
        };
        
        // Привязываем обработчик
        document.addEventListener('click', this.clickHandler);
    }

    attachDynamicEventListeners() {
        // Для динамических элементов, если нужно
    }
}

// Инициализация
const app = new FocusHelperApp();
window.app = app;