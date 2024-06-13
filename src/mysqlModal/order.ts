import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class Order extends Model {}

Order.init(
  {
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
      allowNull: true
    },
    // 到期时间
    expire_date: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true
  }
);

export const syncOrder = async () => {
  await Order.sync({ alter: true });
  console.log('Order sync successfully.');
};
