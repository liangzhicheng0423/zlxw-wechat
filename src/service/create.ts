import axios from 'axios';
import { Menu, MenuKey, PayBody } from '../constant';
import { User } from '../mysqlModal/user';
import { Product, VipLevel, WeChatMessage } from '../types';
import { getOrderUrl, getReplyBaseInfo, getTextReplyUrl, sendMessage } from '../util';

export const create = () => {
  axios
    .post(`https://api.weixin.qq.com/cgi-bin/menu/create`, Menu)
    .then(response => {
      console.log('Menu created:', response.data);
    })
    .catch(error => {
      console.error('Error creating menu:', error);
    });
};

export const menuEvent = async (message: WeChatMessage, eventKey: string, res: any) => {
  const baseReply = getReplyBaseInfo(message);
  const danText = `${getOrderUrl(PayBody[Product.Dan][VipLevel.Year], { level: VipLevel.Year, product: Product.Dan })}\n\n${getOrderUrl(PayBody[Product.Dan][VipLevel.Quarter], { level: VipLevel.Quarter, product: Product.Dan })}\n\n${getOrderUrl(PayBody[Product.Dan][VipLevel.Month], { level: VipLevel.Month, product: Product.Dan })}`;

  // 查询当前账户剩余积分
  const user = await User.findOne({ where: { user_id: baseReply.ToUserName } });
  const formatUser = user?.toJSON();

  const shareText = `分享你的专属邀请，获取每单50元现金激励  ${getTextReplyUrl('获取分享活动规则', '活动规则')}\n\n${getTextReplyUrl('获取专属分享海报', '获取我的专属分享海报')}\n\n已获得N币奖励：${formatUser?.integral ?? 0} ${getTextReplyUrl('兑换', '兑换')}`;

  const myAccountText = `已获得N币奖励：${formatUser?.integral ?? 0} ${getTextReplyUrl('兑换', '兑换')}`;

  switch (eventKey) {
    case MenuKey.Dan:
      await sendMessage(message.FromUserName, danText);

      /** TODO: 后续要更换成图片 */
      res.send({ ...baseReply, MsgType: 'text', Content: '【Dan产品介绍页】' });
      break;

    case MenuKey.SharingIsPolite:
      res.send({ ...baseReply, MsgType: 'text', Content: shareText });
      break;

    case MenuKey.SharingIsPolite:
      res.send({ ...baseReply, MsgType: 'text', Content: shareText });
      break;

    case MenuKey.MyAccount:
      res.send({ ...baseReply, MsgType: 'text', Content: myAccountText });
      break;
  }
};
