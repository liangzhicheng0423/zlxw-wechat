import { DataTypes } from 'sequelize';
import { sequelize } from '../db';

// 定义模型
export const User = sequelize.define('User', {
  // 定义模型的字段
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.CHAR(50),
    unique: true,
    allowNull: false
  },
  integral: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  cash: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  share_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
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
