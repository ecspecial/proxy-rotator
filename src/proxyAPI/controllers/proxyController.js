import { ObjectId } from "mongodb";
import { getDb, getDb2, getDb3 } from "../../config/database.js";
import getCurrentIP from "./ipController.js";
import { sendErrorToTelegram } from "../../telegram/telegramErrorNotifier.js";

// Получение всех прокси
const getProxies = async (req, res) => {
  try {
    const db = getDb();
    const proxies = await db.collection('proxies').find().toArray();
    res.json(proxies);
  } catch (error) {
    console.error('Ошибка при получении прокси:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};


// Получение прокси по строке
const getProxyByProxyString = async (req, res) => {
  const { proxyString } = req.body;

  try {
    // Получаем доступ к базе данных
    const db = getDb();

    // Ищем прокси по переданной строке прокси
    const proxy = await db.collection('proxies').findOne({ proxy: proxyString });

    // Если прокси не найдено, возвращаем ошибку 404
    if (!proxy) {
      return res.status(404).json({ error: 'Прокси не найдено' });
    }

    // Возвращаем прокси в формате JSON
    res.json(proxy);
  } catch (error) {
    // В случае ошибки выводим сообщение об ошибке
    console.error('Ошибка при получении прокси по строке прокси:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Получение прокси по ID
const getProxyById = async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const proxy = await db.collection('proxies').findOne({ _id: new ObjectId(id) }); // Используйте new ObjectID для создания экземпляра ObjectID

    if (!proxy) {
      return res.status(404).json({ error: 'Прокси не найден' });
    }

    res.json(proxy);
  } catch (error) {
    console.error('Ошибка при получении прокси по ID:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Получение случайного прокси
const getRandomProxy = async (req, res) => {
  try {
      const db = getDb();

      const proxies = await db.collection('proxies').find({ status: 'free' }).toArray();

      if (proxies.length === 0) {
          return res.status(404).json({ error: 'Нет свободных прокси' });
      }

      for (const randomProxy of proxies) {
          const lastUsedIP = randomProxy.lastUsedIP;
          const currentIP = await getCurrentIP(randomProxy.proxy);

          if (!currentIP) {
              await sendErrorToTelegram('Не удалось соединиться с прокси', 'getRandomProxy');
              
              await db.collection('proxies').updateOne({ _id: randomProxy._id }, { $set: { status: 'free' } });
              
              continue;
          }

          if (currentIP !== lastUsedIP) {
              const updateResult = await db.collection('proxies').updateOne(
                  { _id: randomProxy._id },
                  { $set: { lastUsedIP: currentIP, status: 'busy' } }
              );

              if (updateResult.modifiedCount == 1) {
                  console.log(`Обновили статус прокси ${randomProxy.proxy} на busy`)
                  return res.status(200).json({ proxy: randomProxy.proxy, currentIP });
              } 
              // else {
              //     await sendErrorToTelegram('Не удалось обновить текущий IP прокси перед выдачей для использования', 'getRandomProxy');
              // }
          }
      }

      await sendErrorToTelegram('Не удалось получить подходящий прокси. Прокси не работает или IP не изменился', 'getRandomProxy');
      res.status(503).json({ error: 'Не удалось получить подходящий прокси. Прокси не работает или IP не изменился' });
  } catch (error) {
      console.error('Ошибка получения свободного прокси:', error);
      await sendErrorToTelegram(`Ошибка получения свободного прокси: ${error.message}`, 'getRandomProxy');
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Метод освобождения прокси
const freeProxy = async (req, res) => {
  const db = getDb();
  const { proxy } = req.body;

  if (!proxy) {
      return res.status(400).json({ error: 'Необходимо указать прокси в формате "108.143.169.27:30646:iparchitect_629_18_08_23:DiaYyDDDD2GGNGA7N4"' });
  }

  try {
      // Get the current IP of the proxy
      const currentIP = await getCurrentIP(proxy);
      let updateFields = { status: 'free' };

      if (currentIP) {
          // Update lastUsedIP if proxy is working
          updateFields.lastUsedIP = currentIP;
      }

      const updateResult = await db.collection('proxies').updateOne(
          { proxy: proxy },
          { $set: updateFields }
      );

      if (updateResult.modifiedCount === 1) {
          console.log(`Прокси ${proxy} освобожден`);
          res.status(200).json({ message: `Прокси ${proxy} освобожден` });
      } else {
          console.log(`Прокси ${proxy} не найден или уже свободен`);
          res.status(404).json({ error: `Прокси ${proxy} не найден или уже свободен` });
      }
  } catch (error) {
      console.error(`Ошибка при освобождении прокси ${proxy}:`, error);
      await sendErrorToTelegram(`Ошибка при освобождении прокси ${proxy}: ${error.message}`, 'freeProxy');
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Обновление прокси
const updateProxy = async (req, res) => {
  const { id } = req.params;
  const updatedProxyData = req.body;

  // Проверка свойств
  if (updatedProxyData.proxy && typeof updatedProxyData.proxy !== 'string') {
    return res.status(400).json({ error: 'Неверный формат для proxy' });
  }

  if (updatedProxyData.status && typeof updatedProxyData.status !== 'string') {
    return res.status(400).json({ error: 'Неверный формат для status' });
  }

  try {
    const db = getDb();
    const proxy = await db.collection('proxies').findOne({ _id: new ObjectId(id) });

    if (!proxy) {
      return res.status(404).json({ error: 'Прокси не найден' });
    }

    // Проверка, какие свойства обновить на основе тела запроса
    const updatedProperties = {};
    if (updatedProxyData.proxy) {
      updatedProperties.proxy = updatedProxyData.proxy;
    }
    if (updatedProxyData.status) {
      updatedProperties.status = updatedProxyData.status;
    }

    const result = await db.collection('proxies').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedProperties }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Прокси не найден' });
    }

    res.json({ message: 'Прокси успешно обновлен' });
  } catch (error) {
    console.error('Ошибка при обновлении прокси:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Добавление прокси
const addProxy = async (req, res) => {
  // Валидация полей
  if (!req.body.proxy || typeof req.body.proxy !== 'string') {
    return res.status(400).json({ error: 'Неправильный формат данных для proxy' });
  }

  if (req.body.status && typeof req.body.status !== 'string') {
    return res.status(400).json({ error: 'Неправильный формат данных для status' });
  }

  // Добавление поля lastUsedIP со значением 'N/A'
  const newProxy = {
    proxy: req.body.proxy,
    status: req.body.status || 'free',
    lastUsedIP: 'N/A'
  };

  try {
    const db = getDb();
    const result = await db.collection('proxies').insertOne(newProxy);

    if (result.insertedId) {
      res.status(201).json({ message: 'Прокси успешно добавлен', proxy: newProxy });
    } else {
      res.status(500).json({ error: 'Не удалось добавить прокси' });
    }
  } catch (error) {
    console.error('Ошибка при добавлении прокси:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Завершение цикла работы прокси
const endProxyWorkingCycle = async (req, res) => {
  const { proxyString } = req.body;

  try {
    // Получаем доступ к базе данных
    const db = getDb();
    
    // Получаем текущий IP-адрес через переданную строку прокси
    const currentIP = await getCurrentIP(proxyString);

    if (currentIP) {
      // Обновляем поле lastUsedIP в базе данных и устанавливаем статус "свободен"
      await db.collection('proxies').updateOne(
        { proxy: proxyString },
        { $set: { lastUsedIP: currentIP, status: 'free' } }
      );

      // Возвращаем сообщение о завершении цикла прокси и последний использованный IP
      res.json({ message: 'Цикл прокси завершен', lastUsedIP: currentIP });
    } else {
      // Если прокси не работает, оставляем предыдущий использованный Ip
      await db.collection('proxies').updateOne(
        { proxy: proxyString },
        { $set: { status: 'free' } }
      );
      // Если прокси не работает, возвращаем ошибку 500
      res.status(500).json({ error: 'Прокси не работает, закончили работу' });
    }
  } catch (error) {
    // В случае ошибки выводим сообщение об ошибке
    console.error('Ошибка при завершении цикла работы прокси:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Удаление прокси
const deleteProxy = async (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();
    const result = await db.collection('proxies').deleteOne({ _id: new ObjectId(id) }); // Используйте new ObjectID для создания экземпляра ObjectID

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Прокси не найден' });
    }

    res.json({ message: 'Прокси успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении прокси:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

export { getProxies, getProxyByProxyString, getProxyById, getRandomProxy, updateProxy, addProxy, endProxyWorkingCycle, deleteProxy, freeProxy };