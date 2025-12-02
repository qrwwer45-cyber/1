const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

// Устанавливаем команды с подсказками
bot.setMyCommands([
    { command: '/start', description: 'Главное меню' },
    { command: '/generate', description: 'Генератор ключей (админ)' }
]);

// Хранилище ключей (в реальном проекте лучше использовать базу данных)
const keys = new Map(); // ключ -> { duration, created, used }
const userKeys = new Map(); // userId -> keyData
const waitingForKey = new Map(); // userId -> { stage: 'buy' | 'input', messageId: number }

// Генератор ключей
function generateKey(duration) {
    const key = 'PRO-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    keys.set(key, {
        duration: duration, // в днях
        created: new Date(),
        used: false
    });
    return key;
}

// Проверка ключа
function validateKey(key) {
    const keyData = keys.get(key);
    if (!keyData) return false;
    
    if (keyData.used) return false;
    
    // Помечаем ключ как использованный
    keyData.used = true;
    return true;
}

// Проверка, активен ли ключ у пользователя
function hasActiveKey(chatId) {
    const userData = userKeys.get(chatId);
    if (!userData) return false;
    
    // Если ключ навсегда
    if (!userData.expiry) return true;
    
    // Проверяем, не истек ли срок действия
    return new Date() < userData.expiry;
}

function getExpiryDate(duration) {
    if (duration === 999999) return null; // навсегда
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + duration);
    return expiry;
}

// Команда для генерации ключей (только для админа)
bot.onText(/\/generate/, (msg) => {
    const chatId = msg.chat.id;
    
    // Проверка на админа (список админов)
    const adminIds = [6307424386, 6456614255];
    if (!adminIds.includes(chatId)) {
        bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
        return;
    }
    
    const durationButtons = [
        [
            { text: '1 день', callback_data: 'gen_1' },
            { text: '3 дня', callback_data: 'gen_3' }
        ],
        [
            { text: '7 дней', callback_data: 'gen_7' },
            { text: '30 дней', callback_data: 'gen_30' }
        ],
        [
            { text: 'Навсегда', callback_data: 'gen_999999' }
        ]
    ];
    
    bot.sendMessage(chatId, 'Выберите период доступа:', {
        reply_markup: {
            inline_keyboard: durationButtons
        }
    });
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    
    // Если пользователь ждет ввод ключа
    const waitingData = waitingForKey.get(chatId);
    console.log('Получено сообщение:', msg.text);
    console.log('WaitingData:', waitingData);
    console.log('ChatId:', chatId);
    
    if (waitingData && waitingData.stage === 'input' && waitingData.messageId && msg.text && msg.text.length > 5) {
        // Удаляем сообщение с запросом ключа
        bot.deleteMessage(chatId, waitingData.messageId);
        
        // Проверяем ключ через новую систему
        console.log('Проверяем ключ:', msg.text);
        console.log('Ожидающие пользователи:', Array.from(waitingForKey.keys()));
        
        if (validateKey(msg.text)) {
            // Удаляем сообщение с ключом
            bot.deleteMessage(chatId, msg.message_id);
            
            const keyData = keys.get(msg.text);
            const expiryDate = getExpiryDate(keyData.duration);
            
            let durationText = '';
            if (keyData.duration === 999999) {
                durationText = 'навсегда';
            } else {
                durationText = `${keyData.duration} дней`;
            }
            
            bot.sendMessage(chatId, `✅ Ключ принят! Доступ: ${durationText}`);
            
            // Сохраняем информацию о пользователе
            userKeys.set(chatId, {
                key: msg.text,
                duration: keyData.duration,
                activated: new Date(),
                expiry: expiryDate
            });
            
            // Удаляем из списка ожидающих
            waitingForKey.delete(chatId);
            
            // Показываем игры
            const gameButtons = [
                [
                    {
                        text: '✅получить сигнал✅',
                        web_app: { url: 'https://luxhack.vercel.app/' }
                    }
                ],
                [
                    {
                        text: '← Назад',
                        callback_data: 'back_to_main'
                    }
                ]
            ];
            
            bot.sendPhoto(chatId, './photo_2025-12-02_04-04-03.jpg', {
                caption: 'Я готов выдать тебе сигнал.\n\nВыбери игру:',
                reply_markup: {
                    inline_keyboard: gameButtons
                }
            });
        } else {
            bot.sendMessage(chatId, '❌ Неверный ключ. Попробуйте еще раз.');
        }
    } else if (msg.text && msg.text !== '/start') {
        // Если это не команда и не ожидается ключ
        bot.sendMessage(chatId, 'я не знаю такой команды!');
    }
});

// Команда /start - сразу показываем главное меню
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const signalButton = [
            [
                {
                    text: '🆘Поддержка',
                    url: 'https://t.me/tatarseget'
                }
            ],
            [
                {
                    text: '🌐Регистрация',
                    url: 'https://1wiwaw.com/'
                },
                {
                    text: '🎁Промокод',
                    callback_data: 'get_promo'
                }
            ],
            [
                {
                    text: '✅Получить сигнал✅',
                    callback_data: 'get_signal'
                }
            ]
        ];
        
        bot.sendPhoto(chatId, './photo_2025-12-02_11-23-44.jpg', {
            caption: 'главное меню:',
            reply_markup: {
                inline_keyboard: signalButton
            }
        });
        
    } catch (error) {
        console.error('Ошибка:', error);
        bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
    }
});

