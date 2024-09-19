import axios from 'axios';
import { difference } from 'lodash';
import { Op } from 'sequelize';
import { InvitationCode } from '../mysqlModal/InvitationCode';
import { User } from '../mysqlModal/user';
import { TextMessage } from '../types';

const { APP_ID, APP_SECRET } = process.env;

const getAccessToken = async () => {
  try {
    // 获取 access_token
    const res = await axios.get(
      `http://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`
    );

    const { access_token } = res.data as any;

    console.log('access_token: ', access_token);
    return access_token;
  } catch (error) {
    console.log('getAccessToken error');
    return '';
  }
};

export const getUserList = async (message: TextMessage) => {
  try {
    const access_token = getAccessToken();
    if (!access_token) return;
    const response = await axios.get(`http://api.weixin.qq.com/cgi-bin/user/get`);

    console.log('获取用户列表：', response.data.data.openid);

    const openid = response.data.data.openid;
    console.log('获取到的用户 ids', openid.length);

    const users = await User.findAll({ where: { user_id: { [Op.in]: openid } } });
    const ids = users.map(v => v.toJSON().user_id);
    console.log('找到了的用户 ids', ids.length);

    const updateUsers = difference(openid, ids);
    console.log('要更新的用户列表: ', updateUsers.length);

    const codes = await InvitationCode.findAll({
      where: { status: false, send: false },
      limit: updateUsers.length,
      order: [['createdAt', 'DESC']]
    });

    const formatCodes = codes.map(v => v.toJSON().code);
    console.log('找到了的邀请码：', formatCodes.length);

    // 更新数据库
    await User.bulkCreate(
      updateUsers.map((v, i) => ({
        xiaowu_id: formatCodes[i],
        user_id: v,
        p_id: 'oHBuD6VaIGdSfpsZsYJRinjYBS7A',
        subscribe_status: true,
        is_find: true
      }))
    );
  } catch (error) {
    console.log('getUserList error', error);
  }
};
