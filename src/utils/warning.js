export default function warning(message) {
  // 在浏览器环境下的console全局对象
  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error(message);
  }
  try {
    // 抛出异常
    throw new Error(message);
  } catch (e) {}
}
