import { getConfiguredEmailDomains } from "@/lib/dto/domains";
import { getMultipleConfigs } from "@/lib/dto/system-config";
import { db } from "@/lib/db";
import { userEmails, users } from "@/lib/db/schema";
import { brevoSendEmail } from "@/lib/email/brevo";
import { normalizeEmailAddress } from "@/lib/email/policies";
import { saveForwardEmail } from "@/lib/email/services";
import type { OriginalEmail } from "@/lib/email/types";
import { eq } from "drizzle-orm";

type EmailCatcherConfigs = {
  enable_email_catch_all: boolean;
  catch_all_emails: string;
  enable_tg_email_push: boolean;
  tg_email_bot_token: string;
  tg_email_chat_id: string;
  tg_email_template: string;
  tg_email_target_white_list: string;
  enable_email_forward: boolean;
  email_forward_targets: string;
  email_forward_white_list: string;
};

export async function POST(req: Request) {
  try {
    const data = (await req.json()) as OriginalEmail;
    if (!data) {
      return Response.json("No email data received", { status: 400 });
    }

    const configs = await getMultipleConfigs<EmailCatcherConfigs>([
      "enable_email_catch_all",
      "catch_all_emails",
      "enable_tg_email_push",
      "tg_email_bot_token",
      "tg_email_chat_id",
      "tg_email_template",
      "tg_email_target_white_list",
      "enable_email_forward",
      "email_forward_targets",
      "email_forward_white_list",
    ]);

    // 处理邮件转发和保存
    const savedEmailId = await handleEmailForwarding(data, configs);

    // Telegram
    // 先检查是否全局配置了推送
    if (configs.enable_tg_email_push) {
      const shouldPush = shouldPushToTelegram(
        data,
        configs.tg_email_target_white_list,
      );
      if (shouldPush) {
        await sendToTelegram(data, configs);
      }
    }

    // 尝试向个人绑定的 Telegram 发送
    await sendToPersonalTelegram(
      data,
      configs.tg_email_bot_token,
      configs.tg_email_template,
      savedEmailId,
    );

    return Response.json({ status: 200 });
  } catch (error) {
    console.log(error);
    return Response.json({ status: 500 });
  }
}

async function handleEmailForwarding(
  data: OriginalEmail,
  configs: EmailCatcherConfigs,
) {
  const actions = determineEmailActions(data, configs);
  const sideEffectPromises: Promise<void>[] = [];
  const savePromise = actions.includes("NORMAL_SAVE")
    ? handleNormalEmail(data)
    : Promise.resolve<string | null>(null);

  if (actions.includes("CATCH_ALL")) {
    sideEffectPromises.push(handleCatchAllEmail(data, configs));
  }

  if (actions.includes("EXTERNAL_FORWARD")) {
    sideEffectPromises.push(handleExternalForward(data, configs));
  }

  const [savedEmailId, results] = await Promise.all([
    savePromise,
    Promise.allSettled(sideEffectPromises),
  ]);

  // 检查是否有失败的操作
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    console.error("Some email operations failed:", failures);
    const firstFailure = failures[0] as PromiseRejectedResult;
    throw new Error(`Email operation failed: ${firstFailure.reason}`);
  }

  return savedEmailId;
}

function determineEmailActions(
  data: OriginalEmail,
  configs: EmailCatcherConfigs,
): string[] {
  const actions: string[] = [];

  // 检查转发白名单
  const isInForwardWhiteList = checkForwardWhiteList(
    data.to,
    configs.email_forward_white_list,
  );

  // 检查是否配置了任何转发功能并且在白名单中
  const hasCatchAllForward =
    configs.enable_email_catch_all && isInForwardWhiteList;
  const hasExternalForward =
    configs.enable_email_forward && isInForwardWhiteList;
  const hasAnyForward = hasCatchAllForward || hasExternalForward;

  if (hasCatchAllForward) {
    actions.push("CATCH_ALL");
  }

  if (hasExternalForward) {
    actions.push("EXTERNAL_FORWARD");
  }

  // 只有在没有配置任何转发时，才进行正常保存原始邮件
  if (!hasAnyForward) {
    actions.push("NORMAL_SAVE");
  }

  return actions;
}

// 新增：检查邮箱是否在转发白名单中
function checkForwardWhiteList(
  toEmail: string,
  whiteListString: string,
): boolean {
  const normalizedToEmail = normalizeEmailAddress(toEmail);

  // 如果没有配置白名单，则允许所有邮箱（保持向后兼容）
  if (!whiteListString || whiteListString.trim() === "") {
    return true;
  }

  const whiteList = parseAndValidateEmails(whiteListString);
  return whiteList.includes(normalizedToEmail);
}

