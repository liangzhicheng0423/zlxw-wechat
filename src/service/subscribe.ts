import { InvitationCode } from '../mysqlModal/InvitationCode';
import { User } from '../mysqlModal/user';
import { EventMessage, Product, VipLevel } from '../types';
import {
  extractBetween,
  extractChannel,
  getOrderUrl,
  getTextReplyUrl,
  getWelcome,
  sendAIGroupIntroduce,
  sendMessage,
  sendServiceQRcode
} from '../util';
import { award } from './award';

export const subscribe = async (message: EventMessage) => {
  try {
    const { FromUserName, EventKey } = message;

    let temp_user_id = undefined;

    let pid: string | undefined;

    let channel: string | undefined;
    if (EventKey) {
      // 来自于公众号的二维码
      const keys = EventKey.split(/_(.+)/).filter(v => !!v);
      pid = keys[keys.length - 1];

      console.log('【subscribe】 pid 第一个', pid);

      channel = extractChannel(EventKey);

      console.log('【subscribe】 channel: ', channel);

      if (channel) {
        pid = extractBetween(EventKey, 'qrscene_', '?');
        console.log('【subscribe】 pid 第二个', pid);
      }

      if (EventKey.endsWith('_temp_user')) {
        // 微信产生的二维码，此时为临时用户
        temp_user_id = extractBetween(EventKey, 'qrscene_', '_temp_user');
        pid = undefined;
        console.log('【subscribe】 pid 第三个', pid);
      }
    }

    if (pid === FromUserName) {
      pid = undefined;
      console.log('【subscribe】 pid 第四个', pid);
    }

    console.log('【subscribe】 pid 第五个', pid);

    console.log('【subscribe】 temp_user_id', temp_user_id);

    // if (pid) {
    // const reply = [
    //   '你好，朋友！',
    //   '👩🏻‍💻 我是你的助理小吴，我可以：',
    //   '🥇 让排名第一的AI工具，成为你的微信好友',
    //   `👉🏻 ${getTextReplyUrl('领取100元限时优惠券', '点此领取100元限时优惠券')}`
    // ];

    const reply = [
      '🎉 成功获取惊喜彩蛋专链',
      '🎟️ 199元得惊喜彩蛋2年卡，无限次使用，支持7天无理由',
      '🎫 仅限100张，以下单成功页面为准，下单失败就是抢光了～',
      `👉🏻 ${getOrderUrl('点此立即抢购', { level: VipLevel.Year, product: Product.Group, boon: true })}`
    ];

    console.log('【订阅发送】');
    await sendMessage(FromUserName, reply.join('\n\n'));

    await sendMessage(FromUserName, '成功抢到后务必添加客服，发“激活”自动拉群');

    await sendServiceQRcode(FromUserName);

    // await sendAIGroupIntroduce(FromUserName);
    // } else {
    //   await sendMessage(FromUserName, getWelcome());
    // }

    // 用户订阅
    const [user, created] = await User.findOrCreate({
      where: { user_id: FromUserName },
      defaults: { subscribe_status: true, p_id: pid, channel_code: channel, xiaowu_id: temp_user_id }
    });

    // 新增关注 && 不是通过微信扫描公众号二维码来的。则分配一个xiaowu_id
    if (created && !temp_user_id) {
      const invitationCode = await InvitationCode.findOne({ where: { status: 0, send: 0 } });
      if (!invitationCode) {
        // 邀请码短缺了
        await sendMessage(FromUserName, `邀请码不足，请联系客服`);
        return;
      }

      const code = invitationCode.toJSON().code;
      await invitationCode.update({ send: 1, status: 1 });
      await user.update({ xiaowu_id: code });
    }

    console.log('[关注公众号] created: ', created, 'pid: ', pid);

    if (!created) await user.update({ subscribe_status: true, p_id: pid });

    // 只有新增关注才给予奖励
    if (created && pid) await award(pid, 'subscribe');
  } catch (error) {}
};
