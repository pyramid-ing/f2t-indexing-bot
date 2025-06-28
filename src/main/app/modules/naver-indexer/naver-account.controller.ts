import type { CreateNaverAccountDto, UpdateNaverAccountDto } from './naver-account.service'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { NaverAccountService } from './naver-account.service'

@Controller('naver-accounts')
export class NaverAccountController {
  constructor(private readonly naverAccountService: NaverAccountService) {}

  @Get()
  async getAllAccounts() {
    const accounts = await this.naverAccountService.getAllAccounts()
    return { success: true, data: accounts }
  }

  @Get('active')
  async getActiveAccounts() {
    const accounts = await this.naverAccountService.getActiveAccounts()
    return { success: true, data: accounts }
  }

  @Get('naver-id/:naverId')
  async getAccountByNaverId(@Param('naverId') naverId: string) {
    const account = await this.naverAccountService.getAccountByNaverId(naverId)
    return { success: true, data: account }
  }

  @Get(':id')
  async getAccountById(@Param('id') id: string) {
    const account = await this.naverAccountService.getAccountById(Number.parseInt(id, 10))
    return { success: true, data: account }
  }

  @Post()
  async createAccount(@Body() createDto: CreateNaverAccountDto) {
    const account = await this.naverAccountService.createAccount(createDto)
    return { success: true, data: account, message: '네이버 계정이 생성되었습니다.' }
  }

  @Put(':id')
  async updateAccount(@Param('id') id: string, @Body() updateDto: UpdateNaverAccountDto) {
    const account = await this.naverAccountService.updateAccount(Number.parseInt(id, 10), updateDto)
    return { success: true, data: account, message: '네이버 계정이 업데이트되었습니다.' }
  }

  @Delete(':id')
  async deleteAccount(@Param('id') id: string) {
    const result = await this.naverAccountService.deleteAccount(Number.parseInt(id, 10))
    return result
  }

  @Put('naver-id/:naverId/login-status')
  async updateLoginStatus(
    @Param('naverId') naverId: string,
    @Body() body: { isLoggedIn: boolean, lastLogin?: string },
  ) {
    const lastLogin = body.lastLogin ? new Date(body.lastLogin) : undefined
    const account = await this.naverAccountService.updateLoginStatus(
      naverId,
      body.isLoggedIn,
      lastLogin,
    )
    return { success: true, data: account, message: '로그인 상태가 업데이트되었습니다.' }
  }
}
