import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../db';

/** 核销码 */
export class ClearanceCode extends Model {}

ClearanceCode.init(
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
    // 核销码
    clearance_code: {
      type: DataTypes.CHAR(255),
      allowNull: false
    },
    // 短邀请码
    invitation_code: {
      type: DataTypes.CHAR(20),
      allowNull: false
    },
    // 核销状态
    status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    // 核对时间
    check_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'ClearanceCode',
    tableName: 'ClearanceCodes',
    timestamps: true
  }
);

export const syncClearanceCode = async () => {
  await ClearanceCode.sync({ alter: true });
  console.log('ClearanceCode sync successfully.');
};
