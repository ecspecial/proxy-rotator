import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Заголовки запросов
const headers = {
    "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "sec-ch-ua": "\"Chromium\";v=\"109\", \"Not_A Brand\";v=\"99\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"macOS\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Safari/605.1.15"
}

const getCurrentIP = async (proxyString) => {
    // Разбиваем строку прокси на составляющие
    const proxy = proxyString.split(':');
    const formattedProxy = `${proxy[2]}:${proxy[3]}@${proxy[0]}:${proxy[1]}`;
    const httpsAgent = await new HttpsProxyAgent(`http://${formattedProxy}`);
    const url = 'https://api.ipify.org/?format=json';

    try {
        const response = await axios.get(url, {
            headers: headers,
            httpsAgent: httpsAgent,
        });

        return response.data.ip;
    } catch (error) {
        console.error('Error getting current IP using method 1:', error);

        try {
            const alternativeIP = await getCurrentIpSecondLayer(proxyString);
            if (alternativeIP) {
                return alternativeIP;
            }
        } catch (alternativeError) {
            console.error('Error getting current IP using method 2:', alternativeError);
        }

        try {
            const alternativeIP = await getCurrentIpThirdLayer(proxyString);
            if (alternativeIP) {
                return alternativeIP;
            }
        } catch (alternativeError) {
            console.error('Error getting current IP using method 3:', alternativeError);
        }

        try {
            const alternativeIP = await getCurrentIpFourthLayer(proxyString);
            if (alternativeIP) {
                return alternativeIP;
            }
        } catch (alternativeError) {
            console.error('Error getting current IP using method 4:', alternativeError);
        }

        return null;
    }
};

const getCurrentIpSecondLayer = async (proxyString) => {
    const proxy = proxyString.split(':');
    const formattedProxy = `${proxy[2]}:${proxy[3]}@${proxy[0]}:${proxy[1]}`;
    const httpsAgent = await new HttpsProxyAgent(`http://${formattedProxy}`);
    const url = 'https://ipv4.icanhazip.com/';

    try {
        // Отправляем запрос для получения текущего IP-адреса
        const response = await axios.get(url, {
            headers: headers,
            httpsAgent: httpsAgent,
        });

        return response.data.trim();
    } catch (error) {
        console.error('Ошибка при получении текущего IP:', error);
        return null;
    }
};

const getCurrentIpThirdLayer = async (proxyString) => {
    const proxy = proxyString.split(':');
    const formattedProxy = `${proxy[2]}:${proxy[3]}@${proxy[0]}:${proxy[1]}`;
    const httpsAgent = await new HttpsProxyAgent(`http://${formattedProxy}`);
    const url = 'https://ipinfo.io/ip';
  
    try {
        // Отправляем запрос для получения текущего IP-адреса
        const response = await axios.get(url, {
            headers: headers,
            httpsAgent: httpsAgent,
        });

        return response.data.trim();
    } catch (error) {
        console.error('Ошибка при получении текущего IP:', error);
        return null;
    }
  };

  const getCurrentIpFourthLayer = async (proxyString) => {
    const proxy = proxyString.split(':');
    const formattedProxy = `${proxy[2]}:${proxy[3]}@${proxy[0]}:${proxy[1]}`;
    const httpsAgent = await new HttpsProxyAgent(`http://${formattedProxy}`);
    const url = 'https://api.myip.com';
  
    try {
        // Отправляем запрос для получения текущего IP-адреса
        const response = await axios.get(url, {
            headers: headers,
            httpsAgent: httpsAgent,
        });

        return response.data.ip;
    } catch (error) {
        console.error('Ошибка при получении текущего IP:', error);
        return null;
    }
  };

export default getCurrentIP;