async function handleCatchAllEmail(
  data: OriginalEmail,
  configs: Pick<EmailCatcherConfigs, "catch_all_emails">,
) {
  const validEmails = parseAndValidateEmails(configs.catch_all_emails);

  if (validEmails.length === 0) {
    throw new Error("No valid catch-all emails configured");
  }

  // 转发到内部邮箱（保存转发后的邮件）
  const forwardPromises = validEmails.map((email) =>
    saveForwardEmail({ ...data, to: email }),
  );

  await Promise.all(forwardPromises);
}

async function handleExternalForward(
  data: OriginalEmail,
  configs: Pick<EmailCatcherConfigs, "email_forward_targets">,
) {
  const validEmails = parseAndValidateEmails(configs.email_forward_targets);

  if (validEmails.length === 0) {
    throw new Error("No valid forward emails configured");
  }

  const senders = await getConfiguredEmailDomains();
  if (senders.length === 0) {
    throw new Error("No configured resend domains");
  }

  const options = {
    from: `Forwarding@${senders[0].domain_name}`,
    to: validEmails,
    subject: data.subject ?? "No subject",
    html: `${data.html ?? data.text} <br><hr><p style="font-size: '12px'; color: '#888'; font-family: 'monospace';text-align: 'center'">This email was forwarded from ${data.to}. Powered by <a href="https://orz.cm">Orz.cm</a>.</p>`,
  };

  await brevoSendEmail(options);
}

async function handleNormalEmail(data: OriginalEmail) {
  return saveForwardEmail(data);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function parseAndValidateEmails(emailsString: string): string[] {
  if (!emailsString || typeof emailsString !== "string") {
    return [];
  }

  const emails = emailsString
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

  const validEmails = emails.filter((email) => isValidEmail(email));

  if (validEmails.length !== emails.length) {
    console.warn(
      "Some invalid email addresses found:",
      emails.filter((email) => !isValidEmail(email)),
    );
  }

  return validEmails;
}

/*  Pusher   */
function shouldPushToTelegram(
  email: OriginalEmail,
  whiteList: string,
): boolean {
  const normalizedTo = normalizeEmailAddress(email.to);

  if (!whiteList || whiteList.trim() === "") {
    return true;
  }

  const whiteListArray = whiteList
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);

  return whiteListArray.includes(normalizedTo);
}

