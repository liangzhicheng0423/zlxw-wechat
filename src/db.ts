import { Sequelize } from 'sequelize';
import { Order } from './mysqlModal/order';
import { User } from './mysqlModal/user';

// 从环境变量中读取数据库配置
const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = '' } = process.env;

const [host, port] = MYSQL_ADDRESS.split(':');

export const sequelize = new Sequelize('zlxw', MYSQL_USERNAME!, MYSQL_PASSWORD, {
  host,
  port: Number(port),
  dialect: 'mysql' /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */
});

// 数据库初始化方法

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    await User.sync({ alter: true });

    await Order.sync({ alter: true });

    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
  }
})();
