import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { 
    databaseConnectRequest,
    getDb,
    database2ConnectRequest,
    getDb2,
    database3ConnectRequest,
    getDb3, 
} from './src/config/database.js';
import proxyRoutes from './src/proxyAPI/routes/proxy.routes.js'; // Импорт маршрутов для прокси
import accountRoutes from './src/accountAPI/routes/account.routes.js'; // Импорт маршрутов для аккаунтов
import { sendErrorToTelegram } from './src/telegram/telegramErrorNotifier.js';

import os from 'os';
import { error } from 'console';

// Функция для получения IP-адреса сервера
const getIPAddress = () => {
    const interfaces = os.networkInterfaces();
    for (const dev in interfaces) {
        const iface = interfaces[dev];
        for (let i = 0; i < iface.length; i++) {
            const { address, family, internal } = iface[i];
                if (family === 'IPv4' && !internal) {
                    return address;
                }
        }
    }
    return '127.0.0.1';  // По умолчанию используется localhost, если IP-адрес не найден
};

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Пример данных для конечной точки
const sampleData = {
    message: 'Привет от API!'
};

// Простая GET-конечная точка
app.get('/api/', (req, res) => {
    res.status(200).json(sampleData);
});

// Post запрос для запуска повторного подключения к базе данных при ошибке подключения
app.get('/api/restartDatabase', async (req, res) => {
    try {
        // Запускаем метод подключения к базе данных и возвращаем boolean результата
        const isConnected = await databaseConnectRequest();
  
        if (isConnected) {
            res.status(200).json({ success: true, message: 'Успешно подключились к базе данных' });
        } else {
            res.status(503).json({ success: false, message: 'Подключение к базе данных не может быть установлено' });
        }
        } catch (error) {
        res.status(500).json({ success: false, message: 'Произошла ошибка при подключении к базе данных' });
        }
    });

// Используем маршруты для прокси
app.use('/api/proxy', proxyRoutes);
app.use('/api/account', accountRoutes);

// Очередь лайков на отправку
const likeQueue = [];

// POST запрос для добавления нового лайка
app.post('/api/like', async (req, res) => {
    const { likeId } = req.body;

    if (likeId) {
        try {
            // Обновить статус на 'work' в базе данных через liker API
            // await db.collection('likes').updateOne({ _id: likeId }, { $set: { status: 'work' } });

            likeQueue.push(likeId);

            // Если статус изменился, отправляем положительный ответ
            res.status(200).json({ success: true, message: 'Лайк добавлен в очередь на обработку.' });
            console.log(chalk.gray('Получен новый запрос на обработку лайка'));
            console.log(likeQueue);
        } catch (error) {
            console.error('Ошибка при обновлении статуса лайка:', error);
            res.status(500).json({ success: false, message: 'Произошла ошибка при обновлении статуса лайка.' });
        }
    } else {
        // Если идентификатор лайка отсутствует, возвращаем отрицательный ответ
        res.status(400).json({ success: false, message: 'Идентификатор лайка не предоставлен.' });
    }
});

// POST запрос для добавления новой записи в базу данных
app.post('/api/addLike', async (req, res) => {
    const likeData = req.body;

    try {
        const db = getDb();
        if (likeData.user) {
            likeData.user = new ObjectId(likeData.user);
        }

        let collectionName;
        switch (likeData.type) {
            case 'product':
                collectionName = 'productlikes';
                break;
            case 'brand':
                collectionName = 'productlikes';
                break;
            case 'likes':
                collectionName = 'likes';
                break;
            case 'carts':
                collectionName = 'carts';
                break;
            default:
                throw new Error('Неверный тип лайка.');
        }

        const result = await db.collection(collectionName).insertOne(likeData);

        if (result.acknowledged) {
            res.status(200).json({ success: true, message: `Лайк успешно добавлен в базу данных ${collectionName}.` });
            console.log(`Добавлена новая запись в таблицу ${collectionName}.`)
        } else {
            throw new Error('Не удалось добавить лайк в базу данных.');
        }
    } catch (error) {
        console.error(`Ошибка при добавлении лайка в базу данных:`, error);
        res.status(500).json({ success: false, message: 'Ошибка при добавлении лайка в базу данных.' });
        await sendErrorToTelegram(`Ошибка при добавлении лайка в базу данных.`, '/api/addLike');
    }
});

// Эта функция будет отправлять лайки из очереди в Liker API
async function processLikeQueue() {
    if (likeQueue.length > 0) {
        const likeId = likeQueue.shift(); 
        try {
            console.log(likeId)
            const response = await axios.post('http://localhost:4001/api/addToLikeQueue', { likeId: likeId });
            
            if(response.status >= 200 && response.status < 300) {
                console.log('Отправили лайк на обработку:', response.data);
            } else if(response.status >= 400 && response.status < 500) {
                console.error('Ошибка при отправке лайка на обработку:', response.data.error);
            } else {
                likeQueue.unshift(likeId);
            }

        } catch (error) {
            console.error('Ошибка при отправке лайка на обработку:', error.message);
            likeQueue.unshift(likeId);
            await sendErrorToTelegram(`Ошибка при отправке лайка на обработку.`, 'processLikeQueue');
        }
    }
}


const startServer = async () => {
    try {
        console.log('Попытка подключения к базе данных...');
        const isConnected = await databaseConnectRequest();
        if (!isConnected) {
            throw new Error('Подключение к базе данных topvtop_backend не может быть установлено');
        }

        // const isConnected2 = await database2ConnectRequest();
        // if (!isConnected2) {
        //     throw new Error('Подключение к базе данных payments не может быть установлено');
        // }

        const isConnected3 = await database3ConnectRequest();
        if (!isConnected3) {
            throw new Error('Подключение к базе данных topvtop_bd не может быть установлено');
        }

        console.log(chalk.grey('Запускаем сервер...'));
        // Запуск сервера
        const server = app.listen(PORT, () => {
            console.log(chalk.green(`Сервер запущен на порту ${PORT}`));
            console.log('IP-адрес сервера:', getIPAddress());
        });
    } catch (error) {
        console.error(chalk.red('Ошибка при запуске сервера:', error));
        await sendErrorToTelegram(`Ошибка при запуске сервера: ${error.message}`, 'startServer');
    }
};

startServer().then(server => {
    if (server) {
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                console.error(chalk.red(`Порт ${PORT} занят!`));
            } else {
                console.error(chalk.red('Произошла ошибка при запуске сервера:'), error);
            }
        });
    }
});