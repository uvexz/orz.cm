import { NextRequest, NextResponse } from "next/server";
import { checkApiKey } from "@/lib/dto/api-key";
import { updateUserTelegramBinding } from "@/lib/dto/user";

export async function POST(req: NextRequest) {
  try {
    const custom_api_key = req.headers.get("wrdo-api-key");
    if (!custom_api_key) {
      return NextResponse.json("Unauthorized", {
        status: 401,
      });
    }

    // Check if the API key is valid
    const user = await checkApiKey(custom_api_key);
    if (!user?.id) {
      return NextResponse.json(
        "Invalid API key. You can get your API key from https://wr.do/dashboard/settings.",
        { status: 401 }
      );
    }
    if (user.active === 0) {
      return NextResponse.json("Forbidden", {
        status: 403,
        statusText: "Forbidden",
      });
    }

    const body = await req.json();
    const chatId = body?.chatId;
    const username = body?.username;

    if (!chatId) {
      return NextResponse.json("Missing chatId", { status: 400 });
    }

    // 更新用户表，保存 tgChatId 和 tgUsername
    await updateUserTelegramBinding(
      user.id,
      chatId.toString(),
      username || null,
    );

    return NextResponse.json(
      { status: "success", message: "Successfully bound Telegram Account." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error binding telegram chat ID:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
