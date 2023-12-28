import express from 'express';
import {
  getProxies,
  getProxyByProxyString,
  getProxyById,
  getRandomProxy,
  updateProxy,
  addProxy,
  endProxyWorkingCycle,
  deleteProxy,
  freeProxy
} from '../controllers/proxyController.js';

const router = express.Router();

// Маршруты для работы с прокси
router.get('/proxies', getProxies); // GET запрос для получения всех прокси
router.get('/proxies/string/', getProxyByProxyString) // GET запрос для получения прокси по строке
router.get('/random-proxy', getRandomProxy); // GET запрос для получения случайного прокси
router.post('/free-proxy', freeProxy); // POST запрос для освобождения прокси
router.post('/proxies', addProxy); // POST запрос для добавления прокси
router.put('/proxies/end-cycle/', endProxyWorkingCycle); // PUT запрос завершения цикла работы прокси
router.get('/proxies/:id', getProxyById); // GET запрос для получения прокси по ID
router.put('/proxies/:id', updateProxy); // PUT запрос для обновления прокси
router.delete('/proxies/:id', deleteProxy); // DELETE запрос для удаления прокси

export default router;