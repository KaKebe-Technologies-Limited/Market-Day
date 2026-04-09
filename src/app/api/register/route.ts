import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import QRCode from 'qrcode'

const prisma = new PrismaClient()

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'MKD-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export async function POST(req: NextRequest) {
  try {
    const { name, phone } = await req.json()
    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    // Generate unique code (retry if collision)
    let code = generateCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await prisma.entry.findUnique({ where: { code } })
      if (!existing) break
      code = generateCode()
      attempts++
    }

    const entry = await prisma.entry.create({
      data: { name, phone, code, paid: false, used: false, walkin: false },
    })

    const qrDataUrl = await QRCode.toDataURL(code, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })

    return NextResponse.json({ name: entry.name, code: entry.code, qrDataUrl })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
