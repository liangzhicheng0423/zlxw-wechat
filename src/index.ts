
import path  from 'path';
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { createQRCode, getShareQRcode } from './util';

// const { init: initDB, Counter } = require("./db");

const logger = morgan("tiny");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(logger);

// 首页
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});


// 首页
app.post("/message", async (req, res) => {
  console.log('post req --- body', req.body);

  if(req.body.Content === '生成个人邀请码'){
    // 请求永久二维码

   const url = await createQRCode(req.body.FromUserName);

   console.log('========= url: ', url)
  }

  const content = '敬请期待';

  res.send ({
    "ToUserName": req.body.FromUserName,
    "FromUserName": req.body.ToUserName,
    "CreateTime": Date.now(), // 整型，例如：1648014186
    "MsgType": "text",
    "Content": content
  }
  )

  // res.send({
  //   code: 0,
  //   data: 'success',
  // });
});

app.get("/message", async (req, res) => {
  console.log('get req');
});

// 更新计数
// app.post("/api/count", async (req, res) => {
//   const { action } = req.body;
//   if (action === "inc") {
//     await Counter.create();
//   } else if (action === "clear") {
//     await Counter.destroy({
//       truncate: true,
//     });
//   }
//   res.send({
//     code: 0,
//     data: await Counter.count(),
//   });
// });

// // 获取计数
// app.get("/api/count", async (req, res) => {
//   const result = await Counter.count();
//   res.send({
//     code: 0,
//     data: result,
//   });
// });

// 小程序调用，获取微信 Open ID
app.get("/api/wx_openid", async (req, res) => {
  if (req.headers["x-wx-source"]) {
    res.send(req.headers["x-wx-openid"]);
  }
});

const port = process.env.PORT || 80;

async function bootstrap() {
  // await initDB();
  app.listen(port, () => {
    console.log("启动成功", port);
  });
}

bootstrap();
