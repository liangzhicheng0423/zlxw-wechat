import axios from 'axios';

export const getShareQRcode = async () => {


  console.log('请求')
    const response = await axios.post(
      'https://api.weixin.qq.com/cgi-bin/qrcode/create',
      {"action_name": "QR_LIMIT_STR_SCENE", "action_info": {"scene": {"scene_str": "test"}}},
    );

    const res = response.data;
    console.log('res', res)
}

const appId = 'wxd00871cb6294c274';  // 替换为你的微信公众号的 appId
const appSecret = 'your_app_secret';  // 替换为你的微信公众号的 appSecret

// 获取 access_token
async function getAccessToken() {
  try {
    const response = await axios.get(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`);
    const { access_token } = response.data;
    return access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}


// 生成带参数的二维码
export const createQRCode = async(sceneStr: string) =>{
  try {
    // const accessToken = await getAccessToken();
    const qrCodeData = {
      "expire_seconds": 604800,  // 二维码有效期，单位秒（最大为2592000，默认为永久二维码）
      "action_name": "QR_STR_SCENE",  // 临时二维码（字符串参数值）
      "action_info": {
        "scene": {
          "scene_str": sceneStr
        }
      }
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
}