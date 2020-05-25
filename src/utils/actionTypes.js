// 在初始化state的时候，redux会自动调用下面的action;
// 开发者不要显式调用下面的action类型。
// JS知识点：toString(?radix)，可选参数radix范围为[2,36]
const ActionTypes = {
  INIT:
    "@@redux/INIT" +
    Math.random()
      .toString(36)
      .substring(7)
      .split("")
      .join("."),
  REPLACE:
    "@@redux/REPLACE" +
    Math.random()
      .toString(36)
      .substring(7)
      .split("")
      .join(".")
};

export default ActionTypes;
