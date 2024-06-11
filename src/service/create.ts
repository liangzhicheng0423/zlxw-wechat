import axios from 'axios';
import { Menu, MenuKey, PayBody } from '../constant';
import { Product, VipLevel, WeChatMessage } from '../types';
import { getOrderUrl, getReplyBaseInfo, sendMessage } from '../util';

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

  switch (eventKey) {
    case MenuKey.Dan:
      await sendMessage(message.FromUserName, danText);

      /** TODO: 后续要更换成图片 */
      res.send({ ...baseReply, MsgType: 'text', Content: '【Dan产品介绍页】' });
      break;
  }
};
