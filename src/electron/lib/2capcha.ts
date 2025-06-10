import axios from 'axios'

/**
 * 2Captcha - createTask / getTaskResult 예시
 * @param apiKey 2Captcha API Key
 * @param imageBase64 base64 인코딩된 이미지(헤더없이 순수 base64만)
 */
export async function solveImageCaptcha(apiKey: string, imageBase64: string): Promise<string> {
  // 1) createTask
  const createTaskUrl = 'https://api.2captcha.com/createTask'
  const payload = {
    clientKey: apiKey,
    task: {
      type: 'ImageToTextTask',
      body: imageBase64, // "R0lGODl..." etc
      phrase: false,
      case: false,
      numeric: 0,
      math: false,
      minLength: 0,
      maxLength: 0,
    },
    languagePool: 'en',
  }

  let createTaskResp
  try {
    createTaskResp = await axios.post(createTaskUrl, payload)
  } catch (err) {
    throw new Error('2Captcha createTask API 오류:' + err)
  }

  // 예: { "errorId":0, "taskId":123456789 }
  if (createTaskResp.data.errorId !== 0) {
    throw new Error(`createTask 실패: ${createTaskResp.data.errorCode} / ${createTaskResp.data.errorDescription}`)
  }
  const taskId = createTaskResp.data.taskId
  console.log('2Captcha task 생성:', taskId)

  // 2) getTaskResult
  const getTaskUrl = 'https://api.2captcha.com/getTaskResult'
  while (true) {
    await new Promise(res => setTimeout(res, 5000)) // 5초 대기

    let taskResultResp
    try {
      taskResultResp = await axios.post(getTaskUrl, {
        clientKey: apiKey,
        taskId,
      })
    } catch (err) {
      throw new Error('2Captcha getTaskResult API 오류:' + err)
    }

    // 예:
    // {
    //   "errorId": 0,
    //   "status": "ready",
    //   "solution": { "text": "hello" }
    // }
    if (taskResultResp.data.errorId !== 0) {
      throw new Error(`getTaskResult 실패: ${taskResultResp.data.errorCode} / ${taskResultResp.data.errorDescription}`)
    }

    if (taskResultResp.data.status === 'ready') {
      // 인식 성공
      const recognized = taskResultResp.data.solution.text
      console.log('🎉 2Captcha 인식 결과:', recognized)
      return recognized
    } else if (taskResultResp.data.status === 'processing') {
      console.log('2Captcha 아직 처리중, 재시도합니다')
      continue
    } else {
      throw new Error(`알 수 없는 상태: ${taskResultResp.data.status}`)
    }
  }
}
