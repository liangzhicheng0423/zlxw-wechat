import axios from 'axios';
import moment from 'moment';
import { PayBody, PayLevel } from '../constant';
import { User } from '../mysqlModal/user';
import { OrderBody, Product, VipLevel, WeChatPayCallback } from '../types';
import { generateOrderNumber, getExpireDate, getLevelAndProduct, sendMessage } from '../util';
import { award } from './award';

export const unifiedorder = async (req: any, res: any) => {
  const { level, product } = req.body as OrderBody;

  let body = '';
  let total_fee = 0;
  switch (level) {
    case VipLevel.Ten:
      body = PayBody[product][VipLevel.Ten];
      total_fee = PayLevel[product][VipLevel.Ten];
      break;

    case VipLevel.Year:
      body = PayBody[product][VipLevel.Year];
      total_fee = PayLevel[product][VipLevel.Year];
      break;

    case VipLevel.Quarter:
      body = PayBody[product][VipLevel.Quarter];
      total_fee = PayLevel[product][VipLevel.Quarter];
      break;

    case VipLevel.Month:
      body = PayBody[product][VipLevel.Month];
      total_fee = PayLevel[product][VipLevel.Month];
      break;

    default:
      break;
  }

  const ip = req.headers['x-forwarded-for']; // 小程序直接callcontainer请求会存在
  const openid = req.headers['x-wx-openid']; // 小程序直接callcontainer请求会存在
  const env_id = req.headers['x-wx-env'];

  const option = {
    body,
    out_trade_no: generateOrderNumber(level, product),
    sub_mch_id: '1678905103', // 微信支付商户号
    total_fee: 1,
    openid, // 用户唯一身份ID
    spbill_create_ip: ip, // 用户客户端IP地址
    env_id, // 接收回调的环境ID
    callback_type: 2, // 云托管服务接收回调，填2
    container: {
      service: req.headers['x-wx-service'], // 回调的服务名称
      path: '/payRes' // 回调的路径
    }
  };

  console.log('option ======', option);

  const response = await axios.post(`http://api.weixin.qq.com/_/pay/unifiedorder`, option);

  res.send(response.data);
};

export const unifiedorderCb = async (req: any, res: any) => {
  const message: WeChatPayCallback = req.body;

  console.log('支付成功的回调参数:', message);

  const userId = message.subOpenid;

  const tradeNo = message.outTradeNo;

  console.log('--------- 1');
  const { level } = getLevelAndProduct(tradeNo);
  console.log('--------- 2', level);

  if (message.resultCode !== 'SUCCESS' && message.returnCode !== 'SUCCESS') return;

  console.log('--------- 3');

  let is_award = false;

  // 奖励其父用户
  const user = await User.findOne({ where: { user_id: userId } });

  const formatUser = user?.toJSON();
  console.log('--------- 4', formatUser);

  if (formatUser?.p_id) {
    const shareUser = await User.findOne({ where: { user_id: formatUser.p_id } });
    const formatShareUser = shareUser?.toJSON();
    console.log('--------- 4.5', formatShareUser);

    if (formatShareUser && !formatUser.is_award) {
      await award(formatShareUser.user_id, 'order');
      is_award = true;
    }
  }

  const date = formatUser?.expire_date ? moment(formatUser.expire_date) : moment();

  // 创建用户
  await User.upsert({
    user_id: userId,
    p_id: formatUser?.p_id ?? null,
    is_award,
    is_vip: true,
    vip_level: level,
    expire_date: getExpireDate(date, level as VipLevel),
    subscribe_status: true
  });

  console.log('--------- 5', getExpireDate(date, level as VipLevel));

  await sendMessage(userId, '会员开通成功，请扫码添加客服，并向客服发送“激活”');

  /** TODO: 后续要更换成图片 */
  res.send({
    ToUserName: 'gh_c1c4f430f4a9',
    FromUserName: userId,
    CreateTime: Date.now(),
    MsgType: 'text',
    Content: '【客服二维码】'
  });
};
