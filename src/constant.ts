import { BonusTypeEnum, Product, VipLevel } from './types';

const BonusType = BonusTypeEnum.Integral;

export const BonusStrategy = {
  subscribe: { bonusType: BonusType },
  order: { bonusType: BonusType }
};

export const SubscribeLadderRewards = [{ level: 1000, [BonusTypeEnum.Integral]: 10, [BonusTypeEnum.Cash]: 10 }];

export const ScanLadderRewards = [{ level: 1000, [BonusTypeEnum.Integral]: 10, [BonusTypeEnum.Cash]: 10 }];

export const OrderLadderRewards = [{ level: 1000, [BonusTypeEnum.Integral]: 500, [BonusTypeEnum.Cash]: 500 }];

export enum MenuKey {
  Dan = 'get_dan',
  AIGroup = 'ai_group',
  Instructions = 'instructions_for_use',
  AIAccess = 'ai_access',
  ContactCustomerService = 'contact_customer_service',
  BusinessCooperation = 'business_cooperation',
  SharingIsPolite = 'sharing_is_polite',
  MyAccount = 'my_account'
}

export const Menu = {
  button: [
    {
      name: 'AI工具',
      sub_button: [
        { type: 'click', name: 'AI群聊', key: MenuKey.AIGroup },
        { type: 'click', name: 'Dan', key: MenuKey.Dan }
      ]
    },
    {
      name: '发现',
      sub_button: [
        { type: 'view', name: '官网', url: 'https://ai-xiaowu.com' },
        { type: 'click', name: '使用说明页', key: MenuKey.Instructions },
        { type: 'click', name: 'AI接入', key: MenuKey.AIAccess }
      ]
    },
    {
      name: '我',
      sub_button: [
        { type: 'click', name: '联系客服', key: MenuKey.ContactCustomerService },
        { type: 'click', name: '业务合作', key: MenuKey.BusinessCooperation },
        { type: 'click', name: '分享有礼', key: MenuKey.SharingIsPolite },
        { type: 'click', name: '我的账户', key: MenuKey.MyAccount }
      ]
    }
  ]
};

export const PayBody = {
  [Product.Dan]: {
    [VipLevel.Ten]: '',
    [VipLevel.Year]: '购买年卡 899元/年（约75元/月）',
    [VipLevel.Quarter]: '购买季卡 299元/季（约100元/月）',
    [VipLevel.Month]: '购买月卡 129元/月'
  },
  [Product.GPT4]: {
    [VipLevel.Ten]: '10份年卡 2480元/年',
    [VipLevel.Year]: '购买年卡 249元/年（约20元/月）',
    [VipLevel.Quarter]: '购买季卡 199元/季（约16元/月）',
    [VipLevel.Month]: '购买月卡 79元/月'
  },
  [Product.Midjourney]: {
    [VipLevel.Ten]: '10份年卡 2480元/年',
    [VipLevel.Year]: '购买年卡 249元/年（约20元/月）',
    [VipLevel.Quarter]: '购买季卡 199元/季（约16元/月）',
    [VipLevel.Month]: '购买月卡 79元/月'
  }
};

export const PayLevel = {
  [Product.Dan]: {
    [VipLevel.Year]: 89900,
    [VipLevel.Ten]: 0,
    [VipLevel.Quarter]: 29900,
    [VipLevel.Month]: 12900
  },
  [Product.GPT4]: {
    [VipLevel.Ten]: 248000,
    [VipLevel.Year]: 24900,
    [VipLevel.Quarter]: 19900,
    [VipLevel.Month]: 7900
  },
  [Product.Midjourney]: {
    [VipLevel.Ten]: 248000,
    [VipLevel.Year]: 24900,
    [VipLevel.Quarter]: 19900,
    [VipLevel.Month]: 7900
  }
};
