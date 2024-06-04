import { EventMessage, ImageMessage, TextMessage, WeChatMessage } from '../types';
import { createQRCode, downloadImage, getReplyBaseInfo, uploadPermanentImageMedia } from '../util';

const handleText = async (message: TextMessage, res: any) => {
  const baseReply = getReplyBaseInfo(message);

  if (message.Content === '生成专属邀请二维码') {
    const userId = message.FromUserName;
    const qrCodeUrl = await createQRCode(userId);

    console.log('path===', qrCodeUrl);

    const path = await downloadImage(qrCodeUrl, userId);

    console.log('path===', path);

    const updateRes = await uploadPermanentImageMedia(path);

    console.log('updateRes===', updateRes);
    // MediaId
    res.send({
      ...baseReply,
      MsgType: 'image',
      MediaId: updateRes.media_id
    });
  } else {
    res.send({
      ...baseReply,
      MsgType: 'text',
      MediaId: '敬请期待'
    });
  }
};

const handleImage = (message: ImageMessage, res: any) => {};

const handleEvent = (message: EventMessage, res: any) => {};

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
  console.log('post req --- body', req.body);
  const message: WeChatMessage = req.body;

  // 处理消息
  await handleMessage(message, res);

  // if (req.body.Content === '生成个人邀请码') {
  //   // 请求永久二维码

  //   const url = await createQRCode(req.body.FromUserName);

  //   console.log('========= url: ', url);
  // }

  // const content = '敬请期待';

  // res.send({
  //   ToUserName: req.body.FromUserName,
  //   FromUserName: req.body.ToUserName,
  //   CreateTime: Date.now(), // 整型，例如：1648014186
  //   MsgType: 'text',
  //   Content: content
  // });
};
