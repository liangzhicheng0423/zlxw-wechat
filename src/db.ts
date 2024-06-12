import { Sequelize } from 'sequelize';

// 从环境变量中读取数据库配置
const { MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_ADDRESS = '' } = process.env;

const [host, port] = MYSQL_ADDRESS.split(':');

export const sequelize = new Sequelize('zlxw', MYSQL_USERNAME!, MYSQL_PASSWORD, {
  host,
  port: Number(port),
  dialect: 'mysql' /* one of 'mysql' | 'mariadb' | 'postgres' | 'mssql' */
});
