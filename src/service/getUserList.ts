import axios from 'axios';
import { TextMessage } from '../types';

const { APP_ID, APP_SECRET } = process.env;

const getAccessToken = async () => {
  try {
    // 获取 access_token
    const res = await axios.get(
      `http://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`
    );

    console.log('获取 access token ', res);
    const { access_token } = res.data as any;
    return access_token;
  } catch (error) {
    console.log('getAccessToken error', error);
    return '';
  }
};

export const getUserList = async (message: TextMessage) => {
  try {
    const access_token = getAccessToken();
    if (!access_token) return;
    const response = await axios.get(
      `https://api.weixin.qq.com/cgi-bin/user/get?access_token=${access_token}&next_openid=oHBuD6awi6Jsb3cckL3f93VO1TZA`
    );

    console.log(response.data);
  } catch (error) {
    console.log('getUserList error', error);
  }
};
