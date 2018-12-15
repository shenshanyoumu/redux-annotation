import $$observable from "symbol-observable";

import ActionTypes from "./utils/actionTypes";
import isPlainObject from "./utils/isPlainObject";

// preloadedState只能是对象，但是createStore函数还是给开发者提供了多种调用方式
export default function createStore(reducer, preloadedState, enhancer) {
  // 开发者两个参数的调用形式，则第二个参数自动转为enhancer
  if (typeof preloadedState === "function" && typeof enhancer === "undefined") {
    enhancer = preloadedState;
    preloadedState = undefined;
  }

  if (typeof enhancer !== "undefined") {
    //  如果增强器不是函数，则报错
    if (typeof enhancer !== "function") {
      throw new Error("Expected the enhancer to be a function.");
    }

    // 先对createStore函数增强，然后再调用store生成函数
    // 一般enhancer函数就是applyMiddleware函数，用于实现异步action动作
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
    // action要么是普通对象，要么需要中间件配合
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

  // 在reducer中当action的type没有对应的处理器处理，则返回原来的state对象
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

      [$$observable]() {
        return this;
      }
    };
  }

  // 在store对象创建后，调用下面代码初始化各个reducer的初始状态
  dispatch({ type: ActionTypes.INIT });

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  };
}
