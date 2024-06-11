import axios from 'axios';
import { PayBody } from '../constant';
import { WeChatMessage } from '../types';
import { generateOrderNumber } from '../util';

export const unifiedorder = async (req: any, res: any) => {
  const type: { type: 'year' | 'quarter' | 'month' } = req.body;

  let body = '';
  let total_fee = 0;
  switch (type.type) {
    case 'year':
      body = PayBody.year;
      total_fee = 89900;
      break;
    case 'quarter':
      body = PayBody.quarter;
      total_fee = 29900;
      break;
    case 'month':
      body = PayBody.month;
      total_fee = 12900;
      break;
    default:
      break;
  }

  console.log('type', type);
  console.log('total_fee', total_fee);

  const ip = req.headers['x-forwarded-for']; // 小程序直接callcontainer请求会存在
  const openid = req.headers['x-wx-openid']; // 小程序直接callcontainer请求会存在

  console.log('openid: ', openid);

  const option = {
    body,
    out_trade_no: generateOrderNumber(),
    sub_mch_id: '1678905103', // 微信支付商户号
    total_fee: 1,
    openid: openid, // 用户唯一身份ID
    spbill_create_ip: ip, // 用户客户端IP地址
    env_id: req.headers['x-wx-env'], // 接收回调的环境ID
    callback_type: 2, // 云托管服务接收回调，填2
    container: {
      service: req.headers['x-wx-service'], // 回调的服务名称
      path: '/payRes' // 回调的路径
    }
  };

  const response = await axios.post(`http://api.weixin.qq.com/_/pay/unifiedorder`, option);

  res.send(response.data);
};

export const unifiedorderCb = async (req: any, res: any) => {
  const message: WeChatMessage = req.body;
  console.log('unifiedorderCb: ', message);
};
