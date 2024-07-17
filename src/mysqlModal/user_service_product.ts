import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class UserServiceProduct extends Model {}

UserServiceProduct.init(
  {
    // 定义模型的字段
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    // 用户id
    user_id: {
      type: DataTypes.CHAR(50),
      allowNull: false
    },
    // 产品id
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // 到期时间
    expire_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // 最后一次缴费时间
    last_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'UserServiceProduct',
    tableName: 'userServiceProduct',
    timestamps: true
  }
);

export const syncUserServiceProduct = async () => {
  await UserServiceProduct.sync({ alter: true });
  console.log('UserServiceProduct successfully.');
};
