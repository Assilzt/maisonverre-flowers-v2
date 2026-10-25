export async function deliverTelegram(text: string, messageId?: number) {
  const token = process.env.TELEGRAM_BOT_TOKEN,
    chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) throw new Error("Telegram is not configured");
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${messageId ? "editMessageText" : "sendMessage"}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        chat_id: chat,
        text: text.slice(0, 4000),
        ...(messageId ? { message_id: messageId } : {}),
      }),
    }
  );
  const data = (await response.json()) as {
    ok?: boolean;
    description?: string;
    result?: { message_id: number };
  };
  if (!data.ok) {
    if (messageId && data.description?.includes("message is not modified"))
      return messageId;
    throw new Error("Telegram notification failed");
  }
  return data.result?.message_id || messageId || 0;
}
