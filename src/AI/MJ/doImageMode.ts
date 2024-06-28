import { ImageMessage } from '../../types';
import { getReplyBaseInfo } from '../../util';
import { getBaiduReview } from '../check';
import taskManager from './taskManager';
import { OPERATE } from './types';
import { imageReview } from './util';

export const doImageMode = async (message: ImageMessage, res: any) => {
  const userId = message.FromUserName;

  const baseReply = getReplyBaseInfo(message);

  // 判断是否在模式中，如果不在模式中，则退出
  const userMode = taskManager.isModing(userId);
  console.log('========== userMode: ', userMode);
  if (userMode === undefined) return;

  const send = (content: string) => {
    res.send({ ...baseReply, MsgType: 'text', Content: content });
  };

  // 判断当前模式中图片是否已经上限，若上限直接退出
  const overage = taskManager.isOverage(userId, userMode);
  if (overage) {
    send('⚠️ 图片上限啦');
    return;
  }

  const { PicUrl } = message;

  try {
    // 图片审核
    const access_token = await getBaiduReview();
    if (access_token) {
      const { pass, message: reviewMessage } = await imageReview(access_token, PicUrl);
      if (!pass) {
        send(reviewMessage);
        return;
      }
    }

    switch (userMode) {
      case OPERATE.Url:
        send(`🎉 图片地址: ${PicUrl}`);
        taskManager.updateMode(userId, OPERATE.Close);
        break;

      case OPERATE.Blend:
        taskManager.updateMode(userId, OPERATE.Blend, PicUrl);
        break;

      case OPERATE.Describe:
        // 图生文，走单独的接口
        taskManager.updateMode(userId, OPERATE.Blend, PicUrl);
        break;

      default:
        break;
    }
    // }
  } catch (error) {
    console.log('uploadFile error');
  }
  return;
};
