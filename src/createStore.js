// 用于将一个对象变成可被观察对象，只要该对象实现了key为$$observable的接口即可
// 在RxJS、XStream库等使用
import $$observable from "symbol-observable";

import ActionTypes from "./utils/actionTypes";
import isPlainObject from "./utils/isPlainObject";

/**
 * 根据参数创建store对象
 * @param {*} reducer 真正处理状态更新的函数，由开发者定义
 * @param {*} preloadedState redux的初始状态，由开发者定义
 * @param {*} enhancer 中间件增强，用于处理异步action
 */
export default function createStore(reducer, preloadedState, enhancer) {
  // preloadedState默认为对象类型，如果是函数类型则一般是enhancer参数
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

  // 当指向同一个引用，则需要通过slice()生成新的监听器数组
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

    // 创建两个listeners数组，nextListeners数组的push操作不影响currentListeners
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

      // 下面操作用于将订阅的监听器从事件数组中移除
      ensureCanMutateNextListeners();
      const index = nextListeners.indexOf(listener);
      nextListeners.splice(index, 1);
    };
  }

  // store的dispatch方法
  function dispatch(action) {
    // 最终store.dispatch的action是一个普通对象，针对异步action
    // 实际上是一种thunk方式来延迟下面的代码执行
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

    
    // 当修改state后会执行一系列回调函数，这种机制给react-redux提供了接口
    // 在react-redux库中修改了state后，通过执行监听函数来触发
    // react的props更新渲染流程
    const listeners = (currentListeners = nextListeners);
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i];
      listener();
    }

    return action;
  }

  /**
   * 在按需加载应用中，通过该方法实现对reducer的热替换
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

  // 在createStore函数体执行尾部调用实现redux初始化过程
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
