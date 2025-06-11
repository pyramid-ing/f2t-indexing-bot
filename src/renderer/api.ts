import axios from 'axios'

const API_BASE_URL = 'http://localhost:3030'

export async function registerNaverIndex() {
  const res = await axios.post(`${API_BASE_URL}/naver-indexer/manual-index`, {
    headless: false,
    siteUrl: 'https://pyramid-ing.com',
    urlsToIndex: ['https://pyramid-ing.com'],
    naverId: 'kimchulki77',
    naverPw: '.uwp.Ws9@Y',
  })
  return res
}

// Google Blogger API 함수들
export async function getBloggerPosts(options: {
  blogId?: string
  blogUrl?: string
  accessToken: string
  maxResults?: number
  pageToken?: string
  status?: 'live' | 'draft' | 'scheduled'
}) {
  const res = await axios.post(`${API_BASE_URL}/google-blogger/posts`, options)
  return res
}

export async function getBloggerUserBlogs(accessToken: string) {
  const res = await axios.get(`${API_BASE_URL}/google-blogger/user/blogs`, {
    params: { accessToken },
  })
  return res
}

export async function getBloggerInfo(blogUrl: string, accessToken: string) {
  const res = await axios.post(`${API_BASE_URL}/google-blogger/blogs/by-url`, {
    blogUrl,
    accessToken,
  })
  return res
}

export async function getBloggerPost(blogId: string, postId: string, accessToken: string) {
  const res = await axios.get(`${API_BASE_URL}/google-blogger/blogs/${blogId}/posts/${postId}`, {
    params: { accessToken },
  })
  return res
}
