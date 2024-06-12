import axios from 'axios';
import moment from 'moment';
import { PayBody, PayLevel } from '../constant';
import { Order } from '../mysqlModal/order';
import { User } from '../mysqlModal/user';
import { OrderBody, VipLevel, WeChatPayCallback } from '../types';
import { generateOrderNumber, getExpireDate, getLevelAndProduct, sendMessage, sendServiceQRcode } from '../util';
import { award } from './award';

/** 下单 */
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

  try {
    const response = await axios.post(`http://api.weixin.qq.com/_/pay/unifiedorder`, option);
    res.send(response.data);
  } catch (error) {}
};

/** 支付成功 */
export const unifiedorderCb = async (req: any, res: any) => {
  const message: WeChatPayCallback = req.body;

  const userId = message.subOpenid;

  const tradeNo = message.outTradeNo;

  const { level, product } = getLevelAndProduct(tradeNo);

  if (message.resultCode !== 'SUCCESS' || message.returnCode !== 'SUCCESS') return;

  let is_award = false;

  // 已有订单号
  const beforeOrder = await Order.findOne({ where: { user_id: userId, out_trade_no: tradeNo } });
  if (beforeOrder) {
    console.info('订单号已经存在');
    return;
  }

  try {
    // 奖励其父用户
    const [user] = await User.findOrCreate({
      where: { user_id: userId },
      defaults: { subscribe_status: true }
    });

    const formatUser = user?.toJSON();

    if (formatUser?.p_id) {
      const p_id = formatUser.p_id.split('_').at(-1);
      const shareUser = await User.findOne({ where: { user_id: p_id } });
      const formatShareUser = shareUser?.toJSON();

      if (formatShareUser && !formatUser.is_award) {
        console.info('奖励父用户');
        await award(formatShareUser.user_id, 'order');
        is_award = true;
      }
    }

    // 更新用户表
    await user.update({ is_award, is_vip: true });

    // 新增订单
    const expire_date = getExpireDate(moment(), level as VipLevel);

    console.info('创建订单');
    await Order.create({
      user_id: userId,
      product: product,
      vip_level: level,
      out_trade_no: tradeNo,
      fee: message.totalFee,
      expire_date
    });

    await sendMessage(userId, '会员开通成功，请扫码添加客服，并向客服发送“激活”');
    await sendServiceQRcode(userId);

    res.send({ code: 'SUCCESS', message: '' });
  } catch (error) {}
};
