module.exports = {
  /** 一行最多 120 个字符(调用 prettier 方式时需要用到) */
  printWidth: 120,
  /** 大括号内的首尾需要空格 */
  bracketSpacing: true,
  /** 箭头函数，只有一个参数的时候，不需要括号 */
  arrowParens: 'avoid',
  /** 不需要自动在文件开头插入 @prettier */
  insertPragma: false,
  /** jsx 不使用单引号，而使用双引号 */
  jsxSingleQuote: false,
  /** 使用默认的折行标准 */
  proseWrap: 'preserve',
  /** 对象的 key 仅在必要时用引号 */
  quoteProps: 'as-needed',
  /** 不需要写文件开头的 @prettier */
  requirePragma: false,
  /** 行尾需要有分号 */
  semi: true,
  /** 使用单引号 */
  singleQuote: true,
  /** 末尾不需要逗号 */
  trailingComma: 'none',
  /** 一行使用一个属性 */
  singleAttributePerLine: true,
  /** 维护现有行结尾 */
  endOfLine: 'auto',
  /** tailwind config */

  htmlWhitespaceSensitivity: 'ignore',

  /** import sort */
  plugins: ['@trivago/prettier-plugin-sort-imports'],
  importOrder: [
    '^vite',
    '^react',
    '^classnames',
    '^antd',
    '@fepkg/(.*)$',
    '<THIRD_PARTY_MODULES>',
    '^@packages/(.*)$',
    '^@/common/(.*)$',
    '^@/components/(.*)$',
    '^@/layouts/(.*)$',
    '^@/localdb/(.*)$',
    '^@/router(.*)$',
    '^@/pages/(.*)$',
    '^@/types/(.*)$',
    '^[./].*(?<!\\.(c|le|sc)ss)$',
    '\\.(c|le|sc)ss$'
  ],
  importOrderSortSpecifiers: true,
  importOrderGroupNamespaceSpecifiers: true
};
