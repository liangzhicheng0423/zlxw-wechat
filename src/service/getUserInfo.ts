import axios from 'axios';
import { User } from '../mysqlModal/user';

export const getUserInfo = async (req: any, res: any) => {
  const code = req.query.code;

  const { APP_ID, APP_SECRET } = process.env;

  try {
    console.info('【getUserInfo】 通过code获取access_token和openid');
    // 通过code获取access_token和openid
    const response = await axios.get(
      `http://api.weixin.qq.com/sns/oauth2/access_token?appid=${APP_ID}&secret=${APP_SECRET}&code=${code}&grant_type=authorization_code`
    );

    const { access_token, openid } = response.data;
    console.info('【getUserInfo】 access_token, openid', { access_token }, { openid });

    const [user] = await User.findOrCreate({
      where: { user_id: openid },
      defaults: { subscribe_status: true }
    });

    console.info('【getUserInfo】 系统中用户昵称', user?.toJSON().nickname);
    if (user?.toJSON().nickname) return;

    // 使用access_token和openid获取用户信息
    const userInfo = await axios.get(
      `http://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`
    );

    console.info('【getUserInfo】 使用access_token和openid获取用户信息', userInfo.data);

    if (userInfo.data.openid === openid) {
      console.info('【getUserInfo】 更新用信息');
      await user?.update({ nickname: userInfo.data.nickname, weixin_info: JSON.stringify(userInfo.data) });
    }

    res.json(userInfo.data);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).send('Internal Server Error');
  }
};
