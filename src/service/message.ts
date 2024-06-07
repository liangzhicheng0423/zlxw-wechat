import { User } from '../mysqlModal/user';
import { EventMessage, ImageMessage, TextMessage, WeChatMessage } from '../types';
import {
  createQRCode,
  downloadImage,
  getReplyBaseInfo,
  mergeImages,
  sendMessage,
  uploadPermanentImageMedia
} from '../util';
import { award } from './award';

const handleText = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);

  if (message.Content === '生成专属邀请二维码') {
    const userId = message.FromUserName;

    // 获取二维码
    const qrCodeUrl = await createQRCode(userId);

    // 下载二维码
    const qrCodePath = await downloadImage(qrCodeUrl, userId);

    const outPath = `./tmp/image_qrcode_${Date.now()}.jpeg`;
    // 合成背景图
    const path = await mergeImages(qrCodePath, './src/public/images/qrcode_bg.jpeg', outPath);

    // 上传至素材库
    const updateRes = await uploadPermanentImageMedia(path);

    res.send({ ...baseReply, MsgType: 'image', Image: { MediaId: updateRes.media_id } });
  } else {
    res.send({ ...baseReply, MsgType: 'text', Content: '敬请期待' });
  }
};

const handleImage = (message: ImageMessage, res: any) => {};

const handleEvent = async (message: EventMessage, res: any) => {
  const currentUserId = message.FromUserName;
  const event = message.Event;
  const eventKey = message.EventKey;

  switch (event) {
    case 'subscribe':
      // 用户订阅
      const [user, created] = await User.findOrCreate({
        where: { userId: currentUserId },
        defaults: { subscribe_status: true, pId: eventKey }
      });

      // 如果找到了用户，可以在这里更新用户信息
      if (!created) {
        const update: { subscribe_status: boolean; pId?: string } = { subscribe_status: true };
        const formatUser = user.toJSON();

        if (!formatUser.pId && eventKey) {
          const shareUser = eventKey.split('_');

          if (shareUser[0] === 'qrscene') {
            // 获取分享者的用户id
            const shareUserId = shareUser[1];
            if (shareUserId !== currentUserId) update.pId = shareUserId;
          }
        }

        await user.update(update);
      }

      if (!eventKey) return;

      // 如果携带了EventKey，则证明该二维码为别人分享而来
      const shareUser = eventKey.split('_');

      if (shareUser[0] === 'qrscene') {
        // 获取分享者的用户id
        const shareUserId = shareUser[1];

        if (shareUserId === currentUserId) return;

        // 只有新增关注才给予奖励
        if (created) await award(shareUserId, 'subscribe');
      }

      break;

    case 'unsubscribe':
      await User.update({ subscribe_status: false }, { where: { userId: currentUserId } });
      break;

    case 'SCAN':
      if (eventKey === currentUserId) return;

      // 二维码中携带了上一个用户的id
      if (eventKey) await sendMessage(currentUserId, '付款链接');
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

  // 处理消息
  await handleMessage(message, res);
};
