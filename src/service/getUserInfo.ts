import axios from 'axios';
import { User } from '../mysqlModal/user';

export const getUserInfo = async (req: any, res: any) => {
  const code = req.query.code;

  const { APP_ID, APP_SECRET } = process.env;

  try {
    console.log('APP_SECRET: ', APP_SECRET);
    // 通过code获取access_token和openid
    const response = await axios.get(
      `http://api.weixin.qq.com/sns/oauth2/access_token?appid=${APP_ID}&secret=${APP_SECRET}&code=${code}&grant_type=authorization_code`
    );

    console.log('response.data: ', response.data);
    const { access_token, openid } = response.data;

    // 使用access_token和openid获取用户信息
    const userInfo = await axios.get(
      `http://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`
    );

    const user = await User.findOne({ where: { user_id: openid } });

    console.log('openid: ', userInfo.data.openid, openid);
    if (userInfo.data.openid === openid) {
      console.log('user: ', !!user);
      user?.update({ nickname: userInfo.data.nickname, weixin_info: JSON.stringify(userInfo.data) });
    }

    console.log('userInfo.data: ', userInfo.data);
    res.json(userInfo.data);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).send('Internal Server Error');
  }
};
