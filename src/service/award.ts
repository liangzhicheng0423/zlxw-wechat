import { User } from '../mysqlModal/user';
import { BonusTypeEnum } from '../types';
import { getBonus, getTextReplyUrl, sendMessage } from '../util';

export const award = async (userId: string, type: 'subscribe' | 'order') => {
  // 查找用户
  const foundUser = await User.findOne({ where: { userId: userId, subscribe_status: true } });

  if (foundUser) {
    // 更新奖励
    const formatUser = foundUser.toJSON();

    const bonus = getBonus(formatUser.share_count, type);
    const update: { cash?: number; integral?: number; share_count: number } = {
      share_count: (formatUser.share_count ?? 0) + 1
    };

    if (bonus.type === BonusTypeEnum.Cash) update.cash = bonus.bonus + (formatUser.cash ?? 0);
    if (bonus.type === BonusTypeEnum.Integral) update.integral = bonus.bonus + (formatUser.integral ?? 0);

    await foundUser.update(update);
    let text = '';
    if (type === 'subscribe') {
      text += `🎉 有用户通过你的推荐码关注了公众号啦，${bonus.bonus}N币已到账 ${getTextReplyUrl('查询账户', '查询')}

该用户下单AI群年卡后，你可以可获得500N币奖励  ${getTextReplyUrl('N币奖励规则', '奖励规则')}

${getTextReplyUrl('获取专属分享海报', '获取我的专属分享海报')}
`;
    }

    if (type === 'order') {
      text += `🎉 有用户通过你的推荐码下单了AI群年卡，${bonus.bonus}N币已到账 ${getTextReplyUrl('查询账户', '查询')}

推荐给更多用户，继续获得奖励 ${getTextReplyUrl('N币奖励规则', '奖励规则')}

${getTextReplyUrl('获取专属分享海报', '获取我的专属分享海报')}
`;
    }

    await sendMessage(userId, text);
  }
};
