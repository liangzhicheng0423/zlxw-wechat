import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

export class InvitationCode extends Model {}

InvitationCode.init(
  {
    // 定义模型的字段
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.CHAR(20),
      unique: true,
      allowNull: false
    },
    // 使用状态
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    // 发送状态
    send: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    }
  },
  {
    sequelize,
    modelName: 'InvitationCode',
    tableName: 'invitationCode',
    timestamps: true
  }
);

export const syncInvitationCode = async () => {
  await InvitationCode.sync({ alter: true });
  console.log('InvitationCode sync successfully.');
};
