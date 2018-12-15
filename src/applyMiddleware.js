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

    // 注意，下面lambda表达式中dispatch函数并没有明确指向，只有在真正调用的时候才会绑定
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    };

    // 根据下面定义，中间件函数接收的一个参数为{getState,dispatch}，然后接收next函数参数和action参数
    const chain = middlewares.map(middleware => middleware(middlewareAPI));

    // 这个dispatch得到了增强
    dispatch = compose(...chain)(store.dispatch);

    // 注意下面的store对象具有getState、 dispatch、 subscribe,replaceReducer等方法
    // 因此下面dispatch已经覆盖了store原本的dispatch行为
    return {
      ...store,
      dispatch
    };
  };
}
