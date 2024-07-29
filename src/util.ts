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
import { BonusStrategy, PayBody, PayLevel } from './constant';
import { Product as sqProduct } from './mysqlModal/product';
import { BonusTypeEnum, GPTConfig, OrderBody, Product, VipLevel, WeChatMessage } from './types';

export const officialWebsite = 'https://ai-xiaowu.com';
export const danUrl = 'https://i1ze0gf4g8p.feishu.cn/wiki/L4K5wjFPiib41gkgrszcgqHznXb';
export const activityRulesUrl = 'https://i1ze0gf4g8p.feishu.cn/wiki/I8WbwG8NSiVD1WkmVzqc1GPTn4e';

const gptConfig = require('../config-gpt.json');
const mjConfig = require('../config-mj.json');

const { LINK_AI_APP_KEY, LINK_AI_APP_CODE, APP_ID, APP_SECRET } = process.env;

export const getGptConfig = () => gptConfig as GPTConfig;
export const getMjConfig = () => mjConfig as MJConfig;

const appId = APP_ID; // 替换为你的微信公众号的 appId
const appSecret = APP_SECRET; // 替换为你的微信公众号的 appSecret

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
      expire_seconds: 2592000,
      action_name: 'QR_STR_SCENE',
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
export const getBonus = (strategy: 'subscribe' | 'order') => {
  // 获取当前定义的奖励类型
  const bonusType = BonusStrategy[strategy]?.bonusType ?? BonusTypeEnum.Integral;
  return {
    type: bonusType,
    bonus: strategy === 'subscribe' ? 10 : 500
  };
};

const MAX_MESSAGE_LENGTH = 600;

const splitMessage = (longMessage: string) => {
  const messageParts = [];
  let start = 0;

  while (start < longMessage.length) {
    // 计算结束位置，接近 MAX_CHINESE_LENGTH
    let end = start + MAX_MESSAGE_LENGTH;

    // 如果 end 超过消息长度，调整 end 位置
    if (end >= longMessage.length) {
      end = longMessage.length;
    } else {
      // 向前寻找最近的合适的分隔符进行分割
      const segment = longMessage.slice(start, end + 1); // 取 end + 1 以包含当前字符
      const lastPunctuationIndex = Math.max(
        segment.lastIndexOf('。'),
        segment.lastIndexOf('！'),
        segment.lastIndexOf('？'),
        segment.lastIndexOf('\n') // 也可以在换行符处分段
      );

      if (lastPunctuationIndex >= 0) {
        end = start + lastPunctuationIndex + 1;
      } else {
        // 如果没有找到合适的分隔符，强制使用当前的 end 位置
        end = Math.min(start + MAX_MESSAGE_LENGTH, longMessage.length);
      }
    }

    // 确保每段的结束处不会在中文逗号处分段
    const segment = longMessage.slice(start, end).trim();
    if (segment.endsWith('，')) {
      const lastCommaIndex = segment.lastIndexOf('，');
      if (lastCommaIndex > 0) {
        end = start + lastCommaIndex + 1;
      }
    }

    // 截取消息并存入数组
    const messagePart = longMessage.slice(start, end).trim();
    messageParts.push(messagePart);
    start = end;
  }

  return messageParts;
};

export const sendMessageAPI = async (userId: string, text: string) => {
  try {
    const response = await axios.post('http://api.weixin.qq.com/cgi-bin/message/custom/send', {
      touser: userId,
      msgtype: 'text',
      text: { content: text }
    });
    console.log('sendMessage response:', response.data);
  } catch (error) {
    console.log('【sendMessage】 error: ', error);
  }
};

export const sendMessage = async (userId: string, text: string): Promise<void> => {
  const messageParts = splitMessage(text);

  for (const part of messageParts) {
    await sendMessageAPI(userId, part);
  }
};

export const sendImage = async (userId: string, mediaId: string) => {
  try {
    const response = await axios.post('http://api.weixin.qq.com/cgi-bin/message/custom/send', {
      touser: userId,
      msgtype: 'image',
      image: { media_id: mediaId }
    });
    console.log('【sendImage】 response:', response.data);
  } catch (error) {
    console.log('【sendImage】 error: ', error);
  }
};

export const mergeImages = async (image1Path: string, image2Path: string, outputImagePath: string) => {
  try {
    const [image1, image2] = await Promise.all([Jimp.read(image1Path), Jimp.read(image2Path)]);

    const combinedWidth = image2.bitmap.width;
    console.log('combinedWidth ', combinedWidth);
    const combinedHeight = image2.bitmap.height;

    console.log('combinedHeight ', combinedHeight);

    image1.resize(308, 308); // 也可以使用 image.resize(Jimp.AUTO, height) 保持宽高比

    // 设置压缩质量（仅适用于 JPEG 图片）
    image1.quality(100); // 质量范围是 0-100

    const combinedImage = new Jimp(combinedWidth, combinedHeight);

    console.log('combinedImage:  ', combinedImage);
    combinedImage.composite(image2, 0, 0);
    combinedImage.composite(image1, 890, 1950);

    await combinedImage.writeAsync(outputImagePath);

    return outputImagePath;
  } catch (error) {
    console.error('Error merging images:', error);
    return '';
  }
};

