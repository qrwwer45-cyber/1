const TelegramBot = require('node-telegram-bot-api');

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

// Установка webhook
const webhookUrl = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}/api/bot`
  : 'https://your-vercel-app.vercel.app/api/bot';

bot.setWebHook(webhookUrl)
  .then(() => {
    console.log('Webhook установлен:', webhookUrl);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка установки webhook:', error);
    process.exit(1);
  });

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await bot.setWebHook(webhookUrl);
      res.status(200).json({ success: true, webhookUrl });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).send('Method not allowed');
  }
}
