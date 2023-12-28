import getCurrentIP from "./src/proxyAPI/controllers/ipController.js";
import axios from "axios";

const proxys = [];


// Функция для проверки тестовых прокси
(async () => {
    for (let i = 0; i < proxys.length; i++) {
        const ip = await getCurrentIP(proxys[i]);
        console.log(ip);
    }
})();

// // Функция для получения текущего IP адреса
// const getCurrentIP = async () => {
//     const methods = [
//         'https://ipv4.icanhazip.com/',
//         'https://ipinfo.io/ip',
//         'https://api.myip.com',
//         'https://api.ipify.org/?format=json'
//     ];

//     for (let url of methods) {
//         try {
//             const response = await axios.get(url);
//             const ip = response.data.ip || response.data.trim();
//             if (ip) return ip;
//         } catch (error) {
//             console.warn('Не удалось получить текущий IP с помощью сайта', url);
//         }
//     }

//     console.error('Не удалось получить текущий IP.');
//     return null;
// }

// await getCurrentIP()