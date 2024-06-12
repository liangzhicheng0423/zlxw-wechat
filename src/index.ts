import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import path from 'path';
import { sequelize } from './db';
import { syncOrder } from './mysqlModal/order';
import { syncUser } from './mysqlModal/user';
import { create } from './service/create';
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

app.get('/MP_verify_EvBmWC5rklVARznL.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'MP_verify_EvBmWC5rklVARznL.txt'));
});

/** 统一下单 */
app.post('/unifiedorder', unifiedorder);

/** 支付成回调 */
app.post('/payRes', unifiedorderCb);

/** 自定义菜单 */
app.post('create', create);

const port = process.env.PORT || 80;

async function bootstrap() {
  app.listen(port, async () => {
    console.log('启动成功', port);
    // 创建菜单
    create();

    // 同步数据库
    try {
      await sequelize.authenticate();
      await syncUser();
      await syncOrder();

      console.log('Connection has been established successfully.');
    } catch (error) {
      console.error('Error synchronizing database:', error);
    }
  });
}

bootstrap();
