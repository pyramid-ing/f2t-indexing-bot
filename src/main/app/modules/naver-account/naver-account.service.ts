import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@main/app/modules/common/prisma/prisma.service'
import { CreateNaverAccountDto } from './dto/create-naver-account.dto'
import { UpdateNaverAccountDto } from './dto/update-naver-account.dto'

@Injectable()
export class NaverAccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllAccounts() {
    return this.prisma.naverAccount.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        site: true, // 사이트 정보 포함
      },
    })
  }

  async getActiveAccounts() {
    return this.prisma.naverAccount.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        site: true, // 사이트 정보 포함
      },
    })
  }

  async getAccountById(id: number) {
    const account = await this.prisma.naverAccount.findUnique({
      where: { id },
      include: {
        site: true, // 사이트 정보 포함
      },
    })

    if (!account) {
      throw new NotFoundException(`네이버 계정을 찾을 수 없습니다. (ID: ${id})`)
    }

    return account
  }

  async getAccountByNaverId(naverId: string) {
    return this.prisma.naverAccount.findUnique({
      where: { naverId },
      include: {
        site: true, // 사이트 정보 포함
      },
    })
  }

  async createAccount(data: CreateNaverAccountDto) {
    // 중복 네이버 아이디 확인
    const existing = await this.getAccountByNaverId(data.naverId)
    if (existing) {
      throw new Error(`이미 등록된 네이버 아이디입니다: ${data.naverId}`)
    }

    // 사이트 존재 여부 확인
    const site = await this.prisma.site.findUnique({
      where: { id: data.siteId },
    })
    if (!site) {
      throw new NotFoundException(`사이트를 찾을 수 없습니다. (ID: ${data.siteId})`)
    }

    return this.prisma.naverAccount.create({
      data: {
        name: data.name,
        naverId: data.naverId,
        password: data.password,
        isActive: data.isActive ?? true,
        site: {
          connect: { id: data.siteId },
        },
      },
      include: {
        site: true, // 생성된 계정의 사이트 정보 포함
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

    // 사이트 ID가 변경되는 경우 존재 여부 확인
    if (data.siteId) {
      const site = await this.prisma.site.findUnique({
        where: { id: data.siteId },
      })
      if (!site) {
        throw new NotFoundException(`사이트를 찾을 수 없습니다. (ID: ${data.siteId})`)
      }
    }

    const { siteId, ...updateData } = data

    return this.prisma.naverAccount.update({
      where: { id },
      data: {
        ...updateData,
        site: siteId
          ? {
              connect: { id: siteId },
            }
          : undefined,
      },
      include: {
        site: true, // 업데이트된 계정의 사이트 정보 포함
      },
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

    return this.prisma.naverAccount.update({
      where: { naverId },
      data: {
        isLoggedIn,
        lastLogin: lastLogin || (isLoggedIn ? new Date() : account.lastLogin),
      },
    })
  }
}
