import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { onMessage } from './service/message';
import { unifiedorder, unifiedorderCb } from './service/order';

const logger = morgan('tiny');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

/** 服务号接收消息 */
app.post('/message', onMessage);

// 首页
app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

/** 统一下单 */
app.post('/unifiedorder', unifiedorder);

app.post('/payRes', unifiedorderCb);

// 小程序调用，获取微信 Open ID
http: app.get('/api/wx_openid', async (req, res) => {
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
