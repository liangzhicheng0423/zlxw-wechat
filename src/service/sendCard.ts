import axios from 'axios';
import moment from 'moment';
import { Product, TextMessage, VipLevel } from '../types';
import { getOrderUrlForTemp } from '../util';

export const sendCard = async (message: TextMessage, res: any) => {
  try {
    const url = getOrderUrlForTemp({ level: VipLevel.Year, product: Product.Group, boon: true });

    // 发送请求
    await axios.post('http://api.weixin.qq.com/cgi-bin/message/template/send', {
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
  } catch (error) {
    console.log('发送卡片 ', error);
  }
};
