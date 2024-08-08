import { BonusTypeEnum, Product, VipLevel } from './types';

const BonusType = BonusTypeEnum.Integral;

export const BonusStrategy = { subscribe: { bonusType: BonusType }, order: { bonusType: BonusType } };

export const SubscribeLadderRewards = [{ level: 1000, [BonusTypeEnum.Integral]: 10, [BonusTypeEnum.Cash]: 10 }];

export const ScanLadderRewards = [{ level: 1000, [BonusTypeEnum.Integral]: 10, [BonusTypeEnum.Cash]: 10 }];

export const OrderLadderRewards = [{ level: 1000, [BonusTypeEnum.Integral]: 500, [BonusTypeEnum.Cash]: 500 }];

export enum MenuKey {
  GPT4 = 'mode_gpt4',
  MJ = 'mode_mj',
  Dan = 'get_dan',
  AIGroup = 'ai_group',
  Instructions = 'instructions_for_use',
  AIAccess = 'ai_access',
  ContactCustomerService = 'contact_customer_service',
  BusinessCooperation = 'business_cooperation',
  SharingIsPolite = 'sharing_is_polite',
  MyAccount = 'my_account',
  More = 'more'
}

export const Menu = {
  button: [
    {
      name: 'AI工具',
      sub_button: [
        { type: 'click', name: 'AI群聊', key: MenuKey.AIGroup },
        { type: 'click', name: 'Dan', key: MenuKey.Dan },
        { type: 'click', name: '更多', key: MenuKey.More }
        // { type: 'click', name: 'GPT4', key: MenuKey.GPT4 },
        // { type: 'click', name: 'MJ绘图', key: MenuKey.MJ }
      ]
    },
    {
      name: '发现',
      sub_button: [
        { type: 'view', name: '官网', url: 'https://ai-xiaowu.com' },
        { type: 'view', name: '使用说明', url: 'https://i1ze0gf4g8p.feishu.cn/wiki/OdcLwZ3GqiRf3Bk6zgqcmrmunOg' }
        // { type: 'click', name: 'AI接入', key: MenuKey.AIAccess }
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

export const MenuTemp = {
  button: [
    {
      type: 'click',
      name: '联系客服',
      key: 'MenuKey.ContactCustomerService'
    }
  ]
};

export const PayBody = {
  [Product.Dan]: {
    [VipLevel.Year]: '年卡 899元/年（75元/月）',
    [VipLevel.Quarter]: '季卡 299元/季（99元/月）',
    [VipLevel.Month]: '月卡 129元/月'
  },
  [Product.Group]: {
    [VipLevel.Year]: '年卡 399元/年（33元/月）',
    [VipLevel.Quarter]: '季卡 199元/季（66元/月）',
    [VipLevel.Month]: '月卡 79元/月'
  },
  [Product.GPT4]: {
    [VipLevel.Year]: '年卡 399元/年（33元/月）',
    [VipLevel.Quarter]: '季卡 199元/季（66元/月）',
    [VipLevel.Month]: '月卡 79元/月'
  },
  [Product.Midjourney]: {
    [VipLevel.Year]: '年卡 399元/年（33元/月）',
    [VipLevel.Quarter]: '季卡 199元/季（66元/月）',
    [VipLevel.Month]: '月卡 79元/月'
  }
};

export const PayLevel = {
  [Product.Dan]: {
    [VipLevel.Year]: 89900,
    [VipLevel.Quarter]: 29900,
    [VipLevel.Month]: 12900
  },
  [Product.Group]: {
    [VipLevel.Year]: 39900,
    [VipLevel.Quarter]: 19900,
    [VipLevel.Month]: 7900
  },
  [Product.GPT4]: {
    [VipLevel.Year]: 39900,
    [VipLevel.Quarter]: 19900,
    [VipLevel.Month]: 7900
  },
  [Product.Midjourney]: {
    [VipLevel.Year]: 39900,
    [VipLevel.Quarter]: 19900,
    [VipLevel.Month]: 7900
  }
};
