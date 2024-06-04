import axios from 'axios';
import fs from 'fs';
import { BonusStrategy, ScanLadderRewards, SubscribeLadderRewards } from './constant';
import { BonusTypeEnum, WeChatMessage } from './types';

const request = require('request');

export const getShareQRcode = async () => {
  console.log('请求');
  const response = await axios.post('https://api.weixin.qq.com/cgi-bin/qrcode/create', {
    action_name: 'QR_LIMIT_STR_SCENE',
    action_info: { scene: { scene_str: 'test' } }
  });

  const res = response.data;
  console.log('res', res);
};

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

export const sendMessage = (userId: string) => {
  return new Promise((resolve, reject) => {
    request(
      {
        method: 'POST',
        url: 'http://api.weixin.qq.com/cgi-bin/message/custom/send',
        // 资源复用情况下，参数from_appid应写明发起方appid
        // url: 'http://api.weixin.qq.com/cgi-bin/message/custom/send?from_appid=wxxxxx'
        body: JSON.stringify({
          touser: userId, // 一般是消息推送body的FromUserName值，为用户的openid
          msgtype: 'text',
          text: {
            content: 'Hello World'
          }
        })
      },
      function (_: any, response: any) {
        console.log('接口返回内容', response.body);
        resolve(JSON.parse(response.body));
      }
    );
  });
};
