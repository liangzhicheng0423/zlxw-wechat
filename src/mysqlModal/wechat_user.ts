import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class WechatUser extends Model {}

WechatUser.init(
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
      allowNull: false
    },
    nickname: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    groupname: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    // 用户备注
    remark: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    // 是否禁用
    disabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    sequelize,
    modelName: 'WechatUser',
    tableName: 'wechatUser',
    timestamps: true
  }
);

export const syncWechatUser = async () => {
  await WechatUser.sync({ alter: true });
  console.log('WechatUser sync successfully.');
};
