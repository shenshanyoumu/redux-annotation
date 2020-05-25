// 用于将一个对象变成可被观察对象，只要该对象实现了key为$$observable的接口即可
// 在RxJS、XStream库等使用
import $$observable from "symbol-observable";

import ActionTypes from "./utils/actionTypes";
import isPlainObject from "./utils/isPlainObject";

/**
 * 根据参数创建store对象
 * @param {*} reducer 真正处理状态更新的函数
 * @param {*} preloadedState redux的初始状态
 * @param {*} enhancer 中间件增强
 */
export default function createStore(reducer, preloadedState, enhancer) {
  // 开发中两个参数的调用形式，则第二个参数自动转为enhancer
  if (typeof preloadedState === "function" && typeof enhancer === "undefined") {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== "undefined") {
    //  如果增强器不是函数，则报错
    if (typeof enhancer !== "function") {
      throw new Error("Expected the enhancer to be a function.");
    }

    //  这个return才是整个函数的出口，其中enhancer等价于applyMiddleware(...middlewares)执行后的返回函数。其执行步骤如下
    // （1）执行enhancer(createStore)，返回partial function
    // （2）执行enhancer(createStore)(reducer, preloadedState)。
    // 根据applyMiddleware函数的定义可知，会调用create(reducer,preloadedState)。因此会完整执行createStore函数体
    // 执行createStore函数返回的dispatch、subscribe等都是普通形式的函数
    // 在applyMiddleware定义中，普通的dispatch被中间件增强
    return enhancer(createStore)(reducer, preloadedState);
  }

  // 如果reducer不是函数，则报错
  if (typeof reducer !== "function") {
    throw new Error("Expected the reducer to be a function.");
  }

  let currentReducer = reducer;
  let currentState = preloadedState;
  let currentListeners = [];
  let nextListeners = currentListeners;

  // 对于一个应用来说，同时只能触发一个action
  let isDispatching = false;

  // 确保不会修改currentListeners监听函数数组
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice();
    }
  }

  //store的第一个方法，注意当有dispatch动作没有结束时会抛出错误
  function getState() {
    if (isDispatching) {
      throw new Error(
        "You may not call store.getState() while the reducer is executing. " +
          "The reducer has already received the state as an argument. " +
          "Pass it down from the top reducer instead of reading it from the store."
      );
    }

    return currentState;
  }

  //注册到state的listener，当state发生状态变化时调用
  function subscribe(listener) {
    if (typeof listener !== "function") {
      throw new Error("Expected the listener to be a function.");
    }

    if (isDispatching) {
      throw new Error(
        "You may not call store.subscribe() while the reducer is executing. " +
          "If you would like to be notified after the store has been updated, subscribe from a " +
          "component and invoke store.getState() in the callback to access the latest state. " +
          "See https://redux.js.org/api-reference/store#subscribe(listener) for more details."
      );
    }

    let isSubscribed = true;

    // 注意下面，新的listeners对象进行等修改不会影响currentListeners数组
    ensureCanMutateNextListeners();
    nextListeners.push(listener);

    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }

      if (isDispatching) {
        throw new Error(
          "You may not unsubscribe from a store listener while the reducer is executing. " +
            "See https://redux.js.org/api-reference/store#subscribe(listener) for more details."
        );
      }

      isSubscribed = false;

      // 不会修改currentListeners数组
      ensureCanMutateNextListeners();
      const index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }

  // store的dispatch方法
  function dispatch(action) {
    // action要么是普通对象，要么需要中间件配合来旁路下面的流程
    if (!isPlainObject(action)) {
      throw new Error(
        "Actions must be plain objects. " +
          "Use custom middleware for async actions."
      );
    }

    // action必须具备type字段
    if (typeof action.type === "undefined") {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          "Have you misspelled a constant?"
      );
    }

    // reducer正在处理，则本次dispatch不成功
    if (isDispatching) {
      throw new Error("Reducers may not dispatch actions.");
    }

    // 对于普通的action，在dispatch之后store会调用reducer来修改state状态
    // 而对于异步action，则下面的逻辑需要改变
    try {
      isDispatching = true;

      // 下面用于修改state状态,注意currentReducer不仅可能是单个reducer函数
      // 也可能是经过combinedReducers函数处理后的全新的reducer函数
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }

    // 注意下面，currentListeners被nextListeners赋值
    // 在dispatch触发后，依次调用subscribe到state对象上的所有监听器
    const listeners = (currentListeners = nextListeners);
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener();
    }

    return action;
  }

  /**
   * 在应用实现异步reducer时，需要下面方法来触发state状态数的重构
   * @param {*} nextReducer 需要被替换的reducer
   */
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== "function") {
      throw new Error("Expected the nextReducer to be a function.");
    }

    // 注意参数nextreducer并不一定只是单纯的一个reducer函数，也可以能是combinedReducer函数
    currentReducer = nextReducer;
    dispatch({ type: ActionTypes.REPLACE });
  }

  // 这个observable方法是针对其他采用观察者模式第三方库的接口
  function observable() {
    // 针对store的订阅行为，subscribe为函数
    const outerSubscribe = subscribe;
    return {
      //参数为观察者，也即是监听函数
      subscribe(observer) {
        if (typeof observer !== "object" || observer === null) {
          throw new TypeError("Expected the observer to be an object.");
        }

        // 如果观察者对象具有next方法，则调用store的getState返回新的state对象
        // 观察者对象具有next方法，其实就表明该对象可能是迭代器。在JS中迭代器越来越重视
        function observeState() {
          if (observer.next) {
            observer.next(getState());
          }
        }

        observeState();
        const unsubscribe = outerSubscribe(observeState);
        return {
          unsubscribe
        };
      },

      // 实现$$observable接口
      [$$observable]() {
        return this;
      }
    };
  }

  // 在store对象创建后，调用下面代码初始化state状态树
  dispatch({ type: ActionTypes.INIT });

  // 注意下面的dispatch、subscribe、getState等都只是普通形式的方法而已
  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  };
}
