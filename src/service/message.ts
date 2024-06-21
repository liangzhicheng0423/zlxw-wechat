import moment from 'moment';
import path from 'path';
import { chatWithTextAI } from '../AI/GPT4';
import { chatWithDrawAI } from '../AI/MJ';
import { doImageMode } from '../AI/MJ/doImageMode';
import { decrypt } from '../crypto';
import { ClearanceCode } from '../mysqlModal/clearanceCode';
import { User } from '../mysqlModal/user';
import { deleteRedisKey, getFreeCount, getIsVip, getMode, getModeKey, useFreeCount } from '../redis';
import { EventMessage, Product, TextMessage, VoiceMessage, WeChatMessage } from '../types';
import {
  createQRCode,
  downloadImage,
  downloadVoiceFile,
  getAiGroupText,
  getDanText,
  getGptConfig,
  getReplyBaseInfo,
  getTextReplyUrl,
  getWelcome,
  mergeImages,
  sendAiGroupText,
  sendDanText,
  sendMessage,
  sendServiceQRcode,
  uploadTemporaryMedia,
  voiceToText
} from '../util';
import { create, menuEvent } from './create';
import { subscribe } from './subscribe';

const { admins } = getGptConfig();

const chatWithAI = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);

  const userId = message.FromUserName;
  const mode = await getMode(userId);

  if (!mode) {
    res.send({
      ...baseReply,
      MsgType: 'text',
      Content: '您当前未进入任何模式！～（请点击菜单栏中的"GPT4"或"MJ绘图"按钮切换模式）'
    });
    return;
  }

  const isVip = await getIsVip(userId);
  console.log('isVip: ', isVip);

  if (isVip === 'false') {
    // 消耗免费额度
    const freeCount = await getFreeCount(userId, mode);

    console.log('freeCount: ', freeCount);

    if (!freeCount) {
      const aiGroupText = getAiGroupText();
      await sendMessage(baseReply.ToUserName, aiGroupText);

      res.send({
        ...baseReply,
        MsgType: 'text',
        Content: '您的免费次数已经用完啦，加入我们的会员，即可享受无限制的AI体验 🎉'
      });
      return;
    } else {
      await useFreeCount(userId, mode);
    }
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

  const isAdmin = admins.includes(userId);
  const isClearance = message.Content.startsWith('核销');
  const isConfirmClearance = message.Content.startsWith('确认核销');

  if (isAdmin) {
    const [cmd, code] = message.Content.split(' ');

    // 二次确认核销码信息
    if (isClearance) {
      if (cmd !== '核销' || !code) {
        await sendMessage(userId, '命令格式错误');
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
      await sendMessage(userId, reply.join('\n\n'));
      return;
    }

    if (isConfirmClearance) {
      if (cmd !== '确认核销' || !code) {
        await sendMessage(userId, '命令格式错误');
        return;
      }
      // 解密
      const decryptedText = decrypt(code);
      const [customerId] = decryptedText.split('-');
      const clearance = await ClearanceCode.findOne({ where: { user_id: customerId, clearance_code: code } });
      if (!clearance) {
        await sendMessage(userId, '抱歉，核销码不存在～');
        return;
      }

      const formatClearance = clearance.toJSON();
      console.log('formatClearance.status: ', formatClearance.status);
      if (formatClearance.status === true) {
        await sendMessage(userId, '抱歉，核销码已经被核销');
        return;
      }

      await clearance.update({ status: true, check_date: moment() });
      await sendMessage(userId, '核销成功');
      return;
    }
  }

  switch (message.Content) {
    case '更新菜单':
      create();
      break;
    case '获取我的专属分享海报':
      // 获取二维码
      const qrCodeUrl = await createQRCode(userId);

      // 下载二维码
      const qrCodePath = await downloadImage(qrCodeUrl, userId);

      const outPath = path.join(__dirname, `../tmp/image/image_qrcode_${Date.now()}.jpeg`);

      // 合成背景图
      const bgPath = await mergeImages(qrCodePath, './src/public/images/qrcode_bg.png', outPath);

      // 上传至素材库
      const updateRes = await uploadTemporaryMedia(bgPath, 'image');

      res.send({ ...baseReply, MsgType: 'image', Image: { MediaId: updateRes.media_id } });
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

    case '奖励规则':
      // TODO: 后续更换为图片
      res.send({ ...baseReply, MsgType: 'text', Content: 'N币奖励规则（即将呈现）' });
      break;

    case '活动规则':
      // TODO: 后续更换为图片
      res.send({ ...baseReply, MsgType: 'text', Content: '【分享有礼活动规则详情页】' });
      break;

    case '兑换':
      await sendMessage(baseReply.ToUserName, '每满500N币即可兑换现金50元，请扫码添加客服，并向客服发送"兑换"');
      await sendServiceQRcode(baseReply.ToUserName);
      break;

    case '马上接入':
      await sendMessage(baseReply.ToUserName, '请扫码添加客服，并向客服发送“AI接入”');
      await sendServiceQRcode(baseReply.ToUserName);
      break;

    case '获取助理小吴AI群':
      await sendAiGroupText(baseReply.ToUserName);
      break;

    case '获取Dan':
      await sendDanText(baseReply.ToUserName);
      break;

    case '马上抢（Dan）':
      const danText = getDanText();
      await sendMessage(baseReply.ToUserName, danText);
      break;

    case '马上抢（助理小吴AI群）':
      const aiGroupText = getAiGroupText();
      await sendMessage(baseReply.ToUserName, aiGroupText);
      break;

    case '企业购买/赠好友':
      await sendMessage(baseReply.ToUserName, '请扫码添加客服，并向客服发送“企业购买”或“赠好友”');
      await sendServiceQRcode(baseReply.ToUserName);
      break;

    case '退出':
      await sendMessage(baseReply.ToUserName, '已退出当前模式');
      await deleteRedisKey(getModeKey(baseReply.ToUserName));
      break;

    // 转到AI对话
    default:
      await chatWithAI(message, res);
      break;
  }
};

const handleEvent = async (message: EventMessage, res: any) => {
  const { FromUserName, Event, EventKey } = message;

  switch (Event) {
    case 'subscribe':
      await sendMessage(FromUserName, getWelcome());
      await subscribe(message);
      break;

    case 'unsubscribe':
      await User.update({ subscribe_status: false }, { where: { user_id: FromUserName } });
      break;

    case 'SCAN':
      if (EventKey === FromUserName) return;

      // 二维码中携带了上一个用户的id
      if (EventKey) await sendMessage(FromUserName, getWelcome());
      break;

    case 'CLICK':
      if (!EventKey) return;
      await menuEvent(message, EventKey, res);
      break;
  }
};

const handleVoice = async (message: VoiceMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);
  const userId = message.FromUserName;
  const mode = await getMode(userId);

  if (!mode) {
    res.send({
      ...baseReply,
      MsgType: 'text',
      Content: '您当前未进入任何模式！～（请点击菜单栏中的"GPT4"按钮切换模式）'
    });
    return;
  }

  const voicePath = await downloadVoiceFile(message.MediaId);

  const transformText = await voiceToText(voicePath);

  if (!transformText) {
    res.send({ ...baseReply, MsgType: 'text', Content: '抱歉，请再说一次吧' });
    return;
  }

  const granMessage = { ...message, MsgType: 'text', Content: transformText, ReplyWithVoice: true };
  await chatWithAI(granMessage as TextMessage, res);
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
