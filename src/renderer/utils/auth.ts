import { ipcRenderer } from 'electron'
import { message } from 'antd'

export const checkLoginStatus = async () => {
  try {
    const auth = await ipcRenderer.invoke('get-auth')

    const email = localStorage.getItem('user_email') || ''

    if (!auth?.token || !email) {
      return {
        isLoggedIn: false,
        message: '로그인이 필요합니다.',
      }
    }

    const status = await ipcRenderer.invoke('check-login-status', {
      email,
      token: auth.token,
    })

    if (!status.login && status.message) {
      message.error(status.message)
    }

    return {
      isLoggedIn: status.login,
      message: status.message,
    }
  } catch (err) {
    console.error('로그인 상태 확인 실패:', err)
    return {
      isLoggedIn: false,
      message: '로그인 상태 확인 실패',
    }
  }
}

export const login = async (values: { email: string; password: string }) => {
  try {
    const result = await ipcRenderer.invoke('login', values)

    if (result.success) {
      localStorage.setItem('user_email', values.email)
      await ipcRenderer.invoke('save-auth', {
        email: result.email,
        token: result.token,
      })
      message.success('로그인 성공')
      return { success: true }
    } else {
      message.error(result.message || '로그인 실패')
      await ipcRenderer.invoke('clear-auth')
      return { success: false, message: result.message }
    }
  } catch (err) {
    message.error('로그인 실패')
    await ipcRenderer.invoke('clear-auth')
    return { success: false, message: '로그인 실패' }
  }
}
