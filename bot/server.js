const express = require('express');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
app.use(express.json());

const MAX_API_URL = 'https://api.max.ru/v1';
const BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://enionis.github.io/focus-assistant/webapp';

const usersData = new Map();

app.post('/webhook', async (req, res) => {
    try {
        const update = req.body;
        
        if (update.type === 'bot_started') {
            await handleBotStarted(update.user_id, update.chat_id);
        } else if (update.type === 'message') {
            await handleMessage(update);
        } else if (update.type === 'webapp_data') {
            await handleWebAppData(update);
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling webhook:', error);
        res.status(500).send('Error');
    }
});

async function handleBotStarted(userId, chatId) {
    try {
        await sendMessage(chatId, {
            text: '🎯 Добро пожаловать в Фокус Помощник!\n\nЯ помогу вам организовать задачи и повысить продуктивность с помощью техники Pomodoro.\n\nОткройте мини-приложение, чтобы начать работу:',
            attachments: [
                {
                    type: 'inline_keyboard',
                    payload: {
                        buttons: [
                            {
                                text: '📱 Открыть мини-приложение',
                                action: {
                                    type: 'open_app',
                                    url: `${WEBAPP_URL}?user_id=${userId}&chat_id=${chatId}`
                                }
                            }
                        ]
                    }
                }
            ]
        });
    } catch (error) {
        console.error('Error handling bot started:', error);
    }
}

async function handleMessage(update) {
    const { chat_id, text, user_id } = update;
    
    if (text === '/start' || text === '/старт') {
        await handleBotStarted(user_id, chat_id);
    } else if (text === '/app' || text === '/приложение') {
        await sendMessage(chat_id, {
            text: 'Открыть мини-приложение:',
            attachments: [
                {
                    type: 'inline_keyboard',
                    payload: {
                        buttons: [
                            {
                                text: '📱 Открыть',
                                action: {
                                    type: 'open_app',
                                    url: `${WEBAPP_URL}?user_id=${user_id}&chat_id=${chat_id}`
                                }
                            }
                        ]
                    }
                }
            ]
        });
    } else if (text === '/help' || text === '/помощь') {
        await sendMessage(chat_id, {
            text: '🤖 Команды бота:\n\n/start - Начать работу\n/app - Открыть мини-приложение\n/help - Показать помощь\n\nБот будет напоминать вам о незавершенных задачах в активные часы.'
        });
    }
}

async function handleWebAppData(update) {
    try {
        const { user_id, chat_id, data } = update;
        
        if (data.type === 'tasks_update') {
            if (!usersData.has(user_id)) {
                usersData.set(user_id, {
                    chatId: chat_id,
                    tasks: [],
                    settings: null,
                });
            }
            
            const userData = usersData.get(user_id);
            userData.tasks = data.tasks || [];
            userData.settings = data.activeHours || { start: 9, end: 22 };
            userData.incompleteTasks = data.incompleteTasks || 0;
            
            usersData.set(user_id, userData);
            
            console.log(`Updated tasks for user ${user_id}: ${userData.incompleteTasks} incomplete tasks`);
        }
    } catch (error) {
        console.error('Error handling webapp data:', error);
    }
}

async function sendMessage(chatId, message) {
    try {
        const response = await axios.post(
            `${MAX_API_URL}/messages/send`,
            {
                chat_id: chatId,
                ...message
            },
            {
                headers: {
                    'Authorization': `Bearer ${BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error sending message:', error.response?.data || error.message);
        throw error;
    }
}

async function checkAndSendReminders() {
    const now = new Date();
    const currentHour = now.getHours();
    
    for (const [userId, userData] of usersData.entries()) {
        try {
            const { chatId, settings, incompleteTasks, tasks } = userData;
            
            if (!settings || incompleteTasks === 0) {
                continue;
            }
            
            const { start, end } = settings;
            
            if (currentHour >= start && currentHour < end) {
                const lastReminder = userData.lastReminder || 0;
                const hoursSinceLastReminder = (now.getTime() - lastReminder) / (1000 * 60 * 60);
                
                if (hoursSinceLastReminder >= 2) {
                    await sendReminder(chatId, incompleteTasks, tasks);
                    userData.lastReminder = now.getTime();
                    usersData.set(userId, userData);
                }
            }
        } catch (error) {
            console.error(`Error sending reminder to user ${userId}:`, error);
        }
    }
}

async function sendReminder(chatId, incompleteTasksCount, tasks) {
    try {
        const tasksList = tasks.slice(0, 3).map((task, index) => 
            `${index + 1}. ${task.title} (${task.progress}% завершено)`
        ).join('\n');
        
        const message = {
            text: `⏰ Напоминание о незавершенных задачах\n\nУ вас ${incompleteTasksCount} незавершенных ${incompleteTasksCount === 1 ? 'задача' : 'задач'}:\n\n${tasksList}${tasks.length > 3 ? `\n\n...и еще ${tasks.length - 3} задач` : ''}\n\nПродолжите работу над задачами! 💪`,
            attachments: [
                {
                    type: 'inline_keyboard',
                    payload: {
                        buttons: [
                            {
                                text: '📱 Открыть мини-приложение',
                                action: {
                                    type: 'open_app',
                                    url: WEBAPP_URL
                                }
                            }
                        ]
                    }
                }
            ]
        };
        
        await sendMessage(chatId, message);
        console.log(`Reminder sent to chat ${chatId}`);
    } catch (error) {
        console.error('Error sending reminder:', error);
    }
}

cron.schedule('0 * * * *', () => {
    checkAndSendReminders();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Bot server running on port ${PORT}`);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});

