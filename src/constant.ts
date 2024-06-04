import { BonusTypeEnum } from './types';

const BonusType = BonusTypeEnum.Integral;

export const BonusStrategy = {
  subscribe: { bonusType: BonusType },
  scan: { bonusType: BonusType }
};

export const SubscribeLadderRewards = [
  { level: 10, [BonusTypeEnum.Integral]: 10, [BonusTypeEnum.Cash]: 1 },
  { level: 20, [BonusTypeEnum.Integral]: 25, [BonusTypeEnum.Cash]: 2.5 },
  { level: 50, [BonusTypeEnum.Integral]: 75, [BonusTypeEnum.Cash]: 7.5 },
  { level: 100, [BonusTypeEnum.Integral]: 100, [BonusTypeEnum.Cash]: 10 }
];

export const ScanLadderRewards = [
  { level: 10, [BonusTypeEnum.Integral]: 10, [BonusTypeEnum.Cash]: 1 },
  { level: 20, [BonusTypeEnum.Integral]: 25, [BonusTypeEnum.Cash]: 2.5 },
  { level: 50, [BonusTypeEnum.Integral]: 75, [BonusTypeEnum.Cash]: 7.5 },
  { level: 100, [BonusTypeEnum.Integral]: 100, [BonusTypeEnum.Cash]: 10 }
];
