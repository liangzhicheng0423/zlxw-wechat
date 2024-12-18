import axios from 'axios';
import COS from 'cos-nodejs-sdk-v5';
import moment from 'moment';
import path from 'path';
import { chatWithTextAI } from '../AI/GPT4';
import { chatWithDrawAI } from '../AI/MJ';
import { doImageMode } from '../AI/MJ/doImageMode';
import { uploadFile } from '../AI/MJ/util';
import { decrypt } from '../crypto';
import { ClearanceCode } from '../mysqlModal/clearanceCode';
import { User } from '../mysqlModal/user';
import { getMode, getRedisClient, getRefundSecretKey, setMode, updateRedis } from '../redis';
import { EventMessage, Product, TextMessage, VipLevel, VoiceMessage, WeChatMessage } from '../types';
import {
  createQRCode,
  danUrl,
  downloadImage,
  downloadTempVoiceFile,
  extractBetween,
  generateRandomString,
  getAiGroupText,
  getBeforeQuestionMark,
  getDanText,
  getGptConfig,
  getMjConfig,
  getOrderUrl,
  getReplyBaseInfo,
  getTextReplyUrl,
  mergeImages,
  sendAIGroupIntroduce,
  sendImage,
  sendMessage,
  sendMusic,
  sendServiceQRcode,
  uploadTemporaryMedia,
  voice2Text
} from '../util';
import { create, menuEvent } from './create';
import { getUserList } from './getUserList';
import { sendCard } from './sendCard';
import { subscribe } from './subscribe';

const { COS_SECRET_ID, COS_SECRET_KEY } = process.env;

const { admins, welcome: gpt_welcome, welcome_enable: gpt_welcome_enable } = getGptConfig();

const { welcome: mj_welcome, welcome_enable: mj_welcome_enable, cdn_url } = getMjConfig();

const chatWithAI = async (message: TextMessage, res: any) => {
  const userId = message.FromUserName;

  let mode = await getMode(userId);

  if (!mode) {
    await setMode(message.FromUserName, Product.GPT4);
    mode = Product.GPT4;
  }

  if (mode === Product.GPT4) {
    await chatWithTextAI(message, res);
  }

  if (mode === Product.Midjourney) {
    await chatWithDrawAI(message, res);
  }
};

