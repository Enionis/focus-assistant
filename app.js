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
        this.lastPomodoroFocus = null; // Последняя тема pomodoro
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
        // Загружаем последнюю тему pomodoro
        this.lastPomodoroFocus = localStorage.getItem('lastPomodoroFocus') || null;
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
    startPomodoro(taskId, subTaskId, focusText = null) {
        if (!taskId || !subTaskId) {
            console.error('startPomodoro: missing taskId or subTaskId', { taskId, subTaskId });
            return;
        }
        this.activeTask = { taskId: String(taskId), subTaskId: Number(subTaskId), focusText: focusText || '' };
        this.timeLeft = (this.settings.pomodoroLength || 25) * 60;
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
        this.timerInterval = setInterval(() => {
            if (this.isRunning && !this.isPaused) {
                this.timeLeft--;
                if (this.timeLeft <= 0) {
                    this.completePomodoro();
                }
            }
            this.renderApp();
        }, 1000);
        this.renderApp();
    }

    pausePomodoro() {
        this.isPaused = !this.isPaused;
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
        const task = this.tasks.find(t => String(t.id) === String(this.activeTask?.taskId));
        if (task) {
            const subTask = task.subTasks.find(st => Number(st.id) === Number(this.activeTask?.subTaskId));
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

    // Быстрый старт Pomodoro (из навигации)
    startQuickPomodoro() {
        console.log('startQuickPomodoro called, activeTask exists:', !!this.activeTask);
        if (this.activeTask) {
            // Если таймер активен (пауза или готов к старту), просто переходим к экрану без модалки
            this.navigateTo('pomodoro');
        } else {
            // Иначе показываем модалку для новой темы
            this.showFocusInputModal();
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

    // Показать модальное окно для ввода фокуса перед pomodoro
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
                            <button class="btn secondary ${this.settings.dailyHours === 2 ? 'selected' : ''}" data-action="setDailyHours" data-value="2">2 часа</button>
                            <button class="btn secondary ${this.settings.dailyHours === 4 ? 'selected' : ''}" data-action="setDailyHours" data-value="4">4 часа</button>
                            <button class="btn secondary ${this.settings.dailyHours === 6 ? 'selected' : ''}" data-action="setDailyHours" data-value="6">6+ часов</button>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="label">В какое время ты наиболее продуктивен?</div>
                        <div class="grid cols-2 gap-12">
                            <button class="btn secondary ${this.settings.productiveTime === 'morning' ? 'selected' : ''}" data-action="setProductiveTime" data-value="morning">🌅 Утро</button>
                            <button class="btn secondary ${this.settings.productiveTime === 'afternoon' ? 'selected' : ''}" data-action="setProductiveTime" data-value="afternoon">☀️ День</button>
                            <button class="btn secondary ${this.settings.productiveTime === 'evening' ? 'selected' : ''}" data-action="setProductiveTime" data-value="evening">🌆 Вечер</button>
                            <button class="btn secondary ${this.settings.productiveTime === 'night' ? 'selected' : ''}" data-action="setProductiveTime" data-value="night">🌙 Ночь</button>
                        </div>
                    </div>

                    <div class="panel">
                        <div class="label">Длина сессии Pomodoro</div>
                        <div class="grid cols-3 gap-12">
                            <button class="btn secondary ${this.settings.pomodoroLength === 25 ? 'selected' : ''}" data-action="setPomodoro" data-value="25">25 мин</button>
                            <button class="btn secondary ${this.settings.pomodoroLength === 50 ? 'selected' : ''}" data-action="setPomodoro" data-value="50">50 мин</button>
                            <button class="btn secondary ${this.settings.pomodoroLength === 90 ? 'selected' : ''}" data-action="setPomodoro" data-value="90">90 мин</button>
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
                        <button class="icon-btn" data-action="deleteSubTask" data-task-id="${task.id}" data-subtask-id="${st.id}" title="Удалить">🗑️</button>
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
        const focusText = this.activeTask.focusText || (subTask ? subTask.title : 'Фокус');
        
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
        
        console.log('Using stats for render:', this.stats);
        
        const hours = Math.floor(this.stats.totalFocusTime / 60);
        const minutes = this.stats.totalFocusTime % 60;
        const levelProgress = this.stats.xp % 100;

        const achievements = [
            { 
                id: 'first_steps', 
                title: 'Первые шаги', 
                icon: '🎯', 
                unlocked: (this.stats && this.stats.achievements && Array.isArray(this.stats.achievements)) ? 
                    this.stats.achievements.some(a => a.id === 'first_steps') : false 
            }
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
                    <div style="text-align: center; margin-bottom: 24px;">
                        <button class="btn tertiary" data-action="navigate" data-view="home" style="padding: 8px 16px; font-size: 14px; width: auto; margin-top: 8px;">Назад</button>
                        <h1 class="title">Статистика</h1>                        
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