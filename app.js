class FocusHelperApp {
    constructor() {
        this.currentView = 'onboarding'; // Начать с онбординга
        this.userData = null;
        this.eventListenersAttached = false;
        this.apiBaseUrl = 'https://max.ru/t122_hakaton_bot'; 
        this.timerInterval = null;
        this.timeLeft = 25 * 60;
        this.isRunning = false;
        this.isPaused = false;
        this.activeTask = null;
        this.selectedTaskId = null; // Для просмотра задачи
        this.settings = {
            dailyHours: 4,
            productiveTime: 'morning',
            pomodoroLength: 25,
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

    // Инициализация
    init() {
        this.loadData();
        this.attachEventListeners();
        this.renderApp();
    }

    // Методы работы с данными (локальное хранение + синхронизация)
    async loadData() {
        try {
            // Локальное хранение
            this.settings = JSON.parse(localStorage.getItem('focus_settings') || '{}');
            this.tasks = JSON.parse(localStorage.getItem('focus_tasks') || '[]');
            this.stats = JSON.parse(localStorage.getItem('focus_stats') || '{}');

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
        localStorage.setItem('focus_stats', JSON.stringify(newStats));
    }

    async syncWithBot() {
        if (!this.userData?.userId) return;

        try {
            const response = await fetch(`${this.apiBaseUrl}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.userData.userId,
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
            }
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
        }
    }

    // Навигация
    navigateTo(view) {
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
    async createTask(taskDescription, deadline = '') {
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

        const task = {
            id: Date.now().toString(),
            title: taskDescription,
            deadline: deadline || undefined,
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
    startPomodoro(taskId, subTaskId) {
        if (!taskId || !subTaskId) {
            console.error('startPomodoro: missing taskId or subTaskId', { taskId, subTaskId });
            return;
        }
        this.activeTask = { taskId: String(taskId), subTaskId: Number(subTaskId) };
        this.timeLeft = (this.settings.pomodoroLength || 25) * 60;
        this.isRunning = true;
        this.isPaused = false;
        this.navigateTo('pomodoro');
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        this.timerInterval = setInterval(() => {
            if (this.isRunning && !this.isPaused) {
                this.timeLeft--;
                if (this.timeLeft <= 0) {
                    this.completePomodoro();
                }
            }
            this.renderApp();
        }, 1000);
    }

    pausePomodoro() {
        this.isPaused = !this.isPaused;
    }

    cancelPomodoro() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.isRunning = false;
        this.isPaused = false;
        this.activeTask = null;
        this.navigateTo('home');
    }

    completePomodoro() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.isRunning = false;

        // Обновление статистики (упрощенная геймификация)
        this.stats.totalSessions++;
        this.stats.totalFocusTime += this.settings.pomodoroLength;
        this.stats.xp += 10;
        this.stats.level = Math.floor(this.stats.xp / 100) + 1;

        // Проверка ачивок (заглушка)
        if (this.stats.totalSessions === 1) {
            this.stats.achievements.push({ id: 'first_steps', title: 'Первые шаги', icon: '🎯' });
        }

        this.saveStats(this.stats);

        // Обновление задачи
        const task = this.tasks.find(t => String(t.id) === String(this.activeTask.taskId));
        if (task) {
            const subTask = task.subTasks.find(st => Number(st.id) === Number(this.activeTask.subTaskId));
            if (subTask) {
                subTask.completedPomodoros++;
                task.completedPomodoros++;
                if (subTask.completedPomodoros >= subTask.estimatedPomodoros) {
                    subTask.completed = true;
                }
            }
            this.saveTasks(this.tasks);
        }

        this.activeTask = null;
        alert('Сессия завершена! Отдохни 5 минут.');
        this.syncWithBot();
        this.navigateTo('home');
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
        this.tasks = this.tasks.filter(t => String(t.id) !== idStr);
        const afterCount = this.tasks.length;
        console.log('deleteTask:', { taskId: idStr, beforeCount, afterCount, deleted: beforeCount > afterCount });
        this.saveTasks(this.tasks);
        this.syncWithBot();
        this.renderApp();
    }

    // Редактирование подзадачи
    editSubTask(taskId, subTaskId) {
        const task = this.tasks.find(t => String(t.id) === String(taskId));
        if (!task) return;
        
        const subTask = task.subTasks.find(st => Number(st.id) === Number(subTaskId));
        if (!subTask) return;

        const newTitle = prompt('Новое название подзадачи:', subTask.title);
        if (newTitle && newTitle.trim()) {
            subTask.title = newTitle.trim();
            this.saveTasks(this.tasks);
            this.syncWithBot();
            this.renderApp();
        }

        const newPomodoros = prompt('Количество pomodoro сессий:', subTask.estimatedPomodoros);
        if (newPomodoros && !isNaN(newPomodoros) && parseInt(newPomodoros) > 0) {
            const oldPomodoros = subTask.estimatedPomodoros;
            subTask.estimatedPomodoros = parseInt(newPomodoros);
            // Пересчитываем общее количество pomodoros для задачи
            task.totalPomodoros = task.totalPomodoros - oldPomodoros + subTask.estimatedPomodoros;
            this.saveTasks(this.tasks);
            this.syncWithBot();
            this.renderApp();
        }
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
                            <button class="btn secondary" data-action="setDailyHours" data-value="2">2 часа</button>
                            <button class="btn secondary" data-action="setDailyHours" data-value="4">4 часа</button>
                            <button class="btn secondary" data-action="setDailyHours" data-value="6">6+ часов</button>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="label">В какое время ты наиболее продуктивен?</div>
                        <div class="grid cols-2 gap-12">
                            <button class="btn secondary" data-action="setProductiveTime" data-value="morning">🌅 Утро</button>
                            <button class="btn secondary" data-action="setProductiveTime" data-value="afternoon">☀️ День</button>
                            <button class="btn secondary" data-action="setProductiveTime" data-value="evening">🌆 Вечер</button>
                            <button class="btn secondary" data-action="setProductiveTime" data-value="night">🌙 Ночь</button>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="label">Длина сессии Pomodoro</div>
                        <div class="grid cols-3 gap-12">
                            <button class="btn secondary" data-action="setPomodoro" data-value="25">25 мин</button>
                            <button class="btn secondary" data-action="setPomodoro" data-value="50">50 мин</button>
                            <button class="btn secondary" data-action="setPomodoro" data-value="90">90 мин</button>
                        </div>
                    </div>

                    <button class="btn primary" data-action="completeOnboarding">Начать!</button>
                </div>
                ${this.renderNavigation()}
            </div>
        `;
    }

    renderHome() {
        const taskList = this.tasks.map(task => `
            <div class="task-item">
                <div class="task-item-header">
                    <div class="flex center">
                        <div class="emoji-icon">📝</div>
                        <div class="task-item-content">
                            <div class="task-item-title">${task.title}</div>
                            <div class="task-item-meta">${task.subTasks.length} шагов • ${task.completedPomodoros}/${task.totalPomodoros} сессий</div>
                        </div>
                    </div>
                    <div class="flex gap-8">
                        <button class="icon-btn" data-action="viewTask" data-id="${task.id}" title="Просмотр">👁️</button>
                        <button class="icon-btn" data-action="deleteTask" data-id="${task.id}" title="Удалить">🗑️</button>
                    </div>
                </div>
                <div class="progress-bar" style="margin-top: 12px;">
                    <div class="progress-fill" style="width: ${ (task.completedPomodoros / task.totalPomodoros) * 100 }%;"></div>
                </div>
            </div>
        `).join('');

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
        return `
            <div class="app-container">
                <div class="container">
                    <h1 class="title">Создать задачу</h1>
                    <div class="panel">
                        <label class="label">Опиши задачу</label>
                        <textarea class="input text-area" id="taskDescription" placeholder="Например: Подготовиться к экзамену"></textarea>
                        <label class="label">Дедлайн (опционально)</label>
                        <input class="input" id="deadline" placeholder="Через неделю">
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

        const subTasksList = task.subTasks.map((st, index) => `
            <div class="task-item" data-subtask-id="${st.id}">
                <div class="task-item-header">
                    <div class="flex center" style="flex: 1;">
                        <div class="task-item-number">${index + 1}</div>
                        <div class="task-item-content" style="flex: 1;">
                            <div class="task-item-title editable-title" data-editable="true" data-subtask-id="${st.id}">${st.title}</div>
                            <div class="task-item-meta">🍅 ${st.completedPomodoros}/${st.estimatedPomodoros} сессий</div>
                        </div>
                    </div>
                    <div class="flex gap-8">
                        <button class="icon-btn" data-action="editSubTask" data-task-id="${task.id}" data-subtask-id="${st.id}" title="Редактировать">✏️</button>
                        <button class="btn primary" style="padding: 8px 12px; font-size: 14px;" data-action="startPomodoro" data-task="${task.id}" data-subtask="${st.id}">▶️ Начать</button>
                    </div>
                </div>
                ${st.completedPomodoros > 0 ? `
                    <div class="progress-bar" style="margin-top: 12px;">
                        <div class="progress-fill" style="width: ${ (st.completedPomodoros / st.estimatedPomodoros) * 100 }%;"></div>
                    </div>
                ` : ''}
            </div>
        `).join('');

        return `
            <div class="app-container">
                <div class="container">
                    <div class="flex between center" style="margin-bottom: 16px;">
                        <h1 class="title">${task.title}</h1>
                        <button class="btn tertiary" data-action="navigate" data-view="home">Назад</button>
                    </div>
                    ${task.deadline ? `<p class="subtitle">📅 Дедлайн: ${new Date(task.deadline).toLocaleDateString('ru-RU')}</p>` : ''}
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
                        <h2 class="subtitle" style="margin-bottom: 16px;">План действий</h2>
                        <div class="task-list">${subTasksList}</div>
                    </div>
                </div>
                ${this.renderNavigation()}
            </div>
        `;
    }

    renderPomodoro() {
        if (!this.activeTask) return this.renderHome();

        const task = this.tasks.find(t => String(t.id) === String(this.activeTask.taskId));
        const subTask = task?.subTasks.find(st => Number(st.id) === Number(this.activeTask.subTaskId));
        if (!task || !subTask) {
            console.error('renderPomodoro: task or subTask not found', { 
                taskId: this.activeTask.taskId, 
                subTaskId: this.activeTask.subTaskId,
                tasks: this.tasks.map(t => ({ id: t.id, title: t.title }))
            });
            return this.renderHome();
        }

        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const progress = ((this.settings.pomodoroLength * 60 - this.timeLeft) / (this.settings.pomodoroLength * 60)) * 100;

        return `
            <div class="app-container">
                <div class="container flex column center" style="text-align: center;">
                    <div class="flex center" style="margin-bottom: 16px;">
                        <div class="emoji-icon">🍅</div>
                        <div class="body">Фокус на: ${subTask.title}</div>
                    </div>
                    <div class="timer-container ${this.isRunning ? 'pulsing' : ''}">
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

    renderStatistics() {
        const hours = Math.floor(this.stats.totalFocusTime / 60);
        const minutes = this.stats.totalFocusTime % 60;
        const levelProgress = this.stats.xp % 100;

        const achievements = [
            { id: 'first_steps', title: 'Первые шаги', icon: '🎯', unlocked: this.stats.achievements.some(a => a.id === 'first_steps') }
        ].map(ach => `
            <div class="task-item">
                <div class="flex center">
                    <span class="emoji-icon">${ach.icon}</span>
                    <div class="task-item-content">
                        <div class="task-item-title">${ach.title}</div>
                    </div>
                    ${ach.unlocked ? '<span style="color: var(--success);">✓</span>' : ''}
                </div>
            </div>
        `).join('');

        return `
            <div class="app-container">
                <div class="container">
                    <div class="flex between center" style="margin-bottom: 24px;">
                        <h1 class="title">Статистика</h1>
                        <button class="btn tertiary" data-action="navigate" data-view="home">Назад</button>
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
            // Сначала проверяем, кликнули ли на элемент навигации или иконку
            let actionElement = null;
            
            // Проверяем навигационные кнопки
            const navItem = e.target.closest('.nav-item');
            if (navItem && navItem.dataset.action) {
                actionElement = navItem;
            }
            
            // Проверяем иконки кнопок
            const iconBtn = e.target.closest('.icon-btn');
            if (iconBtn && iconBtn.dataset.action) {
                actionElement = iconBtn;
            }
            
            // Если не нашли, ищем любой элемент с data-action
            if (!actionElement) {
                actionElement = e.target.closest('[data-action]');
            }
            
            if (!actionElement) return;
            
            const action = actionElement.dataset.action;
            if (!action) return;

            // Отладка (можно убрать позже)
            console.log('Action clicked:', action, actionElement.dataset, e.target);

            // Предотвращаем стандартное поведение для кнопок
            if (actionElement.tagName === 'BUTTON' || actionElement.tagName === 'A' || actionElement.closest('button')) {
                e.preventDefault();
                e.stopPropagation();
            }

            // Обработка действий
            if (action === 'navigate') {
                const view = actionElement.dataset.view;
                if (view) {
                    this.navigateTo(view);
                }
            } else if (action === 'setDailyHours') {
                this.settings.dailyHours = parseInt(actionElement.dataset.value);
            } else if (action === 'setProductiveTime') {
                this.settings.productiveTime = actionElement.dataset.value;
            } else if (action === 'setPomodoro') {
                const value = parseInt(actionElement.dataset.value);
                this.settings.pomodoroLength = value;
                this.settings.breakLength = value / 5;
            } else if (action === 'completeOnboarding') {
                this.completeOnboarding(this.settings);
            } else if (action === 'createTask') {
                this.navigateTo('createTask');
            } else if (action === 'analyzeTask') {
                const desc = document.getElementById('taskDescription')?.value;
                const dl = document.getElementById('deadline')?.value;
                if (desc) {
                    this.createTask(desc, dl); // Заглушка создаст план
                    alert('AI-анализ (заглушка): План создан с базовыми шагами!');
                }
            } else if (action === 'saveTask') {
                // Уже сохранено в createTask
                this.navigateTo('home');
            } else if (action === 'viewTask') {
                const taskId = actionElement.dataset.id;
                if (taskId) {
                    this.selectedTaskId = taskId;
                    this.navigateTo('taskDetails');
                }
            } else if (action === 'deleteTask') {
                const taskId = actionElement.dataset.id;
                if (taskId && confirm('Удалить задачу?')) {
                    this.deleteTask(taskId);
                }
            } else if (action === 'startPomodoro') {
                const taskId = actionElement.dataset.task;
                const subTaskId = parseInt(actionElement.dataset.subtask);
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
                e.preventDefault();
                e.stopPropagation();
                const quickTask = prompt('Быстрая сессия: опиши задачу');
                if (quickTask) {
                    this.createTask(quickTask).then(() => {
                        const lastTask = this.tasks[this.tasks.length - 1];
                        if (lastTask && lastTask.subTasks.length > 0) {
                            this.startPomodoro(lastTask.id, lastTask.subTasks[0].id);
                        }
                    });
                }
            } else if (action === 'editSubTask') {
                const taskId = actionElement.dataset.taskId;
                const subTaskId = parseInt(actionElement.dataset.subtaskId);
                if (taskId && subTaskId) {
                    this.editSubTask(taskId, subTaskId);
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