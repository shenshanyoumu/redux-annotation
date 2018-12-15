function bindActionCreator(actionCreator, dispatch) {
    return function() {
        // 注意下面的arguments参数，而this上下文的指向问题
        return dispatch(actionCreator.apply(this, arguments))
    }
}
 
export default function bindActionCreators(actionCreators, dispatch) {
    
    // 如果actionCreators是函数，而不是普通对象
    if (typeof actionCreators === 'function') {
        return bindActionCreator(actionCreators, dispatch)
    }

    // 如果actionCreators即不是函数，也不是对象，则抛出错误
    if (typeof actionCreators !== 'object' || actionCreators === null) {
        throw new Error(
            `bindActionCreators expected an object or a function, instead received ${
        actionCreators === null ? 'null' : typeof actionCreators
      }. ` +
            `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
        )
    }

    // 将actionCreator和dispatch进行封装
    const keys = Object.keys(actionCreators)
    const boundActionCreators = {}
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        const actionCreator = actionCreators[key]
        if (typeof actionCreator === 'function') {
            boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
        }
    }
    return boundActionCreators
}