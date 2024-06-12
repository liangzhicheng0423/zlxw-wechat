import { DataTypes } from 'sequelize';
import { sequelize } from '../db';

// 定义模型
export const Order = sequelize.define('Order', {
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
    allowNull: false
  },
  // 产品
  product: {
    type: DataTypes.CHAR(50),
    allowNull: false
  },
  // 会员级别
  vip_level: {
    type: DataTypes.CHAR(50),
    allowNull: false
  },
  // 订单号
  out_trade_no: {
    type: DataTypes.CHAR(50),
    allowNull: false
  },
  // 订单金额
  fee: {
    type: DataTypes.NUMBER,
    allowNull: false
  },
  // 到期时间
  expire_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE
  },
  updatedAt: {
    type: DataTypes.DATE
  }
});