const handleText = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);
  const userId = message.FromUserName;

  const redis = getRedisClient();

  const isAdmin = admins.includes(userId);
  const isClearance = message.Content.startsWith('核销');
  const isConfirmClearance = message.Content.startsWith('确认核销');

  // 判断是否是管理员
  if (message.Content === '生成退款密钥' && isAdmin) {
    const secret = generateRandomString(8);
    await sendMessage(userId, ['密钥生成成功，三小时后失效', secret].join('\n\n'));
    const key = getRefundSecretKey();
    await redis?.set(key, secret, 'EX', 60 * 60 * 3);
    return;
  }

  if (isAdmin) {
    if (message.Content.startsWith('创作音乐')) {
      // https://cdn.ai-xiaowu.com/%E6%9F%AF%E5%9F%BA.mp3
      // await createMusic(message, res);
      const url = 'https://cdn.ai-xiaowu.com/%E6%9F%AF%E5%9F%BA.mp3';

      // // 输入图像的路径
      // const inputImagePath = path.join(__dirname, '../tmp/image/WechatIMG1115.jpg');

      // // 输出图像的路径
      // const outputImagePath = path.join(__dirname, '../tmp/image/WechatIMG1115-2.jpg');

      // await sharpImage(inputImagePath, outputImagePath);

      // const uploadRes = await uploadTemporaryMedia(outputImagePath, 'image');
      // const media_id = uploadRes.media_id;

      await sendMusic({
        userId,
        title: '柯基',
        musicurl: url,
        hqmusicurl: url,
        thumb_media_id: 'FLs_fBoOlhvVW6z2cE128nGA_-iBrJulgva63AHd5f05eaGQxhBmR2bLfIAqkYpD'
      });
      return;
    }

    const [cmd, code] = message.Content.split(' ');

    if (message.Content === '123321') {
      // 测试成功模板消息
      // http请求方式: POST https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=ACCESS_TOKEN

      console.log('测试成功模板消息');
      try {
        // 发送请求
        const response = await axios.post('http://api.weixin.qq.com/cgi-bin/message/template/send', {
          touser: userId,
          template_id: 'joT9zuZgb45DVdmy-_tK_6lsxPOG3vDIkK3k-g71AuU',
          data: {
            thing1: {
              value: 'AI群聊'
            },
            amount3: {
              value: '39.8元'
            },
            thing7: {
              value: '助理小吴'
            },
            character_string8: {
              value: '132132'
            }
          }
        });
        console.log(response.data);
      } catch (error) {
        console.log('error: ', error);
      }

      return;
    }

    if (message.Content === '更新用户表') {
      try {
        await getUserList(message);
      } catch (error) {
        console.log('更新用户表 失败');
      }
      return;
    }

    if (message.Content === '推送模板消息') {
      await sendCard(message, res);
      return;
    }

    if (isClearance) {
      // 二次确认核销码信息
      if (cmd !== '核销' || !code) {
        res.send({ ...baseReply, MsgType: 'text', Content: `命令格式错误` });
        return;
      }

      // 解密
      const decryptedText = decrypt(code);
      const [, product, level, fee] = decryptedText.split('-');
      const reply = [
        '请您确认以下订单信息',
        `订单产品：${product}`,
        `会员等级：${level}`,
        `订单金额：${Number(fee) / 100}`,
        `核对无误后请点击 ${getTextReplyUrl(`确认核销 ${code}`, '确认核对无误')}`
      ];
      res.send({ ...baseReply, MsgType: 'text', Content: reply.join('\n\n') });
      return;
    }

    if (isConfirmClearance) {
      if (cmd !== '确认核销' || !code) {
        res.send({ ...baseReply, MsgType: 'text', Content: '命令格式错误' });
        return;
      }
      // 解密
      const decryptedText = decrypt(code);
      const [customerId] = decryptedText.split('-');
      const clearance = await ClearanceCode.findOne({ where: { user_id: customerId, clearance_code: code } });
      if (!clearance) {
        res.send({ ...baseReply, MsgType: 'text', Content: '抱歉，核销码不存在～' });
        return;
      }

      const formatClearance = clearance.toJSON();
      console.log('formatClearance.status: ', formatClearance.status);
      if (formatClearance.status === true) {
        res.send({ ...baseReply, MsgType: 'text', Content: '抱歉，核销码已经被核销' });
        return;
      }

      await clearance.update({ status: true, check_date: moment() });
      res.send({ ...baseReply, MsgType: 'text', Content: '核销成功' });
      return;
    }
  }

  switch (message.Content) {
    case '更新菜单':
      create();
      break;
    case '获取我的专属分享海报':
      await sendMessage(userId, '专属海报加速生成中...');
      try {
        // 获取二维码
        const qrCodeUrl = await createQRCode(userId);

        // 下载二维码
        const qrCodePath = await downloadImage(qrCodeUrl, userId);

        console.log('下载二维码', qrCodePath);
        const outPath = path.join(__dirname, `../tmp/image/image_qrcode_${Date.now()}.jpeg`);
        console.log('组合图片:', outPath);

        // 合成背景图
        const bgPath = await mergeImages(qrCodePath, './src/public/images/qrcode_bg.png', outPath);

        console.log('合成背景图：', bgPath);

        // 上传至素材库
        const updateRes = await uploadTemporaryMedia(bgPath, 'image');

        console.log('上传至素材库: ', updateRes);
        // res.send({ ...baseReply, MsgType: 'image', Image: { MediaId: updateRes.media_id } });
        await sendImage(userId, updateRes.media_id);
      } catch (error) {
        await sendMessage(userId, '生成失败，请重新尝试');
      }

      break;

    case '查询':
      const [user, created] = await User.findOrCreate({
        where: { user_id: userId },
        defaults: { subscribe_status: true }
      });
      const formatUser = user.toJSON();
      if (created) res.send({ ...baseReply, MsgType: 'text', Content: '当前剩余N币：0' });
      else res.send({ ...baseReply, MsgType: 'text', Content: `🏆当前剩余N币：${formatUser.integral}` });
      break;

    case '兑换':
      await sendServiceQRcode(baseReply.ToUserName);
      res.send({
        ...baseReply,
        MsgType: 'text',
        Content: '每满500N币即可兑换现金50元，请扫码添加客服，并向客服发送"兑换"'
      });
      // await sendMessage(baseReply.ToUserName, '每满500N币即可兑换现金50元，请扫码添加客服，并向客服发送"兑换"');
      break;

    // case '马上接入':
    //   await sendMessage(baseReply.ToUserName, '请扫码添加客服，并向客服发送“AI接入”');
    //   await sendServiceQRcode(baseReply.ToUserName);
    //   break;

    case '获取助理小吴AI群':
      // await sendAiGroupText(baseReply.ToUserName);

      await sendAIGroupIntroduce(userId);
      res.send({
        ...baseReply,
        MsgType: 'text',
        Content: [`助理小吴AI群`, `${getTextReplyUrl('马上抢（助理小吴AI群）', '👉🏻 马上抢')}`].join('\n\n')
      });
      break;

    case '获取Dan':
      // await sendDanText(baseReply.ToUserName);

      const danReply = [
        'Dan',
        `👉🏻 <a href="${danUrl}">Dan是什么？</a>`,
        `👉🏻 ${getTextReplyUrl('马上抢（Dan）', '马上抢')}`
      ];

      res.send({ ...baseReply, MsgType: 'text', Content: danReply });
      break;

    case '马上抢（Dan）':
      const danText = await getDanText();
      // await sendMessage(baseReply.ToUserName, danText);

      res.send({ ...baseReply, MsgType: 'text', Content: danText });
      break;

    case '马上抢（助理小吴AI群）':
      const aiGroupText = await getAiGroupText();
      // await sendMessage(baseReply.ToUserName, aiGroupText);

      res.send({ ...baseReply, MsgType: 'text', Content: aiGroupText });
      break;

    case '企业购买/赠好友':
      // await sendMessage(baseReply.ToUserName, '👩🏻‍💻 请扫码添加客服，并向客服发送“企业购买”或“赠好友”');
      await sendServiceQRcode(baseReply.ToUserName);

      res.send({ ...baseReply, MsgType: 'text', Content: '👩🏻‍💻 请扫码添加客服，并向客服发送“企业购买”或“赠好友”' });
      break;

    case '获取10份年卡':
      // await sendMessage(baseReply.ToUserName, '👩🏻‍💻 请扫码添加客服，并向客服发送“获取10份年卡”');
      await sendServiceQRcode(baseReply.ToUserName);

      res.send({ ...baseReply, MsgType: 'text', Content: '👩🏻‍💻 请扫码添加客服，并向客服发送“获取10份年卡”' });
      break;

    case '对话4o':
      await setMode(message.FromUserName, Product.GPT4);
      if (!gpt_welcome_enable) return;
      // await sendMessage(message.FromUserName, gpt_welcome);

      res.send({ ...baseReply, MsgType: 'text', Content: gpt_welcome });
      break;

    case '绘图Midjourney':
      await setMode(message.FromUserName, Product.Midjourney);
      if (!mj_welcome_enable) return;

      const reply = [
        mj_welcome,
        getTextReplyUrl(
          '3D卡通风格渲染，女孩，春季流行时尚服装，糖果色服装，装满鲜花的透明背包，新的流行肖像，时尚插图，鲜艳的色彩，霓虹现实，由 POP-Mart 制作，光滑细腻，全身效果，干净背景，3D 渲染，OC 渲染，8K --ar 3:4 --niji 5'
        ),
        getTextReplyUrl(
          'Very simple, minimalist, cartoon graffiti, line art, cute black line little girl, various poses and expressions. Crying, running away, shy, Smile, eating, kneeling, surprised, laughing, etc. --niji 5'
        )
      ];
      // await sendMessage(message.FromUserName, reply.join('\n\n'));

      res.send({ ...baseReply, MsgType: 'text', Content: reply.join('\n\n') });
      break;

    case '领取100元限时优惠券':
      const saleReply = [
        '🎉 成功领取100元限时优惠券',
        '👩🏻‍💻 助理小吴AI群，新用户首次体验价399元/年',
        '🎟️ 折上叠加100元限时立减券，仅需',
        `👉🏻 ${getOrderUrl('299元/年，马上抢', { level: VipLevel.Year, product: Product.Group, isRecommend: true })}🔥`,
        '7️⃣ 支持7天无理由，下单后添加客服激活'
      ];
      // await sendMessage(message.FromUserName, saleReply.join('\n\n'));

      res.send({ ...baseReply, MsgType: 'text', Content: saleReply.join('\n\n') });
      break;

    default:
      if (isAdmin) {
        await chatWithAI(message, res);
      }

      break;
  }
};

const handleEvent = async (message: EventMessage, res: any) => {
  const { FromUserName, Event, EventKey } = message;

  console.log('【handleEvent】 Event: ', Event, ' EventKey: ', EventKey);

  switch (Event) {
    case 'subscribe':
      // await updateRedis();
      await subscribe(message);
      break;

    case 'unsubscribe':
      const user = await User.findOne({ where: { user_id: FromUserName } });
      if (!user) {
        await User.findOrCreate({
          where: { user_id: FromUserName },
          defaults: { subscribe_status: false, user_id: FromUserName }
        });
      } else {
        await user.update({ subscribe_status: false });
      }

      break;

    case 'SCAN':
      if (!EventKey) return;

      // 临时用户，从微信过来的
      if (EventKey.endsWith('_temp_use')) {
        const temp_user_id = extractBetween(EventKey, '', '_temp_user');

        const [user, created] = await User.findOrCreate({
          where: { user_id: FromUserName },
          defaults: { subscribe_status: true, xiaowu_id: temp_user_id }
        });

        if (!created && !user.toJSON().xiaowu_id) {
          await user.update({ xiaowu_id: temp_user_id });
        }

        return;
      }

      // 会员用户，从微信过来的
      if (EventKey.endsWith('_vip_use')) return;

      // 二维码中携带了上一个用户的id
      const who = getBeforeQuestionMark(EventKey);

      console.log('【SCAN】 who: ', who);

      if (who === FromUserName) return;

      const reply = [
        '🎉 成功获取惊喜彩蛋专链',
        '🎟 199元/365天无限次使用，支持7天无理由',
        '🎫 仅限100张，以下单成功页面为准，下单失败就是抢光了～',
        `👉🏻 ${getOrderUrl('点此立即抢购', { level: VipLevel.Year, product: Product.Group, boon: true })}`
      ];

      await sendMessage(FromUserName, reply.join('\n\n'));

      await sendMessage(FromUserName, '成功抢到后务必添加客服，发“激活”自动拉群');

      await sendServiceQRcode(FromUserName);

      break;

    case 'CLICK':
      if (!EventKey) return;
      await menuEvent(message, EventKey, res);
      break;
  }
};

