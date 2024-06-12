import { DataTypes, Model, Sequelize } from 'sequelize';

// 从环境变量中读取数据库配置
const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = '' } = process.env;

const [host, port] = MYSQL_ADDRESS.split(':');

export const sequelize = new Sequelize('zlxw', MYSQL_USERNAME!, MYSQL_PASSWORD, {
  host,
  port: Number(port),
  dialect: 'mysql' /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */
});

export class User extends Model {}

User.init(
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
      unique: true,
      allowNull: false
    },
    // 父级id
    p_id: {
      type: DataTypes.CHAR(50),
      allowNull: true
    },
    // 是否已经奖励了父级用户
    is_award: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    // 是否是会员
    is_vip: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    },
    // 积分
    integral: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    // 现金
    cash: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    // 分享总人数
    share_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    // 公众号订阅状态
    subscribe_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    // 用户备注
    remark: {
      type: DataTypes.CHAR(255),
      allowNull: true
    },
    // 标签列表
    tagid_list: {
      type: DataTypes.CHAR(255),
      allowNull: true
    }
  },
  {
    sequelize: new Sequelize(),
    modelName: 'User',
    tableName: 'users',
    timestamps: true
  }
);

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
      allowNull: false
    },
    // 到期时间
    expire_date: {
      type: DataTypes.DATE,
      allowNull: false
    }
  },
  {
    sequelize: new Sequelize(),
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true
  }
);

export const syncDatabase = async () => {
  try {
    await sequelize.sync();
    console.log('Connection has been established successfully.');

    await User.sync({ alter: true });
    console.log('User sync successfully.');

    await Order.sync({ alter: true });
    console.log('Order sync successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
};
