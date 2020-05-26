import compose from "./compose";

// 中间件用于异步action的触发，这在React-redux库中使用。用于连接redux和react视图层
export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {

    // 如果传递enhancer则对store增强；否则就是普通的store对象
    const store = createStore(...args);

    let dispatch = () => {
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
          `Other middleware would not be applied to this dispatch.`
      );
    };

    // 中间件接受参数{getState,dispatch}，注意下面dispatch属性方法
    // 其中dispatch被enhancer增强处理
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    };

    // 中间件函数接受参数middlewareAPI，并返回一个新的函数，这种方式称之为partial function。
    const chain = middlewares.map(middleware => middleware(middlewareAPI));

    // 这个dispatch得到了增强，而store.dispatch表示最原始的只能接受普通action对象的dispatch函数。
    // 注意中间件通过compose函数合成为“洋葱结构”，
    // 而在接受action时，根据action的类别来剥洋葱操作

    // 注意compose合成函数，形成链式调用。最内部中间件接受store.dispatch参数
    // 然后返回一个新的函数，新函数可以接受异步action。
    dispatch = compose(...chain)(store.dispatch);

    // 注意下面的store对象具有getState、 dispatch、 subscribe,replaceReducer等方法
    // 因此下面dispatch已经覆盖了store原本的dispatch行为
    return {
      ...store,
      dispatch
    };
  };
}
