// store对象包含getState、dispatch、subscribe和replaceReducer等方法
import createStore from "./createStore";

// 项目中不同模块的reducer需要合成到一个大的reducer，来映射store的state树
import combineReducers from "./combineReducers";

// 将actionCreator函数与dispatch方法的绑定
import bindActionCreators from "./bindActionCreators";

// 用于增强store能力的函数，在dispatch触发action时通过中间件来拦截功能
import applyMiddleware from "./applyMiddleware";

// 函数列表的合成
import compose from "./compose";

// 在开发环境的warning函数
import warning from "./utils/warning";

// 特殊的action类型被redux自身持有，因此开发者不要使用
import __DO_NOT_USE__ActionTypes from "./utils/actionTypes";

//测试函数，如果在非生产环境下经过代码压缩处理则函数名字发生变化
function isCrushed() {}

// isCrushed用于指示redux库是否被压缩，因为redux源码在生产环境下进行了压缩
if (
  process.env.NODE_ENV !== "production" &&
  typeof isCrushed.name === "string" &&
  isCrushed.name !== "isCrushed"
) {
  warning(
    'You are currently using minified code outside of NODE_ENV === "production". ' +
      "This means that you are running a slower development build of Redux. " +
      "You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify " +
      "or setting mode to production in webpack (https://webpack.js.org/concepts/mode/) " +
      "to ensure you have the correct code for your production build."
  );
}

// 开发者处理异步action就是基于applyMiddleware方法来拦截store.dispatch的行为
// 开发者编写自己的redux中间件，也需要遵循({getState,dispatch})=>next=>action这种编程形式
export {
  createStore,
  combineReducers,
  bindActionCreators,
  applyMiddleware,
  compose,
  __DO_NOT_USE__ActionTypes
};
