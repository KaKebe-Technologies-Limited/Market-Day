import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json()
    if (!code) return NextResponse.json({ status: 'INVALID', message: 'No code provided' }, { status: 400 })

    const normalized = code.trim().toUpperCase()
    const entry = await prisma.entry.findUnique({ where: { code: normalized } })

    if (!entry) {
      return NextResponse.json({ status: 'INVALID', message: 'Code not found in system' })
    }
    if (entry.used) {
      return NextResponse.json({ status: 'ALREADY_USED', message: `Already used by ${entry.name}`, name: entry.name })
    }
    if (!entry.paid) {
      return NextResponse.json({ status: 'NOT_PAID', message: `${entry.name} — payment not confirmed`, name: entry.name, id: entry.id })
    }

    // Mark as used
    await prisma.entry.update({ where: { id: entry.id }, data: { used: true } })
    return NextResponse.json({ status: 'VALID', message: `Welcome, ${entry.name}!`, name: entry.name })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ status: 'ERROR', message: 'Verification error' }, { status: 500 })
  }
}
