import axios from 'axios'

export async function registerNaverIndex() {
  const res = await axios.post('http://localhost:3030/naver-indexer/manual-index', {
    headless: false,
    siteUrl: 'https://pyramid-ing.com',
    urlsToIndex: ['https://pyramid-ing.com'],
    naverId: 'kimchulki77',
    naverPw: '.uwp.Ws9@Y',
  })
  return res
}
