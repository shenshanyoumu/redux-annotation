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

  // 1、reduce从左到右归约数组元素，即funcs数组中第一个函数在最外层
  // 2、几乎所有框架的中间件实现都是采用这种"洋葱模型"
  // 3、理解函数式编程，下面的延迟执行相当于thunk.
  // 4、箭头函数不绑定this，this向上回溯直达第一个非箭头函数；
  // 5、闭包作用的理解，才能形成延迟执行的洋葱模型调用模式
  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}


