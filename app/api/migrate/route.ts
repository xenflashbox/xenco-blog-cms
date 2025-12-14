import { getPayload } from 'payload'
import config from '@payload-config'
import { NextResponse } from 'next/server'

export const GET = async () => {
  try {
    const payload = await getPayload({ config })
    
    // This initializes Payload and runs migrations
    const users = await payload.find({
      collection: 'users',
      limit: 1,
    })
    
    return NextResponse.json({
      status: 'ok',
      userCount: users.totalDocs,
      message: users.totalDocs === 0 ? 'No users - go to /admin to create first user' : 'Users exist'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}