import axios from 'axios'

const createAxiosInstance = async () => {
  try {
    const port = await window.electronAPI.getBackendPort()
    const instance = axios.create({
      baseURL: `http://localhost:${port}`,
    })
    return instance
  } catch (error) {
    console.error('Failed to create axios instance:', error)
    // 폴백 또는 기본 인스턴스 반환
    return axios.create({
      baseURL: `http://localhost:3030`, // 기본 포트
    })
  }
}

const axiosInstance = createAxiosInstance()

export default axiosInstance
