import axios from 'axios';
import { WeChatMessage } from '../types';

export const unifiedorder = async (req: any, res: any) => {
  const message: WeChatMessage = req.body;

  console.log('message', message);
  const ip = req.headers['x-forwarded-for']; // 小程序直接callcontainer请求会存在
  const openid = req.headers['x-wx-openid']; // 小程序直接callcontainer请求会存在

  console.log('openid: ', openid);

  const option = {
    body: '测试', // 订单描述
    out_trade_no: `WERUNMP_${Date.now()}`, // 自定义订单号
    sub_mch_id: '1678905103', // 微信支付商户号
    total_fee: 1, // 金额，单位：分
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
