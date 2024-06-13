import { User } from '../mysqlModal/user';
import { EventMessage, ImageMessage, TextMessage, WeChatMessage } from '../types';
import {
  createQRCode,
  downloadImage,
  getAiGroupText,
  getDanText,
  getReplyBaseInfo,
  getWelcome,
  mergeImages,
  sendAiGroupText,
  sendDanText,
  sendMessage,
  sendServiceQRcode,
  uploadTemporaryImageMedia
} from '../util';
import { menuEvent } from './create';
import { subscribe } from './subscribe';

const handleText = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);
  const userId = message.FromUserName;

  switch (message.Content) {
    case '获取我的专属分享海报':
      // 获取二维码
      const qrCodeUrl = await createQRCode(userId);

      // 下载二维码
      const qrCodePath = await downloadImage(qrCodeUrl, userId);

      const outPath = `./tmp/image_qrcode_${Date.now()}.jpeg`;
      // 合成背景图
      const path = await mergeImages(qrCodePath, './src/public/images/qrcode_bg.jpeg', outPath);

      // 上传至素材库
      const updateRes = await uploadTemporaryImageMedia(path);

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

    default:
      break;
  }
};

const handleImage = (message: ImageMessage, res: any) => {};

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
      handleImage(message, res);
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
