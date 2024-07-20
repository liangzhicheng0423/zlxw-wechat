import axios from 'axios';
import moment, { Moment } from 'moment';
import { PayLevel } from '../constant';
import { encrypt } from '../crypto';
import { InvitationCode } from '../mysqlModal/InvitationCode';
import { ClearanceCode } from '../mysqlModal/clearanceCode';
import { Order } from '../mysqlModal/order';
import { Product as sqProduct } from '../mysqlModal/product';
import { User } from '../mysqlModal/user';
import { UserCustomerProduct } from '../mysqlModal/user_customer_product';
import { UserServiceProduct } from '../mysqlModal/user_service_product';
import { WechatUser } from '../mysqlModal/wechat_user';
import { updateUserVipStatus } from '../redis';
import { OrderBody, Product, VipLevel, WeChatPayCallback } from '../types';
import {
  generateOrderNumber,
  getExpireDate,
  getLevelAndProduct,
  getReplyBaseInfo,
  isNumber,
  sendMessage,
  sendServiceQRcode
} from '../util';
import { award } from './award';

/** 下单 */
export const unifiedorder = async (req: any, res: any) => {
  const { level, product, isRecommend } = req.body as OrderBody;

  const ip = req.headers['x-forwarded-for']; // 小程序直接callcontainer请求会存在
  const openid = req.headers['x-wx-openid']; // 小程序直接callcontainer请求会存在
  const env_id = req.headers['x-wx-env'];

  // 找到上线的产品，获取最近价格
  const onLineProducts = await sqProduct.findAll({ where: { is_online: true } });

  const jsonOnLineProducts = onLineProducts.map(v => v.toJSON());

  const currentProduct = jsonOnLineProducts.find(v => v.name === product);

  if (!currentProduct) {
    await sendMessage(openid, '当前购买的产品不存在或已下线，请联系客服');
    return;
  }

  const { month_fee, quarter_fee, year_fee } = currentProduct;

  const yearFee = isNumber(year_fee) ? Number(year_fee) * 100 : PayLevel[product][VipLevel.Year];
  const monthFee = isNumber(month_fee) ? Number(month_fee) * 100 : PayLevel[product][VipLevel.Month];
  const quarterFee = isNumber(quarter_fee) ? Number(quarter_fee) * 100 : PayLevel[product][VipLevel.Quarter];

  const yearText = `年卡 ${yearFee / 100}元/年（${Math.ceil(yearFee / 100 / 12)}元/月）`;
  const quarterText = `季卡 ${quarterFee / 100}元/年（${Math.ceil(quarterFee / 100 / 12)}元/月）`;
  const monthText = `月卡 ${monthFee / 100}元/年`;

  let body = '';
  let total_fee = 0;
  switch (level) {
    case VipLevel.Year:
      if (isRecommend && product === Product.Group) {
        body = '299元/年（24.9元/月）';
        total_fee = 29900;
      } else {
        body = yearText;
        total_fee = yearFee;
      }
      break;

    case VipLevel.Quarter:
      body = quarterText;
      total_fee = quarterFee;
      break;

    case VipLevel.Month:
      body = monthText;
      total_fee = monthFee;
      break;

    default:
      break;
  }

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

    console.log('下单成功');
    res.send(response.data);
  } catch (error) {
    console.error(error);
  }
};

