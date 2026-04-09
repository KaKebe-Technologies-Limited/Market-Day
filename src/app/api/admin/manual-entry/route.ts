import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'MKD-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function checkAuth(req: NextRequest) {
  return req.headers.get('x-admin-password') === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, phone, paid } = await req.json()
  if (!name || !phone) return NextResponse.json({ error: 'Name and phone required' }, { status: 400 })

  let code = generateCode()
  for (let i = 0; i < 10; i++) {
    const ex = await prisma.entry.findUnique({ where: { code } })
    if (!ex) break
    code = generateCode()
  }

  const entry = await prisma.entry.create({
    data: { name, phone, code, paid: !!paid, used: false, walkin: true },
  })
  return NextResponse.json({ entry })
}
