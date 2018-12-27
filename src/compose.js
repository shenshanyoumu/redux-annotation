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

  // 最左边函数是合成后的最外层，相当于“洋葱结构”的外层。中间件的工作原理就是剥洋葱过程，通过next函数层层传递
  // 比如函数a相当于redux-thunk中间件，而b(...args)这个整体其实就是next，真正执行时传递action参数
  // (1)当action函数执行后返回形式为({dispatch,getState})=>{}的函数，则根据中间件定义将会执行({dispatch,getState})=>{}
  // (2)当action函数执行后返回普通的action对象，则执行b(...args)(action)，即next(action)
  // 注意b也是一个中间件；如果只有唯一的中间件a，则...args用store.dispatch替换也可行
  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}
