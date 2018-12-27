/**
 * 将平铺的函数列表合成为类似currying的嵌套结构
 * @param  {...any} funcs 由函数构成的列表
 */
export default function compose(...funcs) {
  // 如果没有传递任何函数，则compose只是恒等函数
  if (funcs.length === 0) {
    return arg => arg;
  }

  // 如果只是传入一个函数，则并不需要compose运算
  if (funcs.length === 1) {
    return funcs[0];
  }

  // 最左边函数是合成后的最外层，并且最外层的函数执行结果依赖于内层函数的执行
  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}
