import { User } from '../mysqlModal/user';
import { BonusTypeEnum } from '../types';
import { activityRulesUrl, getBonus, getTextReplyUrl, sendMessage } from '../util';

export const award = async (userId: string, type: 'subscribe' | 'order') => {
  console.log('【award】 userId：', userId, type);
  // 查找用户
  const foundUser = await User.findOne({ where: { user_id: userId, subscribe_status: true } });

  // 更新奖励
  const formatUser = foundUser?.toJSON();

  console.log('【award】 nickname：', formatUser?.nickname);

  const bonus = getBonus(type);
  const update: { cash?: number; integral?: number; share_count: number } = {
    share_count: (formatUser?.share_count ?? 0) + 1
  };

  if (bonus.type === BonusTypeEnum.Cash) update.cash = bonus.bonus + (formatUser?.cash ?? 0);
  if (bonus.type === BonusTypeEnum.Integral) update.integral = bonus.bonus + (formatUser?.integral ?? 0);

  console.log('【award】 update：', update);

  await foundUser?.update(update);

  let text: string[] = [];
  if (type === 'subscribe') {
    text = [
      `🎉 有用户通过你的推荐码关注了公众号啦，${bonus.bonus}N币已到账 ${getTextReplyUrl('查询')}`,
      `🪧 该用户下单AI群年卡后，你可以可获得500N币奖励  <a href="${activityRulesUrl}">活动规则</a>`,
      `🎯 ${getTextReplyUrl('获取我的专属分享海报')}`
    ];
  }

  if (type === 'order') {
    text = [
      `🎉 有用户通过你的推荐码下单了AI群年卡，${bonus.bonus}N币已到账 ${getTextReplyUrl('查询')}`,
      `🪧 推荐给更多用户，继续获得奖励 <a href="${activityRulesUrl}">活动规则</a>`,
      `🎯 ${getTextReplyUrl('获取我的专属分享海报')}`
    ];
  }

  console.log('奖励-4', userId, text.join('\n\n'));
  await sendMessage(userId, text.join('\n\n'));
};