const handleVoice = async (message: VoiceMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);

  const localPath = await downloadTempVoiceFile(message.MediaId);

  const cosInstance = new COS({ SecretId: COS_SECRET_ID, SecretKey: COS_SECRET_KEY });

  await uploadFile(cosInstance, localPath, message.MediaId);

  const url = `${cdn_url}/${message.MediaId}`;

  console.log('url : ', url);

  const result = await voice2Text(url);

  if (!result?.Result) {
    await sendMessage(message.FromUserName, '抱歉，请再说一次吧');
    return;
  }

  await sendMessage(message.FromUserName, result.Result);

  /** ------------------------------------------------ */

  // const voicePath = await downloadVoiceFile(message.MediaId);

  // const transformText = await voiceToText(voicePath);

  // console.log('【message】 handleVoice transformText: ', transformText);

  // if (!transformText) {
  //   res.send({ ...baseReply, MsgType: 'text', Content: '抱歉，请再说一次吧' });
  //   return;
  // }

  // const granMessage = { ...message, MsgType: 'text', Content: transformText, ReplyWithVoice: true };
  // await chatWithAI(granMessage as TextMessage, res);
};

const handleMessage = async (message: WeChatMessage, res: any) => {
  const type = message.MsgType;

  switch (type) {
    case 'event':
      handleEvent(message, res);
      break;

    case 'text':
      await handleText(message, res);
      break;

    case 'image':
      await doImageMode(message, res);
      break;

    case 'voice':
      handleVoice(message, res);
      break;

    default:
      break;
  }
};

export const onMessage = async (req: any, res: any) => {
  const message: WeChatMessage = req.body;

  console.log('message: ', message);

  // 处理消息
  await handleMessage(message, res);
};
