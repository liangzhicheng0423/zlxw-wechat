import axios from 'axios';
import { Menu, MenuKey } from '../constant';
import { User } from '../mysqlModal/user';
import { WeChatMessage } from '../types';
import {
  activityRulesUrl,
  getReplyBaseInfo,
  getTextReplyUrl,
  sendAiGroupText,
  sendDanText,
  sendMessage,
  sendServiceQRcode
} from '../util';

export const create = () => {
  axios
    .post(`http://api.weixin.qq.com/cgi-bin/menu/create`, Menu)
    .then(response => {
      console.log('Menu created:', response.data);
    })
    .catch(error => {
      console.error('Error creating menu:', error);
    });
};

export const menuEvent = async (message: WeChatMessage, eventKey: string, res: any) => {
  const baseReply = getReplyBaseInfo(message);

  // 查询当前账户剩余积分
  const user = await User.findOne({ where: { user_id: baseReply.ToUserName } });
  const formatUser = user?.toJSON();

  const shareText = [
    `分享你的专属邀请，获取每单50元现金激励  <a href="${activityRulesUrl}">活动规则</a>}`,
    `${getTextReplyUrl('获取我的专属分享海报')}`,
    `已获得N币奖励：${formatUser?.integral ?? 0} ${getTextReplyUrl('兑换')}`
  ].join('\n\n');

  const myAccountText = `已获得N币奖励：${formatUser?.integral ?? 0} ${getTextReplyUrl('兑换')}`;

  const aiAccessText = getTextReplyUrl('马上接入');

  switch (eventKey) {
    case MenuKey.Dan:
      await sendDanText(message.FromUserName);
      break;

    case MenuKey.AIGroup:
      await sendAiGroupText(message.FromUserName);
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

    case MenuKey.AIAccess:
      await sendMessage(message.FromUserName, aiAccessText);

      /** TODO: 后续要更换成图片 */
      res.send({ ...baseReply, MsgType: 'text', Content: '【AI接入服务介绍页】' });
      break;

    case MenuKey.More:
      const msg = [
        '选择你要使用的工具',
        `👉🏻 ${getTextReplyUrl('对话4o')}`,
        `👉🏻 ${getTextReplyUrl('绘图Midjourney')}`
      ].join('\n\n');

      res.send({ ...baseReply, MsgType: 'text', Content: msg });
      break;

    case MenuKey.BusinessCooperation:
      res.send({
        ...baseReply,
        MsgType: 'image',
        Image: { MediaId: 'FLs_fBoOlhvVW6z2cE128oPxsNIfLLoGv1nncqrwLGeVJLVmJzITudarkzzPz0TI' }
      });
      break;

    case MenuKey.ContactCustomerService:
      await sendServiceQRcode(baseReply.ToUserName);
      break;
  }
};
