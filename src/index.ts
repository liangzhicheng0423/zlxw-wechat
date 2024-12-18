import { exec } from 'child_process';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import cron from 'node-cron';
import path from 'path';
import { drawSuccess } from './AI/MJ/drawSuccess';
import { sequelize } from './db';
import { asyncHandler } from './middleware/asyncHandler';
import { errorHandler } from './middleware/errorHandler';
import { initRedis } from './redis';
import { create, deleteMenu } from './service/create';
import { getUserInfo } from './service/getUserInfo';
import { onMessage } from './service/message';
import { unifiedorder, unifiedorderCb } from './service/order';
import { refund, refundRes } from './service/refund';
import { uploadPermanentImageMedia } from './util';

const logger = morgan('tiny');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

/** 服务号接收消息 */
app.post('/message', asyncHandler(onMessage));

// 首页
app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/authorize', async (req, res) => {
  res.sendFile(path.join(__dirname, '../authorize.html'));
});

app.get('/cancel', async (req, res) => {
  console.log('【cancel】', req.query);
  res.sendFile(path.join(__dirname, '../cancel.html'));
});

app.get('/success', async (req, res) => {
  console.log('【成功页面】');
  res.sendFile(path.join(__dirname, '../success.html'));
});

app.get('/MP_verify_EvBmWC5rklVARznL.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'MP_verify_EvBmWC5rklVARznL.txt'));
});

app.get('/getUserInfo', asyncHandler(getUserInfo));

/** 统一下单 */
app.post('/unifiedorder', asyncHandler(unifiedorder));

/** 支付成回调 */
app.post('/payRes', unifiedorderCb);

/** 接受绘制完成的回调 */
app.post('/drawSuccess', async (req, res) => {
  try {
    await drawSuccess(req, res);
  } catch (error) {
    console.error(error);
  } finally {
    res.send('ok');
  }
});

/** 自定义菜单 */
app.post('/create', create);

/** 发起退款申请 */
app.post('/refund', refund);

/** 退款申请状态 */
app.post('/refundRes', refundRes);

const port = process.env.PORT || 80;

// 错误处理中间件
app.use(errorHandler);

async function bootstrap() {
  cron.schedule('0 4 * * *', () => {
    exec(`rm -rf ./tmp/voice/*`);
    exec(`rm -rf ./tmp/image/*`);
    exec(`rm -rf ./tmp/music/*`);
    exec(`rm -rf ./tmp/audio/*`);
  });

  app.listen(port, async () => {
    console.log('启动成功', port);

    // 同步数据库
    try {
      // 创建菜单
      // console.log('创建菜单');
      create();
      await sequelize.authenticate();
      // await syncUser();
      // await syncOrder();

      await initRedis();
      // await syncClearanceCode();

      // console.log('上传客服二维码');
      // await uploadPermanentImageMedia('./src/public/images/contact_customer_service_03.png');
      // await uploadPermanentImageMedia('./src/public/images/contact_customer_service.jpg');

      console.log('Connection has been established successfully.');
    } catch (error) {
      console.error('Error synchronizing database:', error);
    }
  });
}

bootstrap();
