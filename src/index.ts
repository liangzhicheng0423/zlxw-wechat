import { exec } from 'child_process';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import cron from 'node-cron';
import path from 'path';
import { drawSuccess } from './AI/MJ/drawSuccess';
import { sequelize } from './db';
import { syncClearanceCode } from './mysqlModal/clearanceCode';
import { syncUser } from './mysqlModal/user';
import { initRedis } from './redis';
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
app.post('/payRes', async (req, res) => {
  await unifiedorderCb(req, res);
  res.send({ errcode: 0, errmsg: '' });
});

/** 接受绘制完成的回调 */
app.post('/drawSuccess', async (req, res) => {
  await drawSuccess(req, res);
  res.send('ok');
});

/** 自定义菜单 */
app.post('/create', create);

const port = process.env.PORT || 80;

async function bootstrap() {
  cron.schedule('0 4 * * *', () => {
    exec(`rm -rf ./tmp/voice/*`);
    exec(`rm -rf ./tmp/image/*`);
  });

  app.listen(port, async () => {
    console.log('启动成功', port);

    // 同步数据库
    try {
      // 创建菜单
      console.log('创建菜单');
      create();
      // await sequelize.authenticate();
      // await syncUser();
      // await syncOrder();

      await initRedis();
      // await syncClearanceCode();

      // await uploadPermanentImageMedia('./src/public/images/business_cooperation.jpeg');
      // await uploadPermanentImageMedia('./src/public/images/contact_customer_service.png');

      console.log('Connection has been established successfully.');
    } catch (error) {
      console.error('Error synchronizing database:', error);
    }
  });
}

bootstrap();
