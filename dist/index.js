"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const util_1 = require("./util");
// const { init: initDB, Counter } = require("./db");
const logger = (0, morgan_1.default)("tiny");
const app = (0, express_1.default)();
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use(logger);
// 首页
app.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.sendFile(path_1.default.join(__dirname, "index.html"));
}));
// 首页
app.post("/message", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('post req --- body', req.body);
    if (req.body.Content === '生成个人邀请码') {
        // 请求永久二维码
        yield (0, util_1.getShareQRcode)();
    }
    const content = '敬请期待';
    res.send({
        "ToUserName": req.body.FromUserName,
        "FromUserName": req.body.ToUserName,
        "CreateTime": Date.now(), // 整型，例如：1648014186
        "MsgType": "text",
        "Content": content
    });
    // res.send({
    //   code: 0,
    //   data: 'success',
    // });
}));
app.get("/message", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('get req');
}));
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
app.get("/api/wx_openid", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.headers["x-wx-source"]) {
        res.send(req.headers["x-wx-openid"]);
    }
}));
const port = process.env.PORT || 80;
function bootstrap() {
    return __awaiter(this, void 0, void 0, function* () {
        // await initDB();
        app.listen(port, () => {
            console.log("启动成功", port);
        });
    });
}
bootstrap();
