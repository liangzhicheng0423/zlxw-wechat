import { InvitationCode } from '../mysqlModal/InvitationCode';
import { User } from '../mysqlModal/user';
import { EventMessage, Product, VipLevel } from '../types';
import { getOrderUrl, getWelcome, sendAIGroupIntroduce, sendMessage } from '../util';
import { award } from './award';

export const subscribe = async (message: EventMessage) => {
  const { FromUserName, EventKey } = message;

  let pid: string | undefined;
  if (EventKey) {
    const keys = EventKey.split(/_(.+)/).filter(v => !!v);
    pid = keys[keys.length - 1];
  }
  if (pid === FromUserName) pid = undefined;

  if (pid) {
    const reply = [
      '🎉 成功领取100元限时优惠券',
      '👩🏻‍💻 助理小吴AI群，折后叠加100元立减券，仅需',
      '🔥 ' +
        getOrderUrl('299元/年（24.9元/月）', {
          level: VipLevel.Year,
          product: Product.Group,
          isRecommend: true
        })
    ];
    await sendMessage(FromUserName, reply.join('\n\n'));

    await sendAIGroupIntroduce(FromUserName);
  } else {
    await sendMessage(FromUserName, getWelcome());
  }

  // 用户订阅
  const [user, created] = await User.findOrCreate({
    where: { user_id: FromUserName },
    defaults: { subscribe_status: true, p_id: pid }
  });

  if (created) {
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
};