function generateRandomString(length = 3) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export const generateOrderNumber = (level: VipLevel, product: Product) => {
  return `${Date.now()}_${generateRandomString()}_${level}_${product}`;
};

export const getLevelAndProduct = (tradeNo: string) => {
  const arr = tradeNo.split('_');
  const level = arr[arr.length - 2] as VipLevel;
  const product = arr[arr.length - 1] as Product;
  return { level, product };
};

export const getTextReplyUrl = (reply: string, display?: string) => {
  const msgMenUid = Date.now() + '_' + Math.floor(100000 + Math.random() * 900000);
  return `<a href="weixin://bizmsgmenu?msgmenucontent=${reply}&msgmenuid=${msgMenUid}">${display ?? reply}</a>`;
};

export const getOrderUrl = (name: string, params?: OrderBody) => {
  const baseUrl = 'https://wechat.ai-xiaowu.com/authorize';

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
      return date.clone().add(31, 'days');
    case VipLevel.Quarter:
      return date.clone().add(93, 'days');
    case VipLevel.Year:
      return date.clone().add(366, 'days');
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
    '你好，朋友！',
    '👩🏻‍💻 我是你的助理小吴，我可以：',
    '🥇 让排名第一的AI工具，成为你的微信好友',
    `👉🏻 ${getTextReplyUrl('获取助理小吴AI群')}`,
    `👉🏻 ${getTextReplyUrl('获取Dan')}`,
    `官网 | <a href="${officialWebsite}">ai-xiaowu.com</a>         `
  ];
  return reply.join('\n\n');
};

export const getActivityRules = () => `<a href="${activityRulesUrl}">助理小吴AI群分享有礼活动规则</a>`;

export const getDanText = async () => {
  const danProduct = await sqProduct.findOne({ where: { is_online: true, name: Product.Dan } });

  if (!danProduct) {
    const reply = [
      'Dan',
      '🔥 ' + getOrderUrl(PayBody[Product.Dan][VipLevel.Year], { level: VipLevel.Year, product: Product.Dan }),
      '👉🏻 ' + getOrderUrl(PayBody[Product.Dan][VipLevel.Quarter], { level: VipLevel.Quarter, product: Product.Dan }),
      '👉🏻 ' + getOrderUrl(PayBody[Product.Dan][VipLevel.Month], { level: VipLevel.Month, product: Product.Dan })
    ];
    return reply.join('\n\n');
  }

  const { month_fee, quarter_fee, year_fee } = danProduct.toJSON();

  const yearFee = isNumber(year_fee) ? Number(year_fee) * 100 : PayLevel[Product.Group][VipLevel.Year];
  const monthFee = isNumber(month_fee) ? Number(month_fee) * 100 : PayLevel[Product.Group][VipLevel.Month];
  const quarterFee = isNumber(quarter_fee) ? Number(quarter_fee) * 100 : PayLevel[Product.Group][VipLevel.Quarter];

  const yearText = `年卡 ${yearFee / 100}元/年（${Math.floor(yearFee / 100 / 12)}元/月）`;
  const quarterText = `季卡 ${quarterFee / 100}元/季（${Math.floor(quarterFee / 100 / 3)}元/月）`;
  const monthText = `月卡 ${monthFee / 100}元/月`;

  const reply = [
    'Dan',
    '🔥 ' + getOrderUrl(yearText, { level: VipLevel.Year, product: Product.Dan }),
    '👉🏻 ' + getOrderUrl(quarterText, { level: VipLevel.Quarter, product: Product.Dan }),
    '👉🏻 ' + getOrderUrl(monthText, { level: VipLevel.Month, product: Product.Dan })
  ];
  return reply.join('\n\n');
};