/** 支付成功 */
export const unifiedorderCb = async (req: any, res: any) => {
  try {
    const message: WeChatPayCallback = req.body;

    console.info('step 1:【支付成功】:', message);

    const userId = message.subOpenid;

    const out_trade_no = message.outTradeNo;

    const transaction_id = message.transactionId;

    const { level: vip_level, product } = getLevelAndProduct(out_trade_no);

    console.log('step 2:【支持成功】产品名: ', product, ' 会员级别: ', vip_level);

    if (message.resultCode !== 'SUCCESS' || message.returnCode !== 'SUCCESS') return;

    let is_award = false;

    // 已有订单号
    const beforeOrder = await Order.findOne({ where: { user_id: userId, out_trade_no } });
    if (beforeOrder) {
      console.info('订单号已经存在');
      return;
    }

    // 奖励其父用户
    const [user] = await User.findOrCreate({
      where: { user_id: userId },
      defaults: { subscribe_status: true, user_id: userId }
    });

    const formatUser = user?.toJSON();

    let xiaowu_id = formatUser?.xiaowu_id;

    if (!xiaowu_id) {
      const invitationCode = await InvitationCode.findOne({ where: { status: 0, send: 0 } });
      if (!invitationCode) {
        // 邀请码短缺了
        await sendMessage(userId, `激活码不足，请联系客服`);
        return;
      }
      xiaowu_id = invitationCode.toJSON().code;
    }

    console.info('step 3: 【生成xiaowu_id】', xiaowu_id);
    const update: { expire_date_group?: Moment | null; expire_date_dan?: Moment | null } = {};

    if (formatUser) {
      const prevExpireDate = product === Product.Dan ? formatUser.expire_date_dan : formatUser.expire_date_group;
      const userExpireDate = getExpireDate(prevExpireDate ? moment(prevExpireDate) : moment(), vip_level);

      if (product === Product.Dan) update.expire_date_dan = userExpireDate;
      else update.expire_date_group = userExpireDate;
    }

    console.info('step 4: 【奖励上级用户】', formatUser?.p_id);
    // 奖励上级用户
    if (formatUser?.p_id) {
      const p_id = formatUser.p_id;
      const shareUser = await User.findOne({ where: { user_id: p_id } });
      const formatShareUser = shareUser?.toJSON();

      // 只有群聊的年卡才会有奖励
      if (formatShareUser && !formatUser.is_award && product === Product.Group && vip_level === VipLevel.Year) {
        await award(formatShareUser.user_id, 'order');
        is_award = true;
      }
    }

    console.info('step 5: 【更新用户表的xiaowu_id】');
    // 更新用户表
    await user.update({ is_award, xiaowu_id });

    const expire_date = getExpireDate(moment(), vip_level);

    console.info('step 6:【创建订单】', {
      user_id: userId,
      product,
      vip_level,
      out_trade_no,
      transaction_id,
      fee: message.totalFee,
      expire_date
    });

    await Order.create({
      user_id: userId,
      product,
      vip_level,
      out_trade_no,
      transaction_id,
      fee: message.totalFee,
      expire_date
    });

    // START -------- 更新该用户针对该产品的到期时间 ------------

    const currentProduct = await sqProduct.findOne({ where: { name: product } });

    if (!currentProduct) {
      await sendMessage(userId, [`🎉 会员开通成功：${product}`, '👩🏻‍💻 请扫码添加客服，并向客服发送“激活”'].join('\n\n'));
      return;
    }

    const product_id = currentProduct.toJSON().id;

    console.info('step 6: 【创建用户购买产品列表】');
    const [userProduct, created] = await UserServiceProduct.findOrCreate({
      where: { user_id: userId, product_id },
      defaults: { product_id, last_date: moment(), expire_date: moment() }
    });

    let userExpireDate: moment.Moment | null = null;

    const now = moment();
    if (created) {
      // 新增购买
      userExpireDate = expire_date;
    } else {
      // 查看之前的到期时间是否已经到期，如果到期，从当前开时间始算到期时间，如果未到期，则累加到期时间
      const isExpire = now.isAfter(moment(userProduct.toJSON().expire_date));
      if (isExpire) userExpireDate = getExpireDate(moment(), vip_level);
      else userExpireDate = getExpireDate(moment(userProduct.toJSON().expire_date), vip_level);
    }

    await userProduct.update({ expire_date: userExpireDate });

    // END -------- 更新该用户针对该产品的到期时间 ------------

    // 更新redis
    if (product === Product.Group) {
      await updateUserVipStatus(userId, true);
    }

    // 生成核销码
    const clearanceCode = `${userId}-${product}-${vip_level}-${message.totalFee}`;
    // 加密
    const encrypted = encrypt(clearanceCode);

    // // 生成短邀请码，跟核销码唯一绑定
    // const invitationCode = await InvitationCode.findOne({ where: { status: 0, send: 0 } });
    // if (!invitationCode) {
    //   // 邀请码短缺了
    //   await sendMessage(userId, `邀请码不足，请联系客服`);
    //   await sendServiceQRcode(userId);
    //   return;
    // }

    // const code = invitationCode.toJSON().code;

    console.info('step 6: 【激活xiaowu_id】');
    await InvitationCode.update({ status: true, send: true }, { where: { code: xiaowu_id } });

    // 存储核销码
    await ClearanceCode.create({
      user_id: userId,
      clearance_code: encrypted,
      invitation_code: xiaowu_id,
      status: false
    });

    // 上传至素材库
    // const updateRes = await uploadTemporaryMedia(path.join(__dirname, '../public/images/gpt4_qrcode.png'), 'image');

    // await sendMessage(
    //   userId,
    //   `会员开通成功，请添加AI机器人为好友（请在申请好友时将邀请码填入申请备注中）。\n\n🔑 邀请码: ${code}`
    // );

    // await sendMessage(
    //   userId,
    //   ['🎉 会员开通成功', '👩🏻‍💻 请扫码添加客服，向客服发送“激活”，并备注邀请码', `🔑 激活码：${xiaowu_id}`].join('\n\n')
    // );

    console.info('step 7:【创建微信用户】');
    // 创建微信用户
    await WechatUser.findOrCreate({
      where: { xiaowu_id },
      defaults: { xiaowu_id, nickname: formatUser?.nickname, disabled: false, source: '服务号创建' }
    });

    console.info('step 8:【更新微信会员的到期日期】');
    // 更新微信会员的到期日期
    const currentWechatUserProduct = await UserCustomerProduct.findOne({ where: { user_id: xiaowu_id, product_id } });
    if (!currentWechatUserProduct) {
      await UserCustomerProduct.bulkCreate([{ user_id: xiaowu_id, product_id, expire_date: userExpireDate?.toDate() }]);
    } else {
      let userCustomerExpireDate: moment.Moment | null = null;
      const oldExpireDate = moment(currentWechatUserProduct.toJSON().expire_date);
      const isExpire = now.isAfter(oldExpireDate);

      if (isExpire) userCustomerExpireDate = expire_date;
      else userCustomerExpireDate = getExpireDate(oldExpireDate, vip_level);
      currentWechatUserProduct.update({ expire_date: userCustomerExpireDate?.toDate() });
    }

    // case 1: 私聊
    // await sendImage(userId, updateRes.media_id);

    // case 2: 群聊
    /**
     * 1. 找到一个未使用的群聊二维码
     * 2. 将群聊二维码上传至素材库
     * 3. 发送群聊二维码至用户
     *
     */

    console.info('step 9:【发送客服二维码】');
    await sendServiceQRcode(userId);

    console.info('step 10:【发送开通成功通知】');
    res.send({
      ToUserName: userId,
      MsgType: 'text',
      Content: ['🎉 会员开通成功', '👩🏻‍💻 请扫码添加客服，向客服发送“激活”，并备注邀请码', `🔑 激活码：${xiaowu_id}`].join(
        '\n\n'
      )
    });

    // await invitationCode.update({ send: true });
  } catch (error) {
    console.error('order error: ', error);
  } finally {
    res.send({ errcode: 0, errmsg: '' });
  }
};
