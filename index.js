const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
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

  const responseMsg = `<xml>
                          <ToUserName><![CDATA[${req.body.FromUserName}]]></ToUserName>
                          <FromUserName><![CDATA[${req.body.ToUserName}]]></FromUserName>
                          <CreateTime>${new Date().getTime()}</CreateTime>
                          <MsgType><![CDATA[text]]></MsgType>
                          <Content><![CDATA[这是后台回复的内容]]></Content>
                      </xml>`
  console.log('responseMsg',responseMsg)
  res.send (responseMsg)

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
