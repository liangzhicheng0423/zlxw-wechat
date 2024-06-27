import axios from 'axios';
import moment, { Moment } from 'moment';
import { PayBody, PayLevel } from '../constant';
import { encrypt } from '../crypto';
import { InvitationCode } from '../mysqlModal/InvitationCode';
import { ClearanceCode } from '../mysqlModal/clearanceCode';
import { Order } from '../mysqlModal/order';
import { User } from '../mysqlModal/user';
import { updateUserVipStatus } from '../redis';
import { OrderBody, Product, VipLevel, WeChatPayCallback } from '../types';
import {
  generateOrderNumber,
  getExpireDate,
  getLevelAndProduct,
  sendImage,
  sendMessage,
  sendServiceQRcode,
  uploadTemporaryMedia
} from '../util';
import { award } from './award';

/** 下单 */
export const unifiedorder = async (req: any, res: any) => {
  const { level, product } = req.body as OrderBody;

  console.info('用户下单:', level, product);

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
    total_fee: total_fee,
    openid, // 用户唯一身份ID
    spbill_create_ip: ip, // 用户客户端IP地址
    env_id, // 接收回调的环境ID
    callback_type: 2, // 云托管服务接收回调，填2
    container: {
      service: req.headers['x-wx-service'], // 回调的服务名称
      path: '/payRes' // 回调的路径
    }
  };

  console.info('用户下单: option', option);

  try {
    const response = await axios.post(`http://api.weixin.qq.com/_/pay/unifiedorder`, option);
    res.send(response.data);
  } catch (error) {
    console.error(error);
  }
};

/** 支付成功 */
export const unifiedorderCb = async (req: any, res: any) => {
  try {
    const message: WeChatPayCallback = req.body;

    console.info('支付成功回调:', message);

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

    // 奖励其父用户
    const [user] = await User.findOrCreate({
      where: { user_id: userId },
      defaults: { subscribe_status: true }
    });

    const formatUser = user?.toJSON();

    const update: { expire_date_group?: Moment | null; expire_date_dan?: Moment | null } = {};

    if (formatUser) {
      const prevExpireDate = product === Product.Dan ? formatUser.expire_date_dan : formatUser.expire_date_group;
      const userExpireDate = getExpireDate(prevExpireDate ? moment(prevExpireDate) : moment(), level);

      if (product === Product.Dan) update.expire_date_dan = userExpireDate;
      else update.expire_date_group = userExpireDate;
    }

    if (formatUser?.p_id) {
      const p_id = formatUser.p_id;
      const shareUser = await User.findOne({ where: { user_id: p_id } });
      const formatShareUser = shareUser?.toJSON();

      if (formatShareUser && !formatUser.is_award) {
        console.info('奖励父用户');
        await award(formatShareUser.user_id, 'order');
        is_award = true;
      }
    }

    // 更新用户表
    await user.update({ ...update, is_award, is_vip: true });

    // 新增订单
    const expireDate = getExpireDate(moment(), level);

    console.info('创建订单');
    await Order.create({
      user_id: userId,
      product: product,
      vip_level: level,
      out_trade_no: tradeNo,
      fee: message.totalFee,
      expire_date: expireDate
    });

    // 更新redis
    if (product === Product.GPT4 || product === Product.Midjourney) {
      await updateUserVipStatus(userId, true);
    }

    // 生成核销码
    const clearanceCode = `${userId}-${product}-${level}-${message.totalFee}`;
    // 加密
    const encrypted = encrypt(clearanceCode);

    // 生成短邀请码，跟核销码唯一绑定
    const invitationCode = await InvitationCode.findOne({ where: { status: 0, send: 0 } });
    if (!invitationCode) {
      // 邀请码短缺了
      await sendMessage(userId, `邀请码不足，请联系客服`);
      await sendServiceQRcode(userId);
      return;
    }

    // 存储核销码
    await ClearanceCode.create({
      user_id: userId,
      clearance_code: encrypted,
      invitation_code: invitationCode,
      status: false
    });

    // 上传至素材库
    const updateRes = await uploadTemporaryMedia('../public/images/gpt4_qrcode.png', 'image');

    await sendMessage(
      userId,
      `会员开通成功，请添加AI机器人为好友（请在申请好友时将邀请码填入申请备注中）。\n\n🔑 邀请码: ${invitationCode}`
    );

    await sendImage(userId, updateRes.media_id);

    await invitationCode.update({ send: true });

    res.send({ errcode: 0, errmsg: '' });
  } catch (error) {
    console.error('order error: ', error);
  }
};
