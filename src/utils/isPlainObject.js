// action默认为普通的object，因此需要这个utils方法
export default function isPlainObject(obj) {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  let proto = obj;

  // 对于普通对象，其原型对象为Object.prototype
  // 而Object.prototype的原型对象为null，因此下面的判定逻辑是合理的
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}
