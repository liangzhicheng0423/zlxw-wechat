import axios from 'axios';
import fs from 'fs';
import { MessageHandler, WeChatMessage } from './types';

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

const uploadUrl = 'https://api.weixin.qq.com/cgi-bin/material/add_material';

// 上传永久图片素材函数
export const uploadPermanentImageMedia = async (filePath: string) => {
  try {
    // 构造上传参数
    const formData = { media: fs.createReadStream(filePath) };

    // 发送请求
    const response = await axios.post(uploadUrl, formData, {
      params: {
        type: 'image' // 媒体文件类型，图片类型为 image
      },
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    // 返回上传结果
    return response.data;
  } catch (error: any) {
    console.error('Error uploading image:', error.message);
    throw error;
  }
};

// 微信公众号（WeChat Official Account）的API允许开发者上传永久素材，如图片、视频、音频、图文消息等。要使用Node.js来上传永久素材，你需要先获取到微信公众号的`access_token`，然后使用这个`access_token`来调用上传永久素材的API。

// 以下是一个简单的Node.js代码示例，用于上传永久图片素材：

// ```javascript
// const axios = require('axios');
// const fs = require('fs');
// const querystring = require('querystring');

// // 微信公众号配置信息
// const APPID = 'YOUR_APPID';
// const APPSECRET = 'YOUR_APPSECRET';

// // 获取access_token
// async function getAccessToken() {
//     const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${APPSECRET}`;
//     const response = await axios.get(url);
//     return response.data.access_token;
// }

// // 上传永久图片素材
// async function uploadImage(accessToken, filePath) {
//     const url = `https://api.weixin.qq.com/cgi-bin/material/add_material?access_token=${accessToken}&type=image`;
//     const formData = new FormData();
//     formData.append('media', fs.createReadStream(filePath));

//     const response = await axios.post(url, formData, {
//         headers: {
//             ...formData.getHeaders(),
//             'Content-Type': `multipart/form-data; boundary=${formData._boundary}`
//         }
//     });
//     return response.data;
// }

// // 主函数
// async function main() {
//     try {
//         const accessToken = await getAccessToken();
//         const imagePath = './path/to/your/image.jpg'; // 替换为你的图片路径
//         const imageResult = await uploadImage(accessToken, imagePath);
//         console.log(imageResult);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }

// main();
// ```
// **注意**：

// 1. 请将`YOUR_APPID`和`YOUR_APPSECRET`替换为你的微信公众号的AppID和AppSecret。
// 2. 请确保你已经安装了`axios`和`form-data`这两个Node.js包。你可以使用`npm install axios form-data`来安装它们。
// 3. 上传的文件路径（`imagePath`）需要替换为你实际要上传的图片的路径。
// 4. 这个示例只展示了如何上传图片素材。如果你需要上传其他类型的素材（如视频、音频、图文消息等），你需要修改`type`参数和文件处理部分来适应不同的API要求。
// 5. 微信公众号的API有调用频率限制，请确保你的调用不会超出限制。同时，`access_token`也有有效期，过期后需要重新获取。在实际应用中，你可能需要实现一个缓存机制来存储和更新`access_token`。
