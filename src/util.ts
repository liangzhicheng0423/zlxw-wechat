import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import FormData from 'form-data';
import fs from 'fs';
import Jimp from 'jimp';
import moment, { Moment } from 'moment';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import xml2js from 'xml2js';
import { MJConfig } from './AI/MJ/types';
import { BonusStrategy, OrderLadderRewards, PayBody, SubscribeLadderRewards } from './constant';
import { BonusTypeEnum, GPTConfig, OrderBody, Product, VipLevel, WeChatMessage } from './types';

const gptConfig = require('../config-gpt.json');
const mjConfig = require('../config-mj.json');

const { LINK_AI_APP_KEY, LINK_AI_APP_CODE } = process.env;

export const getGptConfig = () => gptConfig as GPTConfig;
export const getMjConfig = () => mjConfig as MJConfig;

const appId = 'gh_c1c4f430f4a9'; // 替换为你的微信公众号的 appId
const appSecret = 'wxd00871cb6294c27462b8813d70c473a5f5e537e1728eb408'; // 替换为你的微信公众号的 appSecret

// 获取 access_token
export const getAccessToken = async () => {
  try {
    const response = await axios.get(
      `http://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
    );
    const { access_token } = response.data;
    return access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

// 生成带参数的二维码
export const createQRCode = async (sceneStr: string) => {
  try {
    // const accessToken = await getAccessToken(); // 云托管服务暂且不需要access token
    const qrCodeData = {
      action_name: 'QR_LIMIT_STR_SCENE',
      action_info: { scene: { scene_str: sceneStr } }
    };

    const response = await axios.post(`http://api.weixin.qq.com/cgi-bin/qrcode/create`, qrCodeData);
    const { ticket } = response.data;

    // 通过 ticket 换取二维码
    const qrCodeUrl = `http://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
    return qrCodeUrl;
  } catch (error) {
    console.error('Error creating QR code:', error);
    throw error;
  }
};

export const getReplyBaseInfo = (message: WeChatMessage) => {
  const ToUserName = message.FromUserName;
  const FromUserName = message.ToUserName;
  const CreateTime = Date.now();
  return { ToUserName, FromUserName, CreateTime };
};

export const getImage = (img_url: string, task_id: string, user_id: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 使用axios下载图片
    axios
      .get(img_url, {
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      })
      .then(response => {
        const filePath = path.join(__dirname, `../tmp/image/image_${user_id}_${task_id}.jpg`);
        fs.writeFileSync(filePath, Buffer.from(response.data, 'binary'));
        resolve(filePath);
      })
      .catch(error => {
        console.error(`[WX] Error downloading image: ${error}`);
      });
  });
};

export const downloadImage = (img_url: string, user_id: string): Promise<string> => {
  return new Promise(resolve => {
    // 使用axios下载图片
    axios
      .get(img_url, {
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      })
      .then(response => {
        const filePath = path.join(__dirname, `../tmp/image/image_${user_id}_${Date.now()}.jpg`);

        fs.writeFileSync(filePath, Buffer.from(response.data, 'binary'));
        resolve(filePath);
      })
      .catch(error => {
        console.error(`[WX] Error downloading image: ${error}`);
        resolve('');
      });
  });
};

// 上传临时图片素材函数
export const uploadTemporaryMedia = async (filePath: string, type: 'image' | 'voice' | 'video') => {
  const uploadUrl = 'http://api.weixin.qq.com/cgi-bin/media/upload';

  try {
    // 构造上传参数
    const formData = { media: fs.createReadStream(filePath) };

    // 发送请求
    const response = await axios.post(uploadUrl, formData, {
      // 媒体文件类型
      params: { type },
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // 返回上传结果
    return response.data;
  } catch (error: any) {
    console.error('Error uploading:', error.message);
    throw error;
  }
};

// 上传永久图片素材函数
export const uploadPermanentImageMedia = async (filePath: string) => {
  const uploadUrl = 'http://api.weixin.qq.com/cgi-bin/material/add_material';

  try {
    // 构造上传参数
    const formData = { media: fs.createReadStream(filePath) };

    // 发送请求
    const response = await axios.post(uploadUrl, formData, {
      // 媒体文件类型，图片类型为 image
      params: { type: 'image' },
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    console.log('上传永久素材', filePath, response.data);

    // 返回上传结果
    return response.data;
  } catch (error: any) {
    console.error('Error uploading image:', error.message);
    throw error;
  }
};

// 获取用户奖励
export const getBonus = (currentCount: number, strategy: 'subscribe' | 'order') => {
  // 获取当前定义的奖励类型
  const bonusType = BonusStrategy[strategy]?.bonusType ?? BonusTypeEnum.Integral;

  const LadderRewards = strategy === 'subscribe' ? SubscribeLadderRewards : OrderLadderRewards;

  const currentBonus = LadderRewards.find(v => v.level >= currentCount);
  return {
    type: bonusType,
    bonus: currentBonus?.[bonusType] ?? 0
  };
};

export const sendMessage = async (userId: string, text: string) => {
  await axios.post('http://api.weixin.qq.com/cgi-bin/message/custom/send', {
    touser: userId,
    msgtype: 'text',
    text: { content: text }
  });
};

export const sendImage = async (userId: string, mediaId: string) => {
  await axios.post('http://api.weixin.qq.com/cgi-bin/message/custom/send', {
    touser: userId,
    msgtype: 'image',
    image: { media_id: mediaId }
  });
};

export const mergeImages = async (image1Path: string, image2Path: string, outputImagePath: string) => {
  try {
    const [image1, image2] = await Promise.all([Jimp.read(image1Path), Jimp.read(image2Path)]);

    const combinedWidth = image2.bitmap.width;
    const combinedHeight = image2.bitmap.height;

    image1.resize(176, 176); // 也可以使用 image.resize(Jimp.AUTO, height) 保持宽高比

    // 设置压缩质量（仅适用于 JPEG 图片）
    image1.quality(100); // 质量范围是 0-100

    const combinedImage = new Jimp(combinedWidth, combinedHeight);

    combinedImage.composite(image2, 0, 0);
    combinedImage.composite(image1, 506, 1106);

    await combinedImage.writeAsync(outputImagePath);

    return outputImagePath;
  } catch (error) {
    console.error('Error merging images:', error);
    return '';
  }
};

export const generateOrderNumber = (level: VipLevel, product: Product) => {
  return `${Date.now()}_${Math.floor(100000 + Math.random() * 900000)}_${level}_${product}`;
};

export const getLevelAndProduct = (tradeNo: string) => {
  const arr = tradeNo.split('_');
  const level = arr[arr.length - 2] as VipLevel;
  const product = arr[arr.length - 1] as Product;
  return { level, product };
};

export const getTextReplyUrl = (text: string, name?: string) => {
  const msgMenUid = Date.now() + '_' + Math.floor(100000 + Math.random() * 900000);
  return `<a href="weixin://bizmsgmenu?msgmenucontent=${text}&msgmenuid=${msgMenUid}">${name ?? text}</a>`;
};

export const getOrderUrl = (name: string, params?: OrderBody) => {
  const baseUrl = 'https://wechat.ai-xiaowu.com';

  // 将 params 对象转换为查询字符串
  const queryString = params ? new URLSearchParams(params as any).toString() : '';

  // 拼接查询字符串到 URL 后面
  const urlWithParams = queryString ? `${baseUrl}?${queryString}` : baseUrl;

  return `<a href="${urlWithParams}">${name}</a>`;
};

export const getOneYearLater = (date: Moment = moment()): Moment => {
  return date.clone().add(1, 'years');
};

/** 获取会员过期时间 */
export const getExpireDate = (date: Moment, level: VipLevel) => {
  switch (level) {
    case VipLevel.Month:
      return date.clone().add(1, 'months');
    case VipLevel.Quarter:
      return date.clone().add(3, 'months');
    case VipLevel.Year:
    case VipLevel.Ten:
      return date.clone().add(1, 'years');
    default:
      return null;
  }
};

export const jsonToXml = (json: any): string => {
  const builder = new xml2js.Builder();
  return builder.buildObject(json);
};

export const getWelcome = () => {
  const reply = [
    '你好',
    '👩🏻‍💻我是你的助理小吴，我可以：',
    '🥇让排名第一的AI工具，成为你的微信好友',
    `👉🏻${getTextReplyUrl('获取助理小吴AI群')}`,
    `👉🏻${getTextReplyUrl('获取Dan')}`,
    '<a href="https://ai-xiaowu.com">官网</a>'
  ];
  return reply.join('\n\n');
};

export const getDanText = () => {
  const reply = [
    'Dan',
    getOrderUrl(PayBody[Product.Dan][VipLevel.Year], { level: VipLevel.Year, product: Product.Dan }),
    getOrderUrl(PayBody[Product.Dan][VipLevel.Quarter], { level: VipLevel.Quarter, product: Product.Dan }),
    getOrderUrl(PayBody[Product.Dan][VipLevel.Month], { level: VipLevel.Month, product: Product.Dan })
  ];
  return reply.join('\n\n');
};

export const getAiGroupText = () => {
  const reply = [
    '助理小吴AI群',
    '🔥' + getOrderUrl(PayBody[Product.GPT4][VipLevel.Year], { level: VipLevel.Year, product: Product.GPT4 }),
    getOrderUrl(PayBody[Product.GPT4][VipLevel.Ten], { level: VipLevel.Ten, product: Product.GPT4 }),
    getOrderUrl(PayBody[Product.GPT4][VipLevel.Quarter], { level: VipLevel.Quarter, product: Product.GPT4 }),
    getOrderUrl(PayBody[Product.GPT4][VipLevel.Month], { level: VipLevel.Month, product: Product.GPT4 }),
    getTextReplyUrl('企业购买/赠好友')
  ];
  return reply.join('\n\n');
};

export const sendDanText = async (userId: string) => {
  const danText = `Dan ${getTextReplyUrl('马上抢（Dan）')}`;
  await sendMessage(userId, danText);
  await sendMessage(userId, '【Dan产品介绍页】');
};

export const sendAiGroupText = async (userId: string) => {
  await sendMessage(userId, `助理小吴AI群 ${getTextReplyUrl('马上抢（助理小吴AI群）')}`);
  await sendMessage(userId, '【AI群产品介绍页】');
};

export const sendServiceQRcode = async (userId: string) => {
  await sendImage(userId, 'FLs_fBoOlhvVW6z2cE128uLbsMyOhY8kCfA7BpaZIcj0-WZI5wAdHGH8G8-PSSWP');
};

/** 获取音频临时文件 */
export const downloadVoiceFile = async (mediaId: string): Promise<string> => {
  // 下载语音文件
  const url = `http://api.weixin.qq.com/cgi-bin/media/get?media_id=${mediaId}`;
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const filePath = path.join(__dirname, `../tmp/voice/${mediaId}.amr`);
  console.log('filePath,', filePath);
  fs.writeFileSync(filePath, response.data);
  return filePath;
};

// (async () => {
//   const path = await downloadVoiceFile('OpEE6Weo1p3q5ahc2OXCoUEueEQX84EsTN9TwxogMlmtCCph8nsf-hGXjnGJGkla');
//   console.log('path===', path);
// })();

// 音频转换函数
export const anyToMp3 = async (anyPath: string, mp3Path: string): Promise<void> => {
  console.log('anyPath: ', anyPath);
  if (anyPath.endsWith('.mp3')) {
    await fs.promises.copyFile(anyPath, mp3Path);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    ffmpeg(anyPath)
      .toFormat('mp3')
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .save(mp3Path);
  });
};

export const voiceToText = async (voiceFile: string): Promise<null | string> => {
  try {
    const url = `https://api.link-ai.chat/v1/audio/transcriptions`;
    const headers = { Authorization: `Bearer ${LINK_AI_APP_KEY}` };
    const model = 'whisper-1';

    // if (voiceFile.endsWith('.amr')) {
    //   try {
    //     const mp3File = path.basename(voiceFile, '.amr') + '.mp3';

    //     await anyToMp3(voiceFile, mp3File);

    //     voiceFile = mp3File;
    //   } catch (e) {
    //     console.log('anyToMp3 error', e);
    //     return null;
    //   }
    // }

    const file = fs.createReadStream(voiceFile);
    const formData = new FormData();

    formData.append('file', file);
    formData.append('model', model);

    const res = await axios.post(url, formData, { headers, timeout: 60000 });

    if (res.status === 200) return res.data.text;
    return null;
  } catch (e) {
    console.log('voiceToText error: ', e);
    return null;
  }
};

export const textToVoice = async (input: string): Promise<string | null> => {
  try {
    const url = `https://api.link-ai.chat/v1/audio/speech`;
    const headers = {
      Authorization: `Bearer ${LINK_AI_APP_KEY}`,
      'Content-Type': 'application/json'
    };
    const model = 'tts-1';
    const data = { model, input, voice: 'onyx', app_code: LINK_AI_APP_CODE };

    const res = await axios.post(url, data, { headers: headers, responseType: 'arraybuffer' });

    if (res.status === 200) {
      const key = `${moment().format('YYYYMMDDHHmmss')}${uuidv4()}`;
      const mp3Path = path.join(__dirname, `../tmp/voice/${key}.mp3`);
      fs.writeFileSync(mp3Path, res.data);

      return mp3Path;
    } else {
      const resJson = res.data;
      console.error(`[LinkVoice] textToVoice error, status_code=${res.status}, msg=${resJson.message}`);
      return null;
    }
  } catch (error) {
    console.log('textToVoice error', error);
    return null;
  }
};

/** 发送音频消息 */
export const sendVoiceMessage = async (userId: string, mediaId: string) => {
  try {
    const url = `http://api.weixin.qq.com/cgi-bin/message/custom/send`;
    const data = {
      touser: userId,
      msgtype: 'voice',
      voice: { media_id: mediaId }
    };
    await axios.post(url, data);
  } catch (error) {
    console.error(`Failed to send voice message`);
  }
};

export const getNow = () => {
  return Math.floor(Date.now() / 1000);
};

export const exitText = () => `（回复“${getTextReplyUrl('退出')}”可离开当前模式）`;
