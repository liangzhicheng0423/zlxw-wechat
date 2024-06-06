import axios from 'axios';
import fs from 'fs';
import Jimp from 'jimp';
import { BonusStrategy, ScanLadderRewards, SubscribeLadderRewards } from './constant';
import { BonusTypeEnum, WeChatMessage } from './types';

const appId = 'xxx'; // 替换为你的微信公众号的 appId
const appSecret = 'xxx'; // 替换为你的微信公众号的 appSecret

// 获取 access_token
export const getAccessToken = async () => {
  try {
    const response = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
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

    const response = await axios.post(`https://api.weixin.qq.com/cgi-bin/qrcode/create`, qrCodeData);
    const { ticket } = response.data;

    // 通过 ticket 换取二维码
    const qrCodeUrl = `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
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

export const downloadImage = (img_url: string, user_id: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 使用axios下载图片
    axios
      .get(img_url, {
        responseType: 'arraybuffer',
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      })
      .then(response => {
        const path = `./tmp/image_${user_id}_${Date.now()}.jpg`;
        fs.writeFileSync(path, Buffer.from(response.data, 'binary'));
        resolve(path);
      })
      .catch(error => {
        console.error(`[WX] Error downloading image: ${error}`);
        reject();
      });
  });
};

// 上传临时图片素材函数
export const uploadPermanentImageMedia = async (filePath: string) => {
  const uploadUrl = 'https://api.weixin.qq.com/cgi-bin/media/upload';

  try {
    // 构造上传参数
    const formData = { media: fs.createReadStream(filePath) };

    // 发送请求
    const response = await axios.post(uploadUrl, formData, {
      // 媒体文件类型，图片类型为 image
      params: { type: 'image' },
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // 返回上传结果
    return response.data;
  } catch (error: any) {
    console.error('Error uploading image:', error.message);
    throw error;
  }
};

// 获取用户奖励
export const getBonus = (currentCount: number, strategy: 'subscribe' | 'scan') => {
  // 获取当前定义的奖励类型
  const bonusType = BonusStrategy[strategy]?.bonusType ?? BonusTypeEnum.Integral;

  const LadderRewards = strategy === 'subscribe' ? SubscribeLadderRewards : ScanLadderRewards;

  const currentBonus = LadderRewards.find(v => v.level >= currentCount);
  return {
    type: bonusType,
    bonus: currentBonus?.[bonusType] ?? 0
  };
};

export const sendMessage = async (userId: string, text?: string) => {
  await axios.post('http://api.weixin.qq.com/cgi-bin/message/custom/send', {
    touser: userId,
    msgtype: 'text',
    text: { content: text ?? '获得新积分' }
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
