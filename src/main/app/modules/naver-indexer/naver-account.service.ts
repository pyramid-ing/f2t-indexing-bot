import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/main/app/shared/prisma.service'

export interface CreateNaverAccountDto {
  name: string
  naverId: string
  password: string
  isActive?: boolean
}

export interface UpdateNaverAccountDto {
  name?: string
  naverId?: string
  password?: string
  isActive?: boolean
  isLoggedIn?: boolean
  lastLogin?: Date
}

@Injectable()
export class NaverAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllAccounts() {
    return await this.prisma.naverAccount.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async getActiveAccounts() {
    return await this.prisma.naverAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getAccountById(id: number) {
    const account = await this.prisma.naverAccount.findUnique({
      where: { id },
    })

    if (!account) {
      throw new NotFoundException(`네이버 계정을 찾을 수 없습니다. (ID: ${id})`)
    }

    return account
  }

  async getAccountByNaverId(naverId: string) {
    return await this.prisma.naverAccount.findUnique({
      where: { naverId },
    })
  }

  async createAccount(data: CreateNaverAccountDto) {
    // 중복 네이버 아이디 확인
    const existing = await this.getAccountByNaverId(data.naverId)
    if (existing) {
      throw new Error(`이미 등록된 네이버 아이디입니다: ${data.naverId}`)
    }

    return await this.prisma.naverAccount.create({
      data: {
        name: data.name,
        naverId: data.naverId,
        password: data.password,
        isActive: data.isActive ?? true,
      },
    })
  }

  async updateAccount(id: number, data: UpdateNaverAccountDto) {
    // 계정 존재 확인
    await this.getAccountById(id)

    // 네이버 아이디 중복 확인 (변경하는 경우)
    if (data.naverId) {
      const existing = await this.getAccountByNaverId(data.naverId)
      if (existing && existing.id !== id) {
        throw new Error(`이미 등록된 네이버 아이디입니다: ${data.naverId}`)
      }
    }

    return await this.prisma.naverAccount.update({
      where: { id },
      data,
    })
  }

  async deleteAccount(id: number) {
    // 계정 존재 확인
    await this.getAccountById(id)

    await this.prisma.naverAccount.delete({
      where: { id },
    })

    return { success: true, message: '네이버 계정이 삭제되었습니다.' }
  }

  async updateLoginStatus(naverId: string, isLoggedIn: boolean, lastLogin?: Date) {
    const account = await this.getAccountByNaverId(naverId)
    if (!account) {
      throw new NotFoundException(`네이버 계정을 찾을 수 없습니다. (naverId: ${naverId})`)
    }

    return await this.prisma.naverAccount.update({
      where: { naverId },
      data: {
        isLoggedIn,
        lastLogin: lastLogin || (isLoggedIn ? new Date() : account.lastLogin),
      },
    })
  }
}
