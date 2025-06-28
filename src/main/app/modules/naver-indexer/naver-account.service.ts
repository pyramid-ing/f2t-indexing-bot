import { PrismaService } from '@main/app/shared/prisma.service'
import { Injectable, Logger } from '@nestjs/common'

export interface NaverAccountData {
  id?: number
  name: string
  naverId: string
  password: string
  isActive?: boolean
  isLoggedIn?: boolean
}

@Injectable()
export class NaverAccountService {
  private readonly logger = new Logger(NaverAccountService.name)

  constructor(private readonly prisma: PrismaService) {}

  // 모든 네이버 계정 조회
  async getAllAccounts() {
    return this.prisma.naverAccount.findMany({
      orderBy: { createdAt: 'asc' },
    })
  }

  // 활성화된 네이버 계정만 조회
  async getActiveAccounts() {
    return this.prisma.naverAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    })
  }

  // 특정 계정 조회
  async getAccount(id: number) {
    return this.prisma.naverAccount.findUnique({
      where: { id },
    })
  }

  // 네이버 아이디로 계정 조회
  async getAccountByNaverId(naverId: string) {
    return this.prisma.naverAccount.findUnique({
      where: { naverId },
    })
  }

  // 네이버 계정 생성
  async createAccount(data: NaverAccountData) {
    // 중복 아이디 체크
    const existing = await this.getAccountByNaverId(data.naverId)
    if (existing) {
      throw new Error(`이미 등록된 네이버 아이디입니다: ${data.naverId}`)
    }

    return this.prisma.naverAccount.create({
      data: {
        name: data.name,
        naverId: data.naverId,
        password: data.password,
        isActive: data.isActive ?? true,
      },
    })
  }

  // 네이버 계정 수정
  async updateAccount(id: number, data: Partial<NaverAccountData>) {
    // naverId 중복 체크 (다른 계정과 중복되지 않는지)
    if (data.naverId) {
      const existing = await this.prisma.naverAccount.findFirst({
        where: {
          naverId: data.naverId,
          id: { not: id },
        },
      })
      if (existing) {
        throw new Error(`이미 등록된 네이버 아이디입니다: ${data.naverId}`)
      }
    }

    return this.prisma.naverAccount.update({
      where: { id },
      data,
    })
  }

  // 네이버 계정 삭제
  async deleteAccount(id: number) {
    return this.prisma.naverAccount.delete({
      where: { id },
    })
  }

  // 로그인 상태 업데이트
  async updateLoginStatus(id: number, isLoggedIn: boolean) {
    return this.prisma.naverAccount.update({
      where: { id },
      data: {
        isLoggedIn,
        lastLogin: isLoggedIn ? new Date() : undefined,
      },
    })
  }

  // 네이버 아이디로 로그인 상태 업데이트
  async updateLoginStatusByNaverId(naverId: string, isLoggedIn: boolean) {
    return this.prisma.naverAccount.updateMany({
      where: { naverId },
      data: {
        isLoggedIn,
        lastLogin: isLoggedIn ? new Date() : undefined,
      },
    })
  }
}
