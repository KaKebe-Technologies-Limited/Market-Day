import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateCode } from '@/lib/codegen'

function isAuthorised(req: NextRequest) {
  const pw = req.headers.get('x-admin-password')
  return pw === process.env.ADMIN_PASSWORD
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const { name, phone, paid } = await req.json()

    if (!name?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    let code = generateCode()
    let attempts = 0
    while (attempts < 5) {
      const existing = await prisma.entry.findUnique({ where: { code } })
      if (!existing) break
      code = generateCode()
      attempts++
    }

    const entry = await prisma.entry.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        code,
        paid: paid === true,
        used: false,
      },
    })

    return NextResponse.json({ success: true, entry })
  } catch (err) {
    console.error('Create entry error:', err)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}

// PATCH to update paid status
export async function PATCH(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    const { id, paid } = await req.json()

    const entry = await prisma.entry.update({
      where: { id: Number(id) },
      data: { paid },
    })

    return NextResponse.json({ success: true, entry })
  } catch (err) {
    console.error('Update entry error:', err)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}
