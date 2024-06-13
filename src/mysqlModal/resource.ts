import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class Resource extends Model {}

Resource.init(
  {
    // 定义模型的字段
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    // 用户唯一id
    media_id: {
      type: DataTypes.CHAR(50),
      allowNull: false
    },
    // 用户唯一id
    name: {
      type: DataTypes.CHAR(50),
      allowNull: false
    }
  },
  {
    sequelize,
    modelName: 'Resource',
    tableName: 'Resources',
    timestamps: true
  }
);

export const syncResource = async () => {
  await Resource.sync({ alter: true });
  console.log('Resource sync successfully.');
};
