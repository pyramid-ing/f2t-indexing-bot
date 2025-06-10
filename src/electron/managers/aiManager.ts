import { ChatAnthropic } from '@langchain/anthropic'
import { ChatOpenAI } from '@langchain/openai'
import { utils } from '../utils'

import Anthropic from '@anthropic-ai/sdk'

export const aiManager = {
  async generateOpenAiReply(question: string, apiKey: string): Promise<string> {
    try {
      const chatModel = new ChatOpenAI({
        openAIApiKey: apiKey,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
      })
      const response = await chatModel.invoke([
        { role: 'system', content: '너는 친절하고 전문적인 전문가 AI 어시스턴트야.' },
        { role: 'user', content: `지식채널 궁금증 질문:\n${question}` },
      ])
      return response.text.trim()
    } catch (err) {
      utils.sendLogToRenderer('OpenAI 오류:' + err, 'error')
      throw err
    }
  },

  async generateClaudeReply(question: string, apiKey: string): Promise<string> {
    try {
      const chatModel = new ChatAnthropic({
        anthropicApiKey: apiKey,
        model: 'claude-2',
        temperature: 0.7,
      })
      const response = await chatModel.invoke([
        { role: 'system', content: '너는 친절하고 전문적인 전문가 AI야.' },
        { role: 'user', content: `지식채널 궁금증 질문:\n${question}` },
      ])
      return response.text.trim()
    } catch (err) {
      utils.sendLogToRenderer('Claude 오류:' + err, 'error')
      throw err
    }
  },

  async generateNaverBillCaptchaAnswer(
    base64Image: string,
    aiProvider: string,
    apiKey: string,
    questionText?: string,
  ): Promise<string | null> {
    try {
      let prompt = `질문: ${questionText}`
      let answer = ''

      switch (aiProvider) {
        case 'openai': {
          const chatModel = new ChatOpenAI({
            openAIApiKey: apiKey,
            model: 'gpt-4-vision-preview',
            temperature: 0.2,
          })
          const response = await chatModel.invoke([
            { role: 'system', content: '이미지와 질문을 보고 답만 반환하세요.' },
            { role: 'user', content: prompt + `data:image/png;base64,${base64Image}` },
          ])
          answer = response.text.trim()
          break
        }
        case 'claude': {
          const anthropic = new Anthropic({
            apiKey,
          })
          const response = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 1000,
            temperature: 1,
            system:
              '첨부된 이미지는 캡챠용 이미지야. 일부러 알아보기 어렵게 되있어. 이점을 감안해서 이미지와 질문을 보고 답만 반환하세요. 숫자가 포함된거는 숫자만 반환하세요. 숫자의경우 ,는 표시하지말고 숫자만 반환하세요. 예시) 1,000 -> 1000',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/png',
                      data: base64Image,
                    },
                  },
                  {
                    type: 'text',
                    text: prompt,
                  },
                ],
              },
            ],
          })
          if (Array.isArray(response.content)) {
            answer = (response.content[0] as any).text?.trim() ?? ''
          } else {
            answer = (response.content as string).trim()
          }
          break
        }
        default:
          throw new Error('지원하지 않는 AI Provider입니다.')
      }
      // 숫자/문자만 추출
      return answer
    } catch (err) {
      utils.sendLogToRenderer('AI 캡차 해제 오류:' + err, 'error')
      throw err
    }
  },

  async generateOpenAiReplyWithImage(question: string, apiKey: string, images: string[]): Promise<string> {
    try {
      utils.sendLogToRenderer('🤖 OpenAI API로 이미지 포함 답변 생성 중...')

      const imageContents = images.map(imageUrl => ({
        type: 'image_url' as const,
        image_url: { url: imageUrl },
      }))

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: question }, ...imageContents],
            },
          ],
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API 오류: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (err) {
      utils.sendLogToRenderer(`❌ OpenAI API 오류: ${err}`, 'error')
      throw err
    }
  },

  async generateClaudeReplyWithImage(question: string, apiKey: string, images: string[]): Promise<string> {
    try {
      utils.sendLogToRenderer('🤖 Claude API로 이미지 포함 답변 생성 중...')

      const imageContents = images.map(imageUrl => ({
        type: 'image' as const,
        source: {
          type: 'url' as const,
          url: imageUrl,
        },
      }))

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: [{ type: 'text', text: question }, ...imageContents],
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Claude API 오류: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.content[0].text
    } catch (err) {
      utils.sendLogToRenderer(`❌ Claude API 오류: ${err}`, 'error')
      throw err
    }
  },
}
