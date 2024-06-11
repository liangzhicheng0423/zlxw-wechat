import { DataTypes } from 'sequelize';
import { sequelize } from '../db';

// 定义模型
export const User = sequelize.define('User', {
  // 定义模型的字段
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
    autoIncrement: true
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
    unique: true,
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
  // 会员级别
  vip_level: {
    type: DataTypes.CHAR(50),
    allowNull: true
  },
  // 到期时间
  expire_date: {
    type: DataTypes.DATE
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
  createdAt: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  }
});
