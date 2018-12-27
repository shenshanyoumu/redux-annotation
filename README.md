# redux-annotation

对前端 redux 库的代码注解,redux 库的实现遵循 FLUX 规范和 ELM 编程思想。

## 中间件的洋葱模型

compose.js 中核心代码注解

```
  // 最左边函数是合成后的最外层，相当于“洋葱结构”的外层。中间件的工作原理就是剥洋葱过程，通过next函数层层传递
  // 比如函数a相当于redux-thunk中间件，而b(...args)这个整体其实就是next，真正执行时传递action参数
  // (1)当action函数执行后返回形式为({dispatch,getState})=>{}的函数，则根据中间件定义将会执行({dispatch,getState})=>{}
  // (2)当action函数执行后返回普通的action对象，则执行b(...args)(action)，即next(action)
  // 注意b也是一个中间件；如果只有唯一的中间件a，则...args用store.dispatch替换也可行

  return funcs.reduce((a, b) => (...args) => a(b(...args)));
```

## 中间件的应用

applyMiddleware.js

```
    // 根据下面定义，中间件函数接收的一个参数为{getState,dispatch}，然后接收next函数参数和action参数
    const chain = middlewares.map(middleware => middleware(middlewareAPI));

    // 这个dispatch得到了增强，而store.dispatch表示最原始的只能接受普通action对象的dispatch函数。
    // 注意中间件通过compose函数合成为“洋葱结构”，
    // 而在接受action时，根据action的类别来剥洋葱操作
    dispatch = compose(...chain)(store.dispatch);
```