async function sendToTelegram(
  email: OriginalEmail,
  configs: Pick<
    EmailCatcherConfigs,
    "tg_email_bot_token" | "tg_email_chat_id" | "tg_email_template"
  >,
) {
  const { tg_email_bot_token, tg_email_chat_id, tg_email_template } = configs;

  if (!tg_email_bot_token || !tg_email_chat_id) {
    console.error("Telegram bot token or chat ID not configured");
    return;
  }

  // 解析多个 chat ID（支持逗号分隔）
  const chatIds = tg_email_chat_id
    .split(",")
    .map((id: string) => id.trim())
    .filter((id: string) => id.length > 0);

  if (chatIds.length === 0) {
    console.error("No valid chat IDs found");
    return;
  }

  try {
    const message = formatEmailForTelegram(email, tg_email_template);

    const sendPromises = chatIds.map(async (chatId: string) => {
      try {
        const response = await fetch(
          `https://api.telegram.org/bot${tg_email_bot_token}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            }),
          },
        );

        if (!response.ok) {
          const error = await readTelegramError(response);
          console.error(
            `Failed to send message to Telegram chat ${chatId}:`,
            error,
          );
          return { chatId, success: false, error };
        } else {
          console.log(`Email successfully sent to Telegram chat ${chatId}`);
          return { chatId, success: true };
        }
      } catch (error) {
        console.error(`Error sending to Telegram chat ${chatId}:`, error);
        return { chatId, success: false, error };
      }
    });

    const results = await Promise.all(sendPromises);

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    console.log(
      `Telegram push completed: ${successCount}/${totalCount} successful`,
    );
  } catch (error) {
    console.error("Error in sendToTelegram:", error);
  }
}

async function sendToPersonalTelegram(
  email: OriginalEmail,
  botToken: string,
  template?: string,
  savedEmailId?: string | null,
) {
  if (!botToken) {
    console.warn("Telegram personal push skipped: tg_email_bot_token is not configured");
    return;
  }

  try {
    const normalizedTo = normalizeEmailAddress(email.to);

    // 查找该邮箱所属的用户
    const [userEmail] = await db
      .select({
        tgChatId: users.tgChatId,
      })
      .from(userEmails)
      .innerJoin(users, eq(userEmails.userId, users.id))
      .where(eq(userEmails.emailAddress, normalizedTo))
      .limit(1);

    if (!userEmail?.tgChatId) {
      console.warn(
        `Telegram personal push skipped: no tgChatId binding found for ${normalizedTo}`,
      );
      return; // 找不到用户，或者用户没绑定 tgChatId
    }

    const chatId = userEmail.tgChatId;
    const message = formatEmailForTelegram(email, template);

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: savedEmailId
            ? {
                inline_keyboard: [[
                  { text: "已读", callback_data: `email:read:${savedEmailId}` },
                  { text: "删除", callback_data: `email:delete:${savedEmailId}` },
                ]],
              }
            : undefined,
        }),
      },
    );

    if (!response.ok) {
      const error = await readTelegramError(response);
      console.error(
        `Failed to send personal message to Telegram chat ${chatId}:`,
        error,
      );
    } else {
      console.log(`Personal email successfully sent to Telegram chat ${chatId}`);
    }
  } catch (error) {
    console.error("Error in sendToPersonalTelegram:", error);
  }
}

// 格式化邮件内容为 Telegram 消息（Markdown 格式）
function formatEmailForTelegram(
  email: OriginalEmail,
  template?: string,
): string {
  const fromInfo = email.fromName
    ? `${email.fromName} <${email.from}>`
    : email.from;
  const date = formatTelegramDate(email.date);
  const subject = escapeTelegramHtml(email.subject || "No Subject");
  const content = getTelegramSafeContent(email);
  const escapedFrom = escapeTelegramHtml(fromInfo);
  const escapedTo = escapeTelegramHtml(email.to);
  const escapedDate = escapeTelegramHtml(date);

  if (template) {
    return template
      .replaceAll("{{from}}", escapedFrom)
      .replaceAll("{{to}}", escapedTo)
      .replaceAll("{{subject}}", subject)
      .replaceAll("{{text}}", content)
      .replaceAll("{{date}}", escapedDate);
  }

  return [
    "📮 <b>New Email</b>",
    "",
    `<b>From:</b> <code>${escapedFrom}</code>`,
    `<b>To:</b> <code>${escapedTo}</code>`,
    `<b>Subject:</b> ${subject}`,
    `<b>Date:</b> ${escapedDate}`,
    "<b>Content:</b>",
    content,
  ].join("\n");
}

function getTelegramSafeContent(email: OriginalEmail) {
  const source = email.text || stripHtml(email.html) || "No Content";
  const normalized = source.replace(/\r\n/g, "\n").trim();
  const truncated =
    normalized.length > 3200
      ? `${normalized.slice(0, 3197)}...`
      : normalized;

  return renderTelegramContentWithLinks(truncated || "No Content");
}

function stripHtml(value?: string) {
  if (!value) {
    return "";
  }

  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function formatTelegramDate(value?: string) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "--" : date.toLocaleString();
}

function escapeTelegramHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeTelegramHtmlAttribute(value: string) {
  return escapeTelegramHtml(value).replaceAll('"', "&quot;");
}

function renderTelegramContentWithLinks(content: string) {
  const urlRegex = /https?:\/\/[^\s<>"']+/g;
  let result = "";
  let lastIndex = 0;

  for (const match of content.matchAll(urlRegex)) {
    const rawUrl = match[0];
    const startIndex = match.index ?? 0;
    const { trimmedUrl, trailingText } = splitTrailingUrlPunctuation(rawUrl);

    result += escapeTelegramHtml(content.slice(lastIndex, startIndex));
    result += `<a href="${escapeTelegramHtmlAttribute(trimmedUrl)}">${escapeTelegramHtml(trimmedUrl)}</a>`;
    result += escapeTelegramHtml(trailingText);
    lastIndex = startIndex + rawUrl.length;
  }

  result += escapeTelegramHtml(content.slice(lastIndex));
  return result;
}

function splitTrailingUrlPunctuation(url: string) {
  const trailingMatch = url.match(/[),.!?]+$/);
  if (!trailingMatch) {
    return { trimmedUrl: url, trailingText: "" };
  }

  const trailingText = trailingMatch[0];
  return {
    trimmedUrl: url.slice(0, -trailingText.length),
    trailingText,
  };
}

async function readTelegramError(response: Response) {
  try {
    return await response.json();
  } catch (_error) {
    return await response.text();
  }
}
