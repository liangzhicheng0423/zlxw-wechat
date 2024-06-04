import { User } from '../mysqlModal/user';
import { BonusTypeEnum } from '../types';
import { getBonus, sendMessage } from '../util';

export const award = async (userId: string, type: 'subscribe' | 'scan') => {
  // 查找用户
  const foundUser = await User.findOne({ where: { userId: userId, subscribe_status: true } });

  if (foundUser) {
    // 更新奖励
    const formatUser = foundUser.toJSON();

    const bonus = getBonus(formatUser.share_count, type);
    const update: { cash?: number; integral?: number } = {};

    if (bonus.type === BonusTypeEnum.Cash) update.cash = bonus.bonus;
    if (bonus.type === BonusTypeEnum.Integral) update.integral = bonus.bonus;

    await foundUser.update(update);
    await sendMessage(userId);
  }
};
