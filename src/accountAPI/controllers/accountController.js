import { ObjectId } from "mongodb";
import { getDb, getDb2, getDb3 } from "../../config/database.js";
import { sendErrorToTelegram } from "../../telegram/telegramErrorNotifier.js";

const validateAccountFields = (account) => {
  if (account.phone && typeof account.phone !== 'string') {
    throw new Error('Невалидный формат телефона');
  }
  if (account.name && typeof account.name !== 'string') {
    throw new Error('Невалидный формат имени');
  }
  if (account.gender && typeof account.gender !== 'string') {
    throw new Error('Невалидный формат пола');
  }
  if (account.status && typeof account.status !== 'string') {
    throw new Error('Невалидный формат статуса');
  }
};

// Получение аккаунта по номеру телефона
const getAccountByPhone = async (req, res) => {
    const { phone } = req.body;
  
    try {
      const db = getDb();
      const account = await db.collection('accounts').findOne({ phone: phone });
  
      if (!account) {
        return res.status(404).json({ error: 'Аккаунт не найден' });
      }
  
      res.json(account);
    } catch (error) {
      console.error('Ошибка при получении аккаунта по номеру телефона:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };

// Получение аккаунта по ID
const getAccountById = async (req, res) => {
    const { id } = req.params;
  
    try {
      const db = getDb();
      const account = await db.collection('accounts').findOne({ _id: new ObjectId(id) });
  
      if (!account) {
        return res.status(404).json({ error: 'Аккаунт не найден' });
      }
  
      res.json(account);
    } catch (error) {
      console.error('Ошибка при получении аккаунта по ID:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };
  

// Добавление аккаунта
const addAccount = async (req, res) => {
  const newAccount = req.body;

  try {
    validateAccountFields(newAccount);

    const db = getDb();
    const result = await db.collection('accounts').insertOne(newAccount);

    if (result.insertedId) {
      res.status(201).json({ message: 'Аккаунт успешно добавлен', account: newAccount });
    } else {
      res.status(500).json({ error: 'Не удалось добавить аккаунт' });
    }
  } catch (error) {
    console.error('Ошибка при добавлении аккаунта:', error);
    res.status(400).json({ error: error.message });
  }
};

// Обновление статуса аккаунта
const updateAccountStatus = async (req, res) => {
  const { id } = req.params;
  const updatedAccountData = req.body;

  try {
    const db = getDb();

    validateAccountFields(updatedAccountData);

    const result = await db.collection('accounts').updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedAccountData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Аккаунт не найден' });
    }

    res.json({ message: 'Статус аккаунта успешно обновлен' });
  } catch (error) {
    console.error('Ошибка при обновлении статуса аккаунта:', error);
    res.status(400).json({ error: error.message });
  }
};

// Получение всех аккаунтов
const getAllAccounts = async (req, res) => {
    try {
      const db = getDb();
      const accounts = await db.collection('accounts').find().toArray();
      res.json(accounts);
    } catch (error) {
      console.error('Ошибка при получении всех аккаунтов:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };

// Удаление аккаунта по ID
const deleteAccountById = async (req, res) => {
    const { id } = req.params;
  
    try {
      const db = getDb();
      const result = await db.collection('accounts').deleteOne({ _id: new ObjectId(id) });
  
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Аккаунт не найден' });
      }
  
      res.json({ message: 'Аккаунт успешно удален' });
    } catch (error) {
      console.error('Ошибка при удалении аккаунта:', error);
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  };

// Получение случайного аккаунта со статусом "free" и обновление его статуса на "busy"
const getRandomFreeAccount = async (req, res) => {
  const likeId = req.query.likeId;
  const type = req.query.type;
  const db = getDb();
  const db3 = getDb3();
  if (!likeId) {
      return res.status(400).json({ error: 'likeId обязателен в качестве вводного параметра' });
  }
  try {

      const like = await db3.collection(`${type}`).findOne({ _id: new ObjectId(likeId) });
      const usedAccounts = like.accountsUsed ? like.accountsUsed.map(id => new ObjectId(id)) : [];

      const accounts = await db.collection('accounts').find({ status: 'free', _id: { $nin: usedAccounts } }).toArray();

      if (accounts.length === 0) {
          return res.status(404).json({ error: 'Аккаунт со статусом "free" не найден' });
      }

      for (const randomAccount of accounts) {
          const updateResult = await db.collection('accounts').updateOne(
              { _id: randomAccount._id },
              { $set: { status: 'busy' } }
          );

          if (updateResult.modifiedCount == 1) {
            console.log(randomAccount)
              return res.status(200).json(randomAccount);
          } else {
              await db.collection('accounts').updateOne(
                  { _id: randomAccount._id },
                  { $set: { status: 'free' } }
              );
              await sendErrorToTelegram('Не удалось обновить статус аккаунта на "busy"', 'getRandomFreeAccount');
          }
      }

      await sendErrorToTelegram('Не удалось получить аккаунт со статусом "free".', 'getRandomFreeAccount');
      res.status(503).json({ error: 'Не удалось получить аккаунт со статусом "free".' });

  } catch (error) {
      console.error('Ошибка при получении и обновлении аккаунта со статусом "free":', error);
      await sendErrorToTelegram(`Ошибка при получении и обновлении аккаунта со статусом "free": ${error.message}`, 'getRandomFreeAccount');
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

// Получение случайного мобильного аккаунта со статусом "free" и обновление его статуса на "busy"
const getRandomFreeMobileAccount = async (req, res) => {
  const documentId = req.query.documentId;
  const reviewId = req.query.reviewId;
  const type = req.query.type;
  const db = getDb();
  const db3 = getDb3();

  if (!documentId || !reviewId) {
      return res.status(400).json({ error: 'Оба параметра, documentId и reviewId, обязательны для ввода' });
  }

  try {

      const document = await db3.collection('likes').findOne({ _id: new ObjectId(documentId) });

      if (!document) {
          return res.status(404).json({ error: 'Документ не найден' });
      }

      const usedMobileAccounts = document.accountsUsed
          .filter(account => account.reviewId === reviewId)
          .reduce((acc, current) => acc.concat(current.numbersUsed), []);

      // Получение всех свободных мобильных аккаунтов, которые не были использованы для этого конкретного обзора
      const mobileAccounts = await db.collection('mobileaccounts').find({
          status: 'free',
          number: { $nin: usedMobileAccounts }
      }).toArray();

      if (mobileAccounts.length === 0) {
          return res.status(404).json({ error: 'Мобильный аккаунт со статусом "free" не найден' });
      }

      for (const randomMobileAccount of mobileAccounts) {
          // Обновление статуса найденного мобильного аккаунта на 'busy'
          const updateResult = await db.collection('mobileaccounts').updateOne(
              { _id: randomMobileAccount._id },
              { $set: { status: 'busy' } }
          );

          if (updateResult.modifiedCount == 1) {
              return res.status(200).json({
                  number: randomMobileAccount.number,
                  account: randomMobileAccount.account
              });
          } else {
              // Если обновление статуса на 'busy' не удалось, вернуть статус мобильного аккаунта обратно на 'free'
              await db.collection('mobileaccounts').updateOne(
                  { _id: randomMobileAccount._id },
                  { $set: { status: 'free' } }
              );
              await sendErrorToTelegram('Не удалось обновить статус мобильного аккаунта на "busy"', 'getRandomFreeMobileAccount');
          }
      }

      await sendErrorToTelegram('Не удалось получить мобильный аккаунт со статусом "free".', 'getRandomFreeMobileAccount');
      res.status(503).json({ error: 'Не удалось получить мобильный аккаунт со статусом "free".' });

  } catch (error) {
      console.error('Ошибка при получении и обновлении мобильного аккаунта со статусом "free":', error);
      await sendErrorToTelegram(`Ошибка при получении и обновлении мобильного аккаунта со статусом "free": ${error.message}`, 'getRandomFreeMobileAccount');
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};

export {
  getAccountByPhone,
  getAccountById,
  addAccount,
  updateAccountStatus,
  getAllAccounts,
  deleteAccountById,
  getRandomFreeAccount,
  getRandomFreeMobileAccount,
};