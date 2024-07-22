import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../db';

interface UserCustomerProductAttributes {
  id: number;
  user_id: string;
  product_id: number;
  remark?: string;
  channel?: '服务号下单' | '客服录入';
  expire_date?: Date;
  last_date?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// 定义创建用户时可选的字段
export interface UserCustomerProductCreationAttributes extends Optional<UserCustomerProductAttributes, 'id'> {}

export class UserCustomerProduct
  extends Model<UserCustomerProductAttributes, UserCustomerProductCreationAttributes>
  implements UserCustomerProductAttributes
{
  public id!: number;
  public user_id!: string;
  public product_id!: number;
  public expire_date?: Date;
  public last_date?: Date;
  public channel?: '服务号下单' | '客服录入';
  public remark?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UserCustomerProduct.init(
  {
    // 定义模型的字段
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    // 用户id: 小吴id
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
    remark: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    channel: {
      type: DataTypes.CHAR(50),
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
    modelName: 'UserCustomerProduct',
    tableName: 'userCustomerProduct',
    timestamps: true
  }
);

export const syncUserCustomerProduct = async () => {
  await UserCustomerProduct.sync({ alter: true });
  console.log('UserCustomerProduct successfully.');
};
