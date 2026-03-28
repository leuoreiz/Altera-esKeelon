// Lança o browser correto dependendo do ambiente:
// - Dev local: usa PUPPETEER_EXECUTABLE_PATH (Chromium do sistema)
// - Produção (Vercel): usa @sparticuz/chromium (binário serverless)

export async function launchBrowser() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const puppeteer = await import('puppeteer-core')
    return puppeteer.default.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  const chromium = await import('@sparticuz/chromium')
  const puppeteer = await import('puppeteer-core')
  return puppeteer.default.launch({
    args: chromium.default.args,
    executablePath: await chromium.default.executablePath(),
    headless: true,
  })
}
