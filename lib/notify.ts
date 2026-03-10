export async function notifyError(context: string, error: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.replace(/\\n/g, '')
  const chatId = process.env.TELEGRAM_CHAT_ID?.replace(/\\n/g, '')
  if (!token || !chatId) return

  const msg = error instanceof Error ? error.message : String(error)
  const text = `*GaylyFans Error*\n\n*Context:* ${context}\n*Error:* ${msg}`

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    })
  } catch {}
}
