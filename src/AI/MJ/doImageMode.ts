import COS from 'cos-nodejs-sdk-v5';
import path from 'path';
import { ImageMessage } from '../../types';
import { downloadImage, getMjConfig, getReplyBaseInfo } from '../../util';
import { getBaiduReview } from '../check';
import taskManager from './taskManager';
import { OPERATE } from './types';
import { imageReview, uploadFile } from './util';

const { cdn_url } = getMjConfig();

const { COS_SECRET_ID, COS_SECRET_KEY } = process.env;

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

  const { PicUrl, MediaId } = message;

  try {
    const imagePath = await downloadImage(PicUrl, userId + '-' + MediaId);

    if (!imagePath) {
      send('抱歉，图片下载失败，请稍后再试～');
      return;
    }

    const cosInstance = new COS({
      UseAccelerate: true, // 指定 true，使用全球加速域名请求
      Protocol: 'http:', // 请求协议： 'https:' 或 'http:'
      SecretId: COS_SECRET_ID,
      SecretKey: COS_SECRET_KEY
    });

    const data = await uploadFile(cosInstance, imagePath, MediaId);
    if (data.statusCode === 200) {
      const url = `${cdn_url}/${MediaId}`;
      console.log('========== url: ', url);

      // 图片审核
      const access_token = await getBaiduReview();
      if (access_token) {
        const { pass, message: reviewMessage } = await imageReview(access_token, url);
        if (!pass) {
          send(reviewMessage);
          return;
        }
      }

      switch (userMode) {
        case OPERATE.Url:
          send(`🎉 图片地址: ${url}`);
          taskManager.updateMode(userId, OPERATE.Close);
          break;

        case OPERATE.Blend:
          taskManager.updateMode(userId, OPERATE.Blend, url);
          break;

        case OPERATE.Describe:
          // 图生文，走单独的接口
          taskManager.updateMode(userId, OPERATE.Blend, url);
          break;

        default:
          break;
      }
    }
  } catch (error) {
    console.log('uploadFile error');
  }
  return;
};
