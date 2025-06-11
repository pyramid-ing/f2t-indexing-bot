import { execSync } from 'child_process'

export const TETHER_INTERFACE = 'enp0s20u2' // 환경에 맞게 수정

export function getCurrentIp() {
  try {
    const ip = execSync('curl -6 ifconfig.co -s').toString().trim()
    return { ip }
  } catch (e) {
    return { ip: '' }
  }
}

export function resetUsbTethering() {
  try {
    console.log('[ADB] USB 테더링 OFF')
    execSync('adb shell svc data disable')
    execSync('sleep 2')
    console.log('[ADB] USB 테더링 ON')
    execSync('adb shell svc data enable')
    execSync('sleep 5')
  } catch (e) {
    console.error('[ADB] 테더링 리셋 실패:', e.message)
  }
}

export async function checkIpChanged(prevIp: { ip: string }) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    resetUsbTethering()
    const newIp = getCurrentIp()
    console.log(`[IP체크] 이전: ${prevIp.ip} / 새로고침: ${newIp.ip}`)
    if (newIp.ip && newIp.ip !== prevIp.ip) {
      console.log(`[IP체크] IP 변경 성공: ${prevIp.ip} → ${newIp.ip}`)
      return newIp
    }
    if (attempt < 3) {
      console.log(`[IP체크] IP 변경 실패, ${attempt}회 재시도...`)
      await new Promise(res => setTimeout(res, 3000))
    }
  }
  throw new Error('3회 시도에도 IP가 변경되지 않았습니다. 중단합니다.')
}
