import axios from 'axios';
import { getRedisClient, getRefundSecretKey } from '../redis';

const { MCH_ID, SERVICE } = process.env;

export const refund = async (req: any, res: any) => {
  const { out_trade_no, out_refund_no, total_fee, refund_fee, refund_desc, secret } = req.body;

  console.log('发起退款', req.body);

  if (!out_trade_no || !out_refund_no || !total_fee || !refund_fee || !secret) {
    res.status(400).json({ message: '参数错误' });
    return;
  }

  // 检查密钥是否过期
  const redis = getRedisClient();

  const key = getRefundSecretKey();
  const redisSecret = await redis?.get(key);

  if (redisSecret !== secret) {
    res.status(400).json({ message: '密钥错误' });
    return;
  }

  const baseUrl = 'http://api.weixin.qq.com/_/pay/refund';

  const body = {
    body: 'PAYA AI年卡',
    out_trade_no,
    out_refund_no,
    env_id: 'prod-0g0wjgnwbf66fcf0',
    sub_mch_id: MCH_ID,
    total_fee,
    refund_fee,
    refund_desc,
    callback_type: 2,
    container: { service: SERVICE, path: '/refundRes' }
  };

  try {
    const response = await axios.post(baseUrl, body);

    console.log(response.data);
    console.log('退款成功');

    res.status(200).json({ data: response.data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: '发起退款失败', error });
  }
};

export const refundRes = async (req: any, res: any) => {
  try {
    await axios.post('https://api.ai-xiaowu.com/api/group/refundRes', {
      data: req.body
    });
    res.status(200).json({ message: 'success' });
  } catch (error) {
    // @ts-ignore
    console.log('退款回调失败： ', error.status, error?.response?.data);
    res.status(200).json({ message: 'success' });
  }
};
