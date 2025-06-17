import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Try to fetch the manifest from the same origin
    const manifestUrl = new URL('/manifest.webmanifest', request.url)
    console.log('Attempting to fetch manifest from:', manifestUrl.toString())
    
    const response = await fetch(manifestUrl.toString(), {
      headers: {
        'User-Agent': 'Internal-Test'
      }
    })
    
    console.log('Manifest fetch response status:', response.status)
    console.log('Manifest fetch response headers:', Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const text = await response.text()
      console.log('Manifest fetch error response body:', text.substring(0, 500))
      
      return NextResponse.json({
        error: 'Manifest fetch failed',
        status: response.status,
        statusText: response.statusText,
        body: text.substring(0, 500),
        url: manifestUrl.toString()
      }, { status: 500 })
    }
    
    const manifestData = await response.json()
    
    return NextResponse.json({
      success: true,
      manifest: manifestData,
      url: manifestUrl.toString(),
      status: response.status
    })
    
  } catch (error) {
    console.error('Test manifest error:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 