// Обработка кнопок
bot.on('callback_query', (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    
    // Обработка генерации ключей
    if (data.startsWith('gen_')) {
        const duration = parseInt(data.split('_')[1]);
        const key = generateKey(duration);
        
        let durationText = '';
        if (duration === 999999) {
            durationText = 'навсегда';
        } else {
            durationText = `${duration} дней`;
        }
        
        bot.sendMessage(chatId, `🔑 Сгенерирован ключ:\n\n\`${key}\`\n\nПериод доступа: ${durationText}\n\nНажмите на ключ для копирования.`, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(callbackQuery.id);
    }
    
    if (data === 'get_promo') {
        bot.sendMessage(chatId, `🎁 Ваш промокод:\n\n\`YOUHACK\`\n\nНажмите для копирования.`, { parse_mode: 'Markdown' });
        bot.answerCallbackQuery(callbackQuery.id);
    }
    
    if (data === 'back_to_main') {
        // Удаляем текущее сообщение
        const waitingData = waitingForKey.get(chatId);
        if (waitingData && waitingData.messageId) {
            bot.deleteMessage(chatId, waitingData.messageId);
        }
        waitingForKey.delete(chatId);
        
        // Показываем главное меню
        const signalButton = [
            [
                {
                    text: '🆘Поддержка',
                    url: 'https://t.me/tatarseget'
                }
            ],
            [
                {
                    text: '🌐Регистрация',
                    url: 'https://1wiwaw.com/'
                },
                {
                    text: '🎁Промокод',
                    callback_data: 'get_promo'
                }
            ],
            [
                {
                    text: '✅Получить сигнал✅',
                    callback_data: 'get_signal'
                }
            ]
        ];
        
        bot.sendPhoto(chatId, './photo_2025-12-02_11-23-44.jpg', {
            caption: 'главное меню:',
            reply_markup: {
                inline_keyboard: signalButton
            }
        });
        
        bot.answerCallbackQuery(callbackQuery.id);
    }
    
    if (data === 'have_key') {
        // Удаляем сообщение с выбором покупки
        const waitingData = waitingForKey.get(chatId);
        if (waitingData && waitingData.messageId) {
            bot.deleteMessage(chatId, waitingData.messageId);
        }
        
        // Удаляем предыдущее сообщение (главное меню)
        bot.deleteMessage(chatId, callbackQuery.message.message_id);
        
        // Просим ввести ключ
        bot.sendMessage(chatId, 'Введите ваш ключ доступа:', {
            reply_markup: {
                inline_keyboard: [[{ text: '← Назад', callback_data: 'back_to_main' }]]
            }
        }).then(message => {
            waitingForKey.set(chatId, { stage: 'input', messageId: message.message_id });
        });
        bot.answerCallbackQuery(callbackQuery.id);
    }
    
    if (data.startsWith('buy_')) {
        const duration = parseInt(data.split('_')[1]);
        let durationText = '';
        if (duration === 999999) {
            durationText = 'навсегда';
        } else {
            durationText = `${duration} дней`;
        }
        
        // Удаляем сообщение с выбором покупки
        const waitingData = waitingForKey.get(chatId);
        if (waitingData && waitingData.messageId) {
            bot.deleteMessage(chatId, waitingData.messageId);
        }
        waitingForKey.delete(chatId);
        
        // Отправляем сообщение о покупке и открываем поддержку
        bot.sendMessage(chatId, `Пользователь выбрал: ${durationText}\n\nДля покупки ключа свяжитесь с поддержкой: @tatarseget`);
        
        bot.answerCallbackQuery(callbackQuery.id);
    }
    
    if (data === 'get_signal') {
        // Проверяем, есть ли активный ключ
        if (hasActiveKey(chatId)) {
            // Удаляем предыдущее сообщение (главное меню)
            bot.deleteMessage(chatId, callbackQuery.message.message_id);
            
            // Если ключ активен - сразу показываем игры
            const gameButtons = [
                [
                    {
                        text: '✅получить сигнал✅',
                        web_app: { url: 'https://luxhack.vercel.app/' }
                    }
                ],
                [
                    {
                        text: '← Назад',
                        callback_data: 'back_to_main'
                    }
                ]
            ];
            
            bot.sendPhoto(chatId, './photo_2025-12-02_04-04-03.jpg', {
                caption: 'Я готов выдать тебе сигнал.\n\nВыбери игру:',
                reply_markup: {
                    inline_keyboard: gameButtons
                }
            });
        } else {
            // Если нет активного ключа - показываем варианты покупки
            // Удаляем предыдущее сообщение (главное меню)
            bot.deleteMessage(chatId, callbackQuery.message.message_id);
            
            const buyButtons = [
                [
                    { text: '1 день', callback_data: 'buy_1' },
                    { text: '3 дня', callback_data: 'buy_3' }
                ],
                [
                    { text: '7 дней', callback_data: 'buy_7' },
                    { text: '30 дней', callback_data: 'buy_30' }
                ],
                [
                    { text: 'Навсегда', callback_data: 'buy_999999' }
                ],
                [
                    { text: 'У меня уже есть ключ', callback_data: 'have_key' }
                ],
                [
                    { text: '← Назад', callback_data: 'back_to_main' }
                ]
            ];
            
            const message = bot.sendMessage(chatId, 'Выберите период доступа:', {
                reply_markup: {
                    inline_keyboard: buyButtons
                }
            });
            
            waitingForKey.set(chatId, { stage: 'buy', messageId: message.message_id });
        }
        bot.answerCallbackQuery(callbackQuery.id);
    }
});

// Экспорт для Vercel
export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            await bot.processUpdate(req.body);
            res.status(200).send('OK');
        } catch (error) {
            console.error('Error processing update:', error);
            res.status(500).send('Error');
        }
    } else {
        res.status(405).send('Method not allowed');
    }
}