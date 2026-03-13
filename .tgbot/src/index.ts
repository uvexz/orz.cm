import { Hono } from 'hono'

type Bindings = {
  TELEGRAM_BOT_TOKEN: string
  API_BASE_URL: string
  TGBOT_KV: KVNamespace
  DEFAULT_SHORT_DOMAIN: string
  DEFAULT_EMAIL_DOMAIN: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => c.text('Orz.cm Telegram Bot Worker is running!'))

app.post('/webhook', async (c) => {
  const body = await c.req.json()

  // Telegram may send various update types. We only care about messages for now.
  if (body.message && body.message.text) {
    const text = body.message.text
    const chatId = body.message.chat.id
    const username = body.message.from?.username

    await handleCommand(c, text, chatId, username)
  }

  // Telegram expects a 200 OK to acknowledge receipt
  return c.text('OK')
})

async function handleCommand(c: any, text: string, chatId: number, username?: string) {
  const token = c.env.TELEGRAM_BOT_TOKEN
  const apiBase = c.env.API_BASE_URL

  const parts = text.split(' ')
  const command = parts[0].toLowerCase()

  if (command === '/start') {
    await sendMessage(
      token,
      chatId,
      `👋 Welcome to Orz.cm Telegram Bot!\n\nTo get started, please bind your Orz.cm account by sending:\n\`/setkey <your_api_key>\`\n\nYou can find your API key at https://orz.cm/dashboard/settings.`
    )
    return
  }

  if (command === '/setkey') {
    const apiKey = parts[1]
    if (!apiKey) {
      await sendMessage(token, chatId, "❌ Please provide your API key. Usage: `/setkey <your_api_key>`")
      return
    }

    try {
      const resp = await fetch(`${apiBase}/tg/bind`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "wrdo-api-key": apiKey,
        },
        body: JSON.stringify({ chatId: chatId.toString(), username }),
      })

      if (resp.ok) {
        // Save to KV!
        await c.env.TGBOT_KV.put(`user:${chatId}:apikey`, apiKey)
        await sendMessage(token, chatId, "✅ Successfully bound your Orz.cm account! You can now use `/short` and `/email` commands.")
      } else {
        await sendMessage(token, chatId, "❌ Failed to bind account. Please check if your API key is correct.")
      }
    } catch (error) {
      await sendMessage(token, chatId, "❌ Network error. Please try again later.")
    }
    return
  }

  // Retrieve API Key from KV for subsequent commands
  const apiKey = await c.env.TGBOT_KV.get(`user:${chatId}:apikey`)

  if (!apiKey && (command === '/short' || command === '/email' || command === '/me')) {
    await sendMessage(token, chatId, "⚠️ You haven't bound an API key yet. Please use `/setkey <your_api_key>` to bind it first.")
    return
  }

  if (command === '/short') {
    const targetUrl = parts[1]
    const slug = parts[2] || generateRandomSlug(6) // 随机生成如果未提供

    // 获取环境变量中配置的短链接域名，取第一个作为默认
    const defaultShortDomains = c.env.DEFAULT_SHORT_DOMAIN?.split(',').map((d: string) => d.trim()).filter(Boolean) || ['wr.do']
    const domain = parts[3] || defaultShortDomains[0]

    if (!targetUrl) {
      await sendMessage(token, chatId, "❌ Please provide a target URL.\nUsage: `/short <target_url> [custom_slug] [domain]`")
      return
    }

    try {
      const bodyPayload: any = {
        target: targetUrl,
        url: slug,
        prefix: domain,
        visible: 0,
        active: 1
      }

      const resp = await fetch(`${apiBase}/short`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "wrdo-api-key": apiKey!,
        },
        body: JSON.stringify(bodyPayload),
      })

      if (resp.ok) {
        const data = await resp.json()
        await sendMessage(token, chatId, `✅ Short link created!\n\n🔗 \`https://${bodyPayload.prefix}/${bodyPayload.url}\`\n🎯 Target: ${targetUrl}`)
      } else {
        const errorText = await resp.text()
        await sendMessage(token, chatId, `❌ Failed to create short link...\nError: ${errorText}`)
      }
    } catch (error) {
      await sendMessage(token, chatId, "❌ Network error. Please try again.")
    }
    return
  }

  if (command === '/email') {
    const prefix = parts[1] || generateRandomSlug(6) // 随机生成如果未提供

    // 获取环境变量中配置的临时邮箱后缀，取第一个作为默认
    const defaultEmailDomains = c.env.DEFAULT_EMAIL_DOMAIN?.split(',').map((d: string) => d.trim()).filter(Boolean) || ['mx.wr.do']
    const domain = parts[2] || defaultEmailDomains[0]

    try {
      const emailAddress = `${prefix}@${domain}`

      const resp = await fetch(`${apiBase}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "wrdo-api-key": apiKey!,
        },
        body: JSON.stringify({ emailAddress }),
      })

      if (resp.ok) {
        await sendMessage(token, chatId, `✅ Temporary email created!\n\n📧 \`${emailAddress}\`\n\nYou will receive emails sent to this address right here in Telegram!`)
      } else {
        const errorText = await resp.text()
        await sendMessage(token, chatId, `❌ Failed to create email...\nError: ${errorText}`)
      }
    } catch (error) {
      await sendMessage(token, chatId, "❌ Network error. Please try again.")
    }
    return
  }

  // await sendMessage(token, chatId, "❓ Unknown command.")
}

function generateRandomSlug(length: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function sendMessage(token: string, chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  })
}

export default app
