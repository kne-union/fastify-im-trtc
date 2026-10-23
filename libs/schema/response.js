// 响应 schema 会参与 fast-json-stringify 序列化：对象一律 additionalProperties: true 以免裁掉未声明字段；
// 用 nullable 而非类型数组（类型数组遇到不匹配的值会直接 500），类型不确定的字段只写说明不声明类型
const str = description => ({ type: 'string', nullable: true, description });
const num = description => ({ type: 'number', nullable: true, description });
const bool = description => ({ type: 'boolean', nullable: true, description });
const any = description => ({ description });
const obj = (description, properties = {}) => ({ type: 'object', nullable: true, description, additionalProperties: true, properties });

const success = (description, schema) => ({
  200: Object.assign({}, schema || { type: 'object' }, { description })
});

module.exports = { str, num, bool, any, obj, success };
