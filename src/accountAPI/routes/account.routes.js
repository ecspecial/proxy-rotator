import express from 'express';
import {
  getAccountByPhone,
  getAccountById,
  addAccount,
  updateAccountStatus,
  getAllAccounts,
  deleteAccountById,
  getRandomFreeAccount,
  getRandomFreeMobileAccount
} from '../controllers/accountController.js';

const router = express.Router();

router.get('/accounts/phone', getAccountByPhone); // GET запрос для получения аккаунта по номеру телефона
router.get('/accounts', getAllAccounts); // GET запрос для получения всех аккаунтов
router.post('/accounts', addAccount); // POST запрос для добавления нового аккаунта
router.get('/accounts/random-free', getRandomFreeAccount); // GET запрос для получения случайного аккаунта со статусом "free"
router.get('/accounts/random-mobile-free', getRandomFreeMobileAccount); // GET запрос для получения случайного мобильного аккаунта со статусом "free"
router.get('/accounts/:id', getAccountById); // GET запрос для получения аккаунта по ID
router.put('/accounts/:id', updateAccountStatus); // PUT запрос для обновления статуса аккаунта
router.delete('/accounts/:id', deleteAccountById); // DELETE запрос для удаления аккаунта по ID

export default router;