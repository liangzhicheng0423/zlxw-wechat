import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class Product extends Model {}

Product.init(
  {
    // 定义模型的字段
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    // 产品名
    name: {
      type: DataTypes.CHAR(50),
      unique: true,
      allowNull: false
    },
    // 产品配色
    color: {
      type: DataTypes.CHAR(50),
      allowNull: true
    },
    // 子产品
    sub_product: {
      type: DataTypes.CHAR(50),
      allowNull: true,
      defaultValue: '[]'
    },
    // 月度会费
    month_fee: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    // 季度会费
    quarter_fee: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    // 年度会费
    year_fee: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    // 是否上线
    is_online: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },

    // 备注
    remark: {
      type: DataTypes.CHAR(50),
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Product',
    tableName: 'product',
    timestamps: true
  }
);

export const syncProduct = async () => {
  await Product.sync({ alter: true });
  console.log('User Product successfully.');
};
