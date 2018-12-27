export default function warning(message) {
  // console对象由宿主执行环境确定
  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error(message);
  }
  try {
    // 抛出异常
    throw new Error(message);
  } catch (e) {}
}
