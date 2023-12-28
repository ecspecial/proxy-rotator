import mongoose from 'mongoose';

// Определение схемы для коллекции "proxies"
const proxySchema = new mongoose.Schema({
  proxy: { type: String, required: true }, // Поле "proxy" является обязательной строкой
  status: { type: String, required: true }, // Поле "status" является обязательной строкой
  lastUsedIP: { type: String, default: 'N/A' }, // Поле "lastUsedIP" является строкой со значением по умолчанию 'N/A'
});

// Создание модели Mongoose на основе схемы
const ProxyModel = mongoose.model('Proxy', proxySchema);

// Использование модели для взаимодействия с коллекцией
export default ProxyModel;