import axios from 'axios';
import moment from 'moment';
import { Product, TextMessage, VipLevel } from '../types';
import { getOrderUrlForTemp } from '../util';

const getAccessToken = async () => {
  console.info('【getUserInfo】 通过code获取access_token和openid');

  const { APP_ID, APP_SECRET } = process.env;
  // 通过code获取access_token和openid
  const response = await axios.get(
    `https://api.weixin.qq.com/cgi-bin/user/get?access_token=ACCESS_TOKEN&next_openid=oHBuD6awi6Jsb3cckL3f93VO1TZA`
  );
};

export const getUserList = async (message: TextMessage) => {
  const url = getOrderUrlForTemp({ level: VipLevel.Year, product: Product.Group, boon: true });
  try {
    // 发送请求
    const response = await axios.post('http://api.weixin.qq.com/cgi-bin/message/template/send', {
      touser: message.FromUserName,
      template_id: 'j8mwUuaIWpjDbcSicc6RspTpz3m7ibPgHWDtG634BRI',
      url,
      data: {
        thing3: {
          value: '已成功获取惊喜彩蛋'
        },
        thing5: {
          value: '用户验证通过'
        },
        time9: {
          value: moment().add(8, 'hours').format('YYYY-MM-DD HH:mm')
        }
      }
    });
    console.log(response.data);
  } catch (error) {
    console.log('error: ', error);
  }
};
