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

    if (bonus.type === BonusTypeEnum.Cash) update.cash = bonus.bonus + (formatUser.cash ?? 0);
    if (bonus.type === BonusTypeEnum.Integral) update.integral = bonus.bonus + (formatUser.integral ?? 0);

    await foundUser.update(update);
    let text = '';
    if (bonus.type === BonusTypeEnum.Integral) {
      text += `🎉 获得积分奖励: ${bonus.bonus}\n当前总积分: ${update.integral}`;
    }

    if (bonus.type === BonusTypeEnum.Cash) {
      text += `🎉 获得现金奖励: ${bonus.bonus}\n当前提现余额: ¥${update.cash}`;
    }

    await sendMessage(userId, text);
  }
};
