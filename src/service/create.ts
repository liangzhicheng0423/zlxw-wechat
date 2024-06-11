import axios from 'axios';
import { Menu, MenuKey, PayBody } from '../constant';
import { WeChatMessage } from '../types';
import { getReplyBaseInfo } from '../util';

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
  switch (eventKey) {
    case MenuKey.Dan:
      res.send({
        ...baseReply,
        MsgType: 'text',
        Content: `<a href="https://wechat.ai-xiaowu.com?type=year">${PayBody.year}</a>

        <a href="https://wechat.ai-xiaowu.com?type=quarter">${PayBody.quarter}</a>

        <a href="https://wechat.ai-xiaowu.com?type=month">${PayBody.month}</a>`
      });
      /** TODO: 后续要更换成图片 */
      res.send({ ...baseReply, MsgType: 'text', Content: '【Dan产品介绍页】' });
      break;
  }
};
