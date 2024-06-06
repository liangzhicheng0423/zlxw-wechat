import { User } from '../mysqlModal/user';
import { EventMessage, ImageMessage, TextMessage, WeChatMessage } from '../types';
import { createQRCode, downloadImage, getReplyBaseInfo, mergeImages, uploadPermanentImageMedia } from '../util';
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
        defaults: { subscribe_status: true }
      });

      // 如果找到了用户，可以在这里更新用户信息
      if (!created) await user.update({ subscribe_status: true });

      if (!eventKey) return;

      // 如果携带了EventKey，则证明该二维码为别人分享而来
      const shareUser = eventKey.split('_');

      if (shareUser[0] === 'qrscene') {
        // 获取分享者的用户id
        const shareUserId = shareUser[1];

        // 之前关注过，取消了又关注。不给奖励
        if (created) await award(shareUserId, 'subscribe');
      }

      break;
    case 'unsubscribe':
      // 查找用户
      const foundUser = await User.findOne({ where: { userId: currentUserId } });
      if (foundUser) foundUser.update({ subscribe_status: false });
      break;

    case 'SCAN':
      // 用户扫描二维码

      // 二维码中携带了上一个用户的id
      if (eventKey) await award(eventKey, 'scan');
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
  console.log('收到消息', message);

  // 处理消息
  await handleMessage(message, res);
};
