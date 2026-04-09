import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function checkAuth(req: NextRequest) {
  const password = req.headers.get('x-admin-password')
  return password === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const entries = await prisma.entry.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  return NextResponse.json({ entries })
}
