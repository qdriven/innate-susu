/** 日志脱敏：URL 查询串中的 token/k/key 参数值替换为 [redacted]。
 * 运行态（URL 捕获、状态、认证）仍持真实值；一切日志输出必须先过此边界。 */
const SECRET_QUERY_KEYS = 'token|k|key'

export function redactLaunchSecrets(text: string): string {
  return text.replace(
    new RegExp(`([?&])(${SECRET_QUERY_KEYS})=([^&\\s]+)`, 'gi'),
    (all, sep: string, name: string, value: string) => (value === '' ? all : `${sep}${name}=[redacted]`),
  )
}
