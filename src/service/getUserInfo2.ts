import axios from 'axios';
import { User } from '../mysqlModal/user';

const getAccessToken = async () => {
  try {
    const { APP_ID, APP_SECRET } = process.env;
    const response = await axios.get(
      `http://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`
    );
    console.log(response.data);
    const { access_token } = response.data;
    return access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

export const getUserInfo2 = async (req: any, res: any) => {
  const openid = req.query.openid;

  const accessToken = getAccessToken();

  console.log('【getUserInfo2】 accessToken: ', accessToken);

  try {
    // console.info('【getUserInfo】 通过code获取access_token和openid');
    // // 通过code获取access_token和openid
    // const response = await axios.get(
    //   `http://api.weixin.qq.com/sns/oauth2/access_token?appid=${APP_ID}&secret=${APP_SECRET}&code=${code}&grant_type=authorization_code`
    // );

    // const { access_token, openid } = response.data;
    // console.info('【getUserInfo】 access_token, openid', { access_token }, { openid });

    // 使用access_token和openid获取用户信息
    const response = await axios.get(
      `http://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`
    );

    console.info('【getUserInfo】 使用access_token和openid获取用户信息', response.data);

    res.json(response.data);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).send('Internal Server Error');
  }
};
