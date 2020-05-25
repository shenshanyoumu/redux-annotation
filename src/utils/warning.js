export default function warning(message) {
  // 注意console不是JS规范，而是宿主环境的实现
  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error(message);
  }
  try {
    // 抛出异常
    throw new Error(message);
  } catch (e) {}
}
