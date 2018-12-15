import ActionTypes from "./utils/actionTypes";
import warning from "./utils/warning";
import isPlainObject from "./utils/isPlainObject";

// 所有触发的action都必须经过reduce处理，不然抛出异常
function getUndefinedStateErrorMessage(key, action) {
  const actionType = action && action.type;
  const actionDescription =
    (actionType && `action "${String(actionType)}"`) || "an action";

  return (
    `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state. ` +
    `If you want this reducer to hold no value, you can return null instead of undefined.`
  );
}

// 当前的combinedReducers与给定的state一定要匹配
// 即state的状态与combinedReducer一一映射
function getUnexpectedStateShapeWarningMessage(
  inputState,
  reducers,
  action,
  unexpectedKeyCache
) {
  // reducers表示传入给combinedReducers函数的参数
  // 创建新的store时，会自动dispatch type为ActionTypes.INIT的内置对象
  // 在reducer中利用预置的state进行初始化，注意preloadedState可能来自SSR
  // 服务端渲染得到的状态对象
  const reducerKeys = Object.keys(reducers);
  const argumentName =
    action && action.type === ActionTypes.INIT
      ? "preloadedState argument passed to createStore"
      : "previous state received by the reducer";

  // state的状态只能通过reducer修改，因此必须传递reducer函数
  if (reducerKeys.length === 0) {
    return (
      "Store does not have a valid reducer. Make sure the argument passed " +
      "to combineReducers is an object whose values are reducers."
    );
  }

  // state必须时普通对象
  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    );
  }

  // 注意由于每个reducer都会产生一个局部state对象，因此为了区分，
  // store的全局state利用combinedReducer函数的参数的key来区别

  // 如果局部state没有对应的reducer函数，并且该局部state在应用中正常需要
  const unexpectedKeys = Object.keys(inputState).filter(
    key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
  );

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true;
  });

  // 如果发生reducer的替换动作，则不会抛出错误
  if (action && action.type === ActionTypes.REPLACE) return;

  // 当全局state对象中存在局部state没有对应的reducer函数，则抛出错误
  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? "keys" : "key"} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    );
  }
}

// 验证reducer的编程形式是否合法
function assertReducerShape(reducers) {
  Object.keys(reducers).forEach(key => {
    const reducer = reducers[key];

    // 下面这种形式，其实就是将reducer第一个参数设置为默认的initialState状态
    const initialState = reducer(undefined, { type: ActionTypes.INIT });

    // 注意，在store创建后每个reducer对应的局部state不能为undefeated
    if (typeof initialState === "undefined") {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
          `If the state passed to the reducer is undefined, you must ` +
          `explicitly return the initial state. The initial state may ` +
          `not be undefined. If you don't want to set a value for this reducer, ` +
          `you can use null instead of undefined.`
      );
    }

    // 测试reducer对于具有随机类型的action是否能正常处理
    const type =
      "@@redux/PROBE_UNKNOWN_ACTION_" +
      Math.random()
        .toString(36)
        .substring(7)
        .split("")
        .join(".");
    if (typeof reducer(undefined, { type }) === "undefined") {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle ${
            ActionTypes.INIT
          } or other actions in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current state for any unknown actions, unless it is undefined, ` +
          `in which case you must return the initial state, regardless of the ` +
          `action type. The initial state may not be undefined, but can be null.`
      );
    }
  });
}

//  这是主要函数
export default function combineReducers(reducers) {
  // 获得所有reducer函数的key
  const reducerKeys = Object.keys(reducers);
  const finalReducers = {};
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i];

    // 在开发环境中，reducers对象的key必须对应reducer函数
    if (process.env.NODE_ENV !== "production") {
      if (typeof reducers[key] === "undefined") {
        warning(`No reducer provided for key "${key}"`);
      }
    }

    // 所以finalReducers对象包含所有reducer
    if (typeof reducers[key] === "function") {
      finalReducers[key] = reducers[key];
    }
  }
  const finalReducerKeys = Object.keys(finalReducers);

  let unexpectedKeyCache;
  // 在开发环境记录异常情况的对象
  if (process.env.NODE_ENV !== "production") {
    unexpectedKeyCache = {};
  }

  let shapeAssertionError;
  try {
    // 验证所有reducer的编程形式是否合法
    assertReducerShape(finalReducers);
  } catch (e) {
    shapeAssertionError = e;
  }

  return function combination(state = {}, action) {
    if (shapeAssertionError) {
      throw shapeAssertionError;
    }

    // 开发环境下下，对全局state和全局reducer的合法性判断
    // 由于state的状态只能由对应的reducer修改，因此需要一一映射
    if (process.env.NODE_ENV !== "production") {
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalReducers,
        action,
        unexpectedKeyCache
      );
      if (warningMessage) {
        warning(warningMessage);
      }
    }

    let hasChanged = false;
    const nextState = {};
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i];
      const reducer = finalReducers[key];

      // 全局state对象根据key划分为若干局部state对象
      const previousStateForKey = state[key];

      const nextStateForKey = reducer(previousStateForKey, action);
      if (typeof nextStateForKey === "undefined") {
        const errorMessage = getUndefinedStateErrorMessage(key, action);
        throw new Error(errorMessage);
      }
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    return hasChanged ? nextState : state;
  };
}
