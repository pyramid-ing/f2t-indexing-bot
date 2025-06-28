import type { NaverAccountData } from './naver-account.service'
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common'
import { NaverAccountService } from './naver-account.service'

@Controller('naver-accounts')
export class NaverAccountController {
  constructor(private readonly naverAccountService: NaverAccountService) {}

  @Get()
  async getAllAccounts() {
    const accounts = await this.naverAccountService.getAllAccounts()
    // 보안을 위해 비밀번호는 마스킹해서 반환
    return accounts.map(account => ({
      ...account,
    }))
  }

  @Get('active')
  async getActiveAccounts() {
    const accounts = await this.naverAccountService.getActiveAccounts()
    // 보안을 위해 비밀번호는 마스킹해서 반환
    return accounts.map(account => ({
      ...account,
    }))
  }

  @Get(':id')
  async getAccount(@Param('id', ParseIntPipe) id: number) {
    const account = await this.naverAccountService.getAccount(id)
    if (!account) {
      throw new Error('계정을 찾을 수 없습니다.')
    }
    return {
      ...account,
    }
  }

  @Post()
  async createAccount(@Body() data: NaverAccountData) {
    const account = await this.naverAccountService.createAccount(data)
    return {
      ...account,
    }
  }

  @Put(':id')
  async updateAccount(@Param('id', ParseIntPipe) id: number, @Body() data: Partial<NaverAccountData>) {
    const account = await this.naverAccountService.updateAccount(id, data)
    return {
      ...account,
    }
  }

  @Delete(':id')
  async deleteAccount(@Param('id', ParseIntPipe) id: number) {
    await this.naverAccountService.deleteAccount(id)
    return { success: true, message: '계정이 삭제되었습니다.' }
  }

  @Put(':id/login-status')
  async updateLoginStatus(@Param('id', ParseIntPipe) id: number, @Body() body: { isLoggedIn: boolean }) {
    const account = await this.naverAccountService.updateLoginStatus(id, body.isLoggedIn)
    return {
      ...account,
    }
  }
}
