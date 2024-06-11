import { BonusTypeEnum } from './types';

const BonusType = BonusTypeEnum.Integral;

export const BonusStrategy = {
  subscribe: { bonusType: BonusType },
  order: { bonusType: BonusType }
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

export const OrderLadderRewards = [
  { level: 10, [BonusTypeEnum.Integral]: 100, [BonusTypeEnum.Cash]: 10 },
  { level: 20, [BonusTypeEnum.Integral]: 250, [BonusTypeEnum.Cash]: 20.5 },
  { level: 50, [BonusTypeEnum.Integral]: 750, [BonusTypeEnum.Cash]: 70.5 },
  { level: 100, [BonusTypeEnum.Integral]: 1000, [BonusTypeEnum.Cash]: 100 }
];

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
        { type: 'click', name: 'Dan', key: MenuKey.Dan },
        { type: 'click', name: 'AI群聊', key: MenuKey.AIGroup }
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