export const getAiGroupText = async () => {
  const groupProduct = await sqProduct.findOne({ where: { is_online: true, name: Product.Group } });

  if (!groupProduct) {
    const reply = [
      '助理小吴AI群',
      '🔥 ' + getOrderUrl(PayBody[Product.Group][VipLevel.Year], { level: VipLevel.Year, product: Product.Group }),
      '👉🏻 ' + getTextReplyUrl('获取10份年卡', '获取10份年卡 3980元/年'),
      '👉🏻 ' +
        getOrderUrl(PayBody[Product.Group][VipLevel.Quarter], { level: VipLevel.Quarter, product: Product.Group }),
      '👉🏻 ' + getOrderUrl(PayBody[Product.Group][VipLevel.Month], { level: VipLevel.Month, product: Product.Group }),
      '👉🏻 ' + getTextReplyUrl('企业购买/赠好友')
    ];
    return reply.join('\n\n');
  }

  const { month_fee, quarter_fee, year_fee } = groupProduct.toJSON();

  const yearFee = isNumber(year_fee) ? Number(year_fee) * 100 : PayLevel[Product.Group][VipLevel.Year];
  const monthFee = isNumber(month_fee) ? Number(month_fee) * 100 : PayLevel[Product.Group][VipLevel.Month];
  const quarterFee = isNumber(quarter_fee) ? Number(quarter_fee) * 100 : PayLevel[Product.Group][VipLevel.Quarter];

  const yearText = `年卡 ${yearFee / 100}元/年（${Math.floor(yearFee / 100 / 12)}元/月）`;
  const quarterText = `季卡 ${quarterFee / 100}元/季（${Math.floor(quarterFee / 100 / 3)}元/月）`;
  const monthText = `月卡 ${monthFee / 100}元/月`;

  const reply = [
    '助理小吴AI群',
    '🔥 ' + getOrderUrl(yearText, { level: VipLevel.Year, product: Product.Group }),
    '👉🏻 ' + getTextReplyUrl('获取10份年卡', '获取10份年卡 3980元/年'),
    '👉🏻 ' + getOrderUrl(quarterText, { level: VipLevel.Quarter, product: Product.Group }),
    '👉🏻 ' + getOrderUrl(monthText, { level: VipLevel.Month, product: Product.Group }),
    '👉🏻 ' + getTextReplyUrl('企业购买/赠好友')
  ];
  return reply.join('\n\n');
};

export const sendDanText = async (userId: string) => {
  const danText = ['Dan', `👉🏻 <a href="${danUrl}">Dan是什么？</a>`, `👉🏻 ${getTextReplyUrl('马上抢（Dan）', '马上抢')}`];
  await sendMessage(userId, danText.join('\n\n'));
};

export const sendAiGroupText = async (userId: string) => {
  await sendMessage(userId, [`助理小吴AI群`, `${getTextReplyUrl('马上抢（助理小吴AI群）', '👉🏻 马上抢')}`].join('\n\n'));
  await sendAIGroupIntroduce(userId);
};

export const sendServiceQRcode = async (userId: string) => {
  await sendImage(userId, 'FLs_fBoOlhvVW6z2cE128hoYUlCcEPAXZGev6Fbjn8UQQmPUFimia3nMO59EXMIf');
};

export const sendAIGroupIntroduce = async (userId: string) => {
  await sendImage(userId, 'FLs_fBoOlhvVW6z2cE128sqSGAIW2Td3L1aM0tns8nE93OlokQr790C8-SoLKujF');
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
    const url = `https://api.link-ai.tech/v1/audio/transcriptions`;
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

    console.log('【voiceToText】:', '语音转文本');
    const res = await axios.post(url, formData, { headers, timeout: 60000 });

    console.log('【voiceToText】 转换结果: ', res.data);

    if (res.status === 200) return res.data.text;
    return null;
  } catch (e) {
    console.log('voiceToText error: ', e);
    return null;
  }
};

export const textToVoice = async (input: string): Promise<string | null> => {
  try {
    const url = `https://api.link-ai.tech/v1/audio/speech`;
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

export const isNumber = (value: any) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

/** 下发输入状态 */
export const typing = async (userId: string) => {
  try {
    console.log('【下发输入状态】');
    const url = `http://api.weixin.qq.com/cgi-bin/message/custom/typing`;
    const data = { touser: userId, command: 'Typing' };
    await axios.post(url, data);
  } catch (error) {
    console.error(`Failed to send voice message`);
  }
};

/** 取消输入状态 */
export const cancelTyping = async (userId: string) => {
  try {
    console.log('【取消输入状态】');
    const url = `http://api.weixin.qq.com/cgi-bin/message/custom/typing`;
    const data = { touser: userId, command: 'CancelTyping' };
    await axios.post(url, data);
  } catch (error) {
    console.error(`Failed to send voice message`);
  }
};

export const extractChannel = (url: string): string | undefined => {
  const match = url.match(/channel=([^&]+)/);
  return match ? match[1] : undefined;
};

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

export const extractBetween = (str: string, start: string, end: string): string | undefined => {
  const escapedStart = escapeRegExp(start);
  const escapedEnd = escapeRegExp(end);
  const regex = new RegExp(`${escapedStart}(.*?)${escapedEnd}`);
  const match = str.match(regex);
  return match ? match[1] : undefined;
};
export const getBeforeQuestionMark = (str: string): string | null => {
  const match = str.match(/^(.*?)\?/);
  return match ? match[1] : str;
};
