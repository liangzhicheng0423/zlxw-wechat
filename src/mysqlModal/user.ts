import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class User extends Model {}

User.init(
  {
    // 定义模型的字段
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    // 用户唯一id
    xiaowu_id: {
      type: DataTypes.CHAR(50),
      allowNull: true
    },
    // 用户唯一id
    user_id: {
      type: DataTypes.CHAR(50),
      unique: true,
      allowNull: false
    },
    // 父级id
    p_id: {
      type: DataTypes.CHAR(50),
      allowNull: true
    },
    // wechaty中拿到用户唯一id
    handle: {
      type: DataTypes.CHAR(50),
      allowNull: true
    },
    nickname: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    groupname: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    weixin_info: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // 是否已经奖励了父级用户
    is_award: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    // 是否是会员
    is_vip: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    // 积分
    integral: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    // 现金
    cash: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    // 分享总人数
    share_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    // 公众号订阅状态
    subscribe_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    // 用户备注
    remark: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    // 渠道码
    channel_code: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    // 标签列表
    tag_list: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    // 免费额度剩余
    gpt4_free_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10
    },
    midjourney_free_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 10
    },
    // 到期时间
    expire_date_dan: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // 到期时间
    expire_date_group: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // 是否禁用
    disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    }, // 是否禁用
    is_find: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: 0
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true
  }
);

export const syncUser = async () => {
  await User.sync({ alter: true });
  console.log('User sync successfully.');
};
