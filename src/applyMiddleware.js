import compose from "./compose";

// 中间件用于异步action的触发，这在React-redux库中使用。用于连接redux和react视图层
export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    const store = createStore(...args);
    let dispatch = () => {
      throw new Error(
        `Dispatching while constructing your middleware is not allowed. ` +
          `Other middleware would not be applied to this dispatch.`
      );
    };

    // 每个middleware函数接受的第一个参数({getState,dispatch})中dispatch应该为store.dispatch最原生的函数
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    };

    // 根据下面定义，中间件函数接收的一个参数为{getState,dispatch}，然后接收next函数参数和action参数
    const chain = middlewares.map(middleware => middleware(middlewareAPI));

    // 这个dispatch得到了增强，而store.dispatch表示最原始的只能接受普通action对象的dispatch函数。
    // 注意中间件通过compose函数合成为“洋葱结构”，
    // 而在接受action时，根据action的类别来剥洋葱操作
    dispatch = compose(...chain)(store.dispatch);

    // 注意下面的store对象具有getState、 dispatch、 subscribe,replaceReducer等方法
    // 因此下面dispatch已经覆盖了store原本的dispatch行为
    return {
      ...store,
      dispatch
    };
  };
}
