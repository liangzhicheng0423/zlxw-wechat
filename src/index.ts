import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { onMessage } from './service/message';

const logger = morgan('tiny');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// 首页
app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/message', onMessage);

// 小程序调用，获取微信 Open ID
app.get('/api/wx_openid', async (req, res) => {
  if (req.headers['x-wx-source']) {
    res.send(req.headers['x-wx-openid']);
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  app.listen(port, () => {
    console.log('启动成功', port);
  });
}

bootstrap();
