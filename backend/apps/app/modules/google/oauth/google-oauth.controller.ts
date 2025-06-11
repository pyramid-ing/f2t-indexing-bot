import { Controller, Get, Query, Res } from '@nestjs/common'
import { Response } from 'express'

@Controller('google-oauth')
export class GoogleOAuthController {
  @Get('callback')
  async handleCallback(@Query('code') code: string, @Query('error') error: string, @Res() res: Response) {
    if (error) {
      // OAuth 인증 실패
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth 인증 실패</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>OAuth 인증 실패</h1>
          <p>오류: ${error}</p>
          <p>이 창을 닫고 다시 시도해주세요.</p>
          <script>
            // 5초 후 창 닫기
            setTimeout(() => {
              window.close();
            }, 5000);
          </script>
        </body>
        </html>
      `)
    }

    if (!code) {
      // 인증 코드가 없음
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>OAuth 인증 오류</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>OAuth 인증 오류</h1>
          <p>인증 코드를 받지 못했습니다.</p>
          <p>이 창을 닫고 다시 시도해주세요.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 5000);
          </script>
        </body>
        </html>
      `)
    }

    // 인증 성공 - 코드를 사용자에게 표시
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth 인증 성공</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
          }
          .code-box {
            background-color: #f5f5f5;
            border: 2px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
          }
          .copy-btn {
            background-color: #1890ff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin: 10px;
          }
          .copy-btn:hover {
            background-color: #40a9ff;
          }
        </style>
      </head>
      <body>
        <h1>✅ Google OAuth 인증 성공!</h1>
        <p>아래 인증 코드를 복사하여 애플리케이션에 입력해주세요:</p>
        
        <div class="code-box" id="authCode">${code}</div>
        
        <button class="copy-btn" onclick="copyCode()">📋 코드 복사</button>
        <button class="copy-btn" onclick="window.close()">창 닫기</button>
        
        <p style="color: #666; margin-top: 30px;">
          <small>이 코드는 보안을 위해 한 번만 사용할 수 있습니다.<br>
          애플리케이션으로 돌아가서 코드를 입력해주세요.</small>
        </p>

        <script>
          function copyCode() {
            const codeElement = document.getElementById('authCode');
            const code = codeElement.textContent;
            
            if (navigator.clipboard) {
              navigator.clipboard.writeText(code).then(() => {
                alert('인증 코드가 클립보드에 복사되었습니다!');
              }).catch(() => {
                fallbackCopy(code);
              });
            } else {
              fallbackCopy(code);
            }
          }
          
          function fallbackCopy(text) {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
              document.execCommand('copy');
              alert('인증 코드가 클립보드에 복사되었습니다!');
            } catch (err) {
              alert('복사에 실패했습니다. 코드를 수동으로 선택하여 복사해주세요.');
            }
            document.body.removeChild(textArea);
          }
          
          // 페이지 로드 후 자동으로 코드 선택
          window.onload = function() {
            const codeElement = document.getElementById('authCode');
            if (window.getSelection && document.createRange) {
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(codeElement);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          };
        </script>
      </body>
      </html>
    `)
  }
}
