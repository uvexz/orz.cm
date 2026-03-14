"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import randomName from "@scaleway/random-name";
import {
  Check,
  Image as ImageIcon,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Share2,
} from "lucide-react";
import Peer, { type DataConnection } from "peerjs";
import { toast } from "sonner";

import { siteConfig } from "@/config/site";
import { generateGradientClasses } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";

import { ModeToggle } from "../layout/mode-toggle";
import { Icons } from "../shared/icons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

type Message = {
  id: string;
  text?: string;
  image?: string;
  isSelf: boolean;
  timestamp: string;
  username: string;
  isSystem?: boolean;
};

type User = {
  peerId: string;
  username: string;
};

type ChatTextPayload = {
  username: string;
  text: string;
};

type ChatImagePayload = {
  username: string;
  image: string;
};

type ChatConnectionPayload =
  | { type: "JOIN"; data: User }
  | { type: "LEAVE"; data: User }
  | { type: "COUNT"; data: number }
  | { type: "USERLIST"; data: string }
  | { type: "IMAGE"; data: ChatImagePayload }
  | { type: "TEXT"; data: ChatTextPayload };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isUser = (value: unknown): value is User =>
  isRecord(value) &&
  typeof value.peerId === "string" &&
  typeof value.username === "string";

const isChatTextPayload = (value: unknown): value is ChatTextPayload =>
  isRecord(value) &&
  typeof value.username === "string" &&
  typeof value.text === "string";

const isChatImagePayload = (value: unknown): value is ChatImagePayload =>
  isRecord(value) &&
  typeof value.username === "string" &&
  typeof value.image === "string";

const parseChatConnectionPayload = (
  value: unknown,
): ChatConnectionPayload | null => {
  if (!isRecord(value) || typeof value.type !== "string" || !("data" in value)) {
    return null;
  }

  switch (value.type) {
    case "JOIN":
    case "LEAVE":
      return isUser(value.data) ? { type: value.type, data: value.data } : null;
    case "COUNT":
      return typeof value.data === "number"
        ? { type: "COUNT", data: value.data }
        : null;
    case "USERLIST":
      return typeof value.data === "string"
        ? { type: "USERLIST", data: value.data }
        : null;
    case "IMAGE":
      return isChatImagePayload(value.data)
        ? { type: "IMAGE", data: value.data }
        : null;
    case "TEXT":
      return isChatTextPayload(value.data)
        ? { type: "TEXT", data: value.data }
        : null;
    default:
      return null;
  }
};

const parseUserList = (value: string): User[] | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every(isUser) ? parsed : null;
  } catch {
    return null;
  }
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const createSystemMessage = (text: string): Message => ({
  id: crypto.randomUUID(),
  text,
  isSelf: false,
  timestamp: formatTime(new Date()),
  username: "System",
  isSystem: true,
});

export default function ChatRoom() {
  const { isMobile, isSm } = useMediaQuery();
  const [peerId, setPeerId] = useState("");
  const [remotePeerId, setRemotePeerId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [username, setUsername] = useState("");
  const [avatarClasses, setAvatarClasses] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [connectedCount, setConnectedCount] = useState(0);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(!isSm);
  const peerInstance = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const connections = useRef<DataConnection[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [isInvited, setIsInvited] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSm || isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isSm, isMobile]);

  useEffect(() => {
    if ((remotePeerId || !!searchParams.get("room")) && !isConnected) {
      setIsInvited(true);
    }
  }, [remotePeerId, searchParams, isConnected]);

  useEffect(() => {
    const newUsername = randomName("", ".");
    setUsername(newUsername);
    setAvatarClasses(generateGradientClasses(newUsername));

    const roomId = searchParams.get("room");
    if (roomId) {
      setRemotePeerId(roomId);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (peerInstance.current) {
        peerInstance.current.destroy();
      }
      connections.current.forEach((conn) => {
        if (conn.open) conn.close();
      });
      connections.current = [];
      if (connRef.current && connRef.current.open) {
        connRef.current.close();
        connRef.current = null;
      }
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const initializePeer = useCallback(() => {
    if (peerInstance.current) return;

    try {
      const peer = new Peer({
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });
      peerInstance.current = peer;

      peer.on("open", (id) => {
        setPeerId(id);
        setUsers((prev) => {
          const newUser = { peerId: id, username };
          if (!prev.some((u) => u.peerId === id)) {
            return [...prev, newUser];
          }
          return prev;
        });
        setConnectedCount(1);
      });

      if (!isInvited) {
        peer.on("connection", (conn) => {
          connections.current.push(conn);
          handleConnection(conn);
        });
      }

      peer.on("error", (err) => {
        console.error("Peer error:", err);
        toast.error("Connection error, please try again");
        setIsConnected(false);
      });

      peer.on("disconnected", () => {
        setIsConnected(false);
        toast.warning("Disconnected from peer network");
      });
    } catch (err) {
      console.error("Failed to initialize peer:", err);
      toast.error("Failed to initialize peer connection");
    }
  }, [username, isInvited]);

  useEffect(() => {
    if (username) {
      initializePeer();
    }
  }, [initializePeer, username]);

  const syncUsersFromSerializedList = useCallback(
    (serializedUserList: string) => {
      const userList = parseUserList(serializedUserList);

      if (!userList) {
        console.error("Error parsing user list:", serializedUserList);
        return;
      }

      setUsers(() => {
        const mergedUsers = [...userList];
        if (!mergedUsers.some((user) => user.peerId === peerId)) {
          mergedUsers.push({ peerId, username });
        }

        return mergedUsers.filter(
          (user, index, self) =>
            index === self.findIndex((item) => item.peerId === user.peerId),
        );
      });
    },
    [peerId, username],
  );

  const handleConnection = (conn: DataConnection) => {
    conn.on("open", () => {
      setIsConnected(true);
      setConnectedCount((prev) => {
        const newCount = prev + 1;
        broadcastCount(newCount);
        return newCount;
      });

      setTimeout(() => {
        const userList = JSON.stringify(users);
        conn.send({ type: "USERLIST", data: userList });
      }, 100);
    });

    conn.on("data", (data: unknown) => {
      const payload = parseChatConnectionPayload(data);

      if (!payload) return;

      if (payload.type === "JOIN") {
        const joinMessage = createSystemMessage(
          `[${payload.data.username}] entered the room`,
        );
        setMessages((prev) => [...prev, joinMessage]);
        setUsers((prev) => {
          if (!prev.some((user) => user.peerId === payload.data.peerId)) {
            const updatedUsers = [...prev, payload.data];
            setTimeout(() => {
              broadcastUserList(updatedUsers);
              broadcastCount(updatedUsers.length);
            }, 100);
            return updatedUsers;
          }
          return prev;
        });
        broadcastMessage(joinMessage, conn);
      } else if (payload.type === "COUNT") {
        setConnectedCount(payload.data);
      } else if (payload.type === "USERLIST") {
        syncUsersFromSerializedList(payload.data);
      } else if (payload.type === "LEAVE") {
        const leaveMessage = createSystemMessage(
          `[${payload.data.username}] left the room`,
        );
        setMessages((prev) => [...prev, leaveMessage]);
        broadcastMessage(leaveMessage, conn);
      } else if (payload.type === "IMAGE") {
        const newMessage = {
          id: crypto.randomUUID(),
          image: payload.data.image,
          isSelf: false,
          timestamp: formatTime(new Date()),
          username: payload.data.username,
        };
        setMessages((prev) => [...prev, newMessage]);
        broadcastMessage(newMessage, conn);
      } else if (payload.type === "TEXT") {
        const newMessage = {
          id: crypto.randomUUID(),
          text: payload.data.text,
          isSelf: false,
          timestamp: formatTime(new Date()),
          username: payload.data.username,
        };
        setMessages((prev) => [...prev, newMessage]);
        broadcastMessage(newMessage, conn);
      }
    });

    conn.on("close", () => {
      connections.current = connections.current.filter((c) => c !== conn);
      const disconnectedUser = users.find((user) => user.peerId === conn.peer);
      if (disconnectedUser) {
        const leaveMessage = {
          id: crypto.randomUUID(),
          text: `[${disconnectedUser.username}] left the room`,
          isSelf: false,
          timestamp: formatTime(new Date()),
          username: "System",
          isSystem: true,
        };
        setMessages((prev) => [...prev, leaveMessage]);
        setUsers((prev) => {
          const updatedUsers = prev.filter((user) => user.peerId !== conn.peer);
          setTimeout(() => {
            broadcastUserList(updatedUsers);
            broadcastCount(updatedUsers.length);
          }, 100);
          return updatedUsers;
        });
      }
      if (!connRef.current && connections.current.length === 0) {
        setIsConnected(false);
      }
    });
  };

  const broadcastMessage = (message: Message, senderConn: DataConnection) => {
    connections.current.forEach((conn) => {
      if (conn !== senderConn && conn.open) {
        try {
          if (message.image) {
            conn.send({
              type: "IMAGE",
              data: { username: message.username, image: message.image },
            });
          } else if (message.text) {
            conn.send({
              type: "TEXT",
              data: { username: message.username, text: message.text },
            });
          }
        } catch (err) {
          console.error("Error broadcasting message:", err);
        }
      }
    });
  };

  const broadcastCount = (count: number) => {
    connections.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send({ type: "COUNT", data: count });
        } catch (err) {
          console.error("Error broadcasting count:", err);
        }
      }
    });
    setConnectedCount(count);
  };

  const broadcastUserList = (usersList = users) => {
    const userList = JSON.stringify(usersList);
    connections.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send({ type: "USERLIST", data: userList });
        } catch (err) {
          console.error("Error broadcasting user list:", err);
        }
      }
    });
  };

  const connectToPeer = useCallback(() => {
    if (!peerInstance.current || !remotePeerId) return;

    try {
      if (connRef.current) {
        connRef.current.close();
      }

      const conn = peerInstance.current.connect(remotePeerId);
      connRef.current = conn;

      conn.on("open", () => {
        conn.send({ type: "JOIN", data: { username, peerId } });
        setIsConnected(true);
      });

      conn.on("data", (data: unknown) => {
        const payload = parseChatConnectionPayload(data);

        if (!payload) return;

        if (payload.type === "JOIN") {
          const joinMessage = createSystemMessage(
            `[${payload.data.username}] entered the room`,
          );
          setMessages((prev) => [...prev, joinMessage]);
          setUsers((prev) => {
            if (!prev.some((user) => user.peerId === payload.data.peerId)) {
              return [...prev, payload.data];
            }
            return prev;
          });
        } else if (payload.type === "COUNT") {
          setConnectedCount(payload.data);
        } else if (payload.type === "USERLIST") {
          syncUsersFromSerializedList(payload.data);
        } else if (payload.type === "LEAVE") {
          const leaveMessage = createSystemMessage(
            `[${payload.data.username}] left the room`,
          );
          setMessages((prev) => [...prev, leaveMessage]);
        } else if (payload.type === "IMAGE") {
          const newMessage = {
            id: crypto.randomUUID(),
            image: payload.data.image,
            isSelf: false,
            timestamp: formatTime(new Date()),
            username: payload.data.username,
          };
          setMessages((prev) => [...prev, newMessage]);
        } else if (payload.type === "TEXT") {
          const newMessage = {
            id: crypto.randomUUID(),
            text: payload.data.text,
            isSelf: false,
            timestamp: formatTime(new Date()),
            username: payload.data.username,
          };
          setMessages((prev) => [...prev, newMessage]);
        }
      });

      conn.on("close", () => {
        setIsConnected(false);
        connRef.current = null;
        const disconnectedUser = users.find(
          (user) => user.peerId === remotePeerId,
        );
        if (disconnectedUser) {
          const leaveMessage = {
            id: crypto.randomUUID(),
            text: `[${disconnectedUser.username}] left the room`,
            isSelf: false,
            timestamp: formatTime(new Date()),
            username: "System",
            isSystem: true,
          };
          setMessages((prev) => [...prev, leaveMessage]);
        }
        setUsers((prev) => {
          const updatedUsers = prev.filter(
            (user) => user.peerId !== remotePeerId,
          );
          setConnectedCount(updatedUsers.length);
          return updatedUsers;
        });
      });

      conn.on("error", (err) => {
        console.error("Connection error:", err);
        toast.error("Connection error. Please try again.");
        if (connRef.current === conn) {
          connRef.current = null;
          setIsConnected(false);
        }
      });
    } catch (err) {
      console.error("Error connecting to peer:", err);
      toast.error("Failed to connect to peer");
    }
  }, [remotePeerId, username, peerId, users]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should not exceed 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(file);
        sendImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendImage = (base64Image: string) => {
    if (!base64Image || isSending) return;

    setIsSending(true);
    const newMessage = {
      id: crypto.randomUUID(),
      image: base64Image,
      isSelf: true,
      timestamp: formatTime(new Date()),
      username,
    };
    setMessages((prev) => [...prev, newMessage]);

    try {
      if (connRef.current && connRef.current.open) {
        connRef.current.send({
          type: "IMAGE",
          data: { username, image: base64Image },
        });
      } else if (!isInvited && connections.current.length > 0) {
        connections.current.forEach((conn) => {
          if (conn.open) {
            conn.send({
              type: "IMAGE",
              data: { username, image: base64Image },
            });
          }
        });
      }
    } catch (err) {
      console.error("Error sending image:", err);
      toast.error("Failed to send image");
    }

    setSelectedImage(null);
    setIsSending(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendMessage = useCallback(() => {
    if (!message || isSending) return;

    setIsSending(true);
    const newMessage = {
      id: crypto.randomUUID(),
      text: message,
      isSelf: true,
      timestamp: formatTime(new Date()),
      username,
    };
    setMessages((prev) => [...prev, newMessage]);

    try {
      if (connRef.current && connRef.current.open) {
        connRef.current.send({
          type: "TEXT",
          data: { username, text: message },
        });
      } else if (!isInvited && connections.current.length > 0) {
        connections.current.forEach((conn) => {
          if (conn.open) {
            conn.send({ type: "TEXT", data: { username, text: message } });
          }
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
      toast.error("Failed to send message");
    }

    setMessage("");
    setIsSending(false);
  }, [message, username, isSending, isInvited]);

  const shareRoom = () => {
    const roomId = remotePeerId || peerId;
    if (!roomId) {
      toast.error("No room to share");
      return;
    }
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setIsShareCopied(true);
        setTimeout(() => setIsShareCopied(false), 2000);
        toast.success("Room link copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy room link");
      });
  };

  const createNewRoom = () => {
    if (peerInstance.current) {
      if (username && peerId) {
        connections.current.forEach((conn) => {
          if (conn.open) {
            try {
              conn.send({ type: "LEAVE", data: { username, peerId } });
            } catch (err) {
              console.error("Error sending leave notification:", err);
            }
          }
        });
      }

      peerInstance.current.destroy();
      peerInstance.current = null;
      connections.current.forEach((conn) => {
        if (conn.open) conn.close();
      });
      connections.current = [];
      if (connRef.current && connRef.current.open) {
        connRef.current.close();
      }
      connRef.current = null;

      setPeerId("");
      setRemotePeerId("");
      setMessages([]);
      setUsers([]);
      setIsConnected(false);
      setConnectedCount(0);

      setTimeout(() => {
        initializePeer();
      }, 500);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-800">
      {(isMobile && isSidebarOpen) || (!isMobile && isSidebarOpen) ? (
        <div
          className={`${
            isMobile
              ? "fixed inset-0 z-50 w-full"
              : "w-[300px] shrink-0 border-r dark:border-neutral-600"
          } flex animate-fade-in-left flex-col bg-white p-4 transition-all duration-300 dark:bg-neutral-800`}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              Users ({users.length})
            </h2>
            <Button
              variant={"ghost"}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-5 p-0 text-neutral-600 hover:text-blue-500 dark:text-neutral-400 dark:hover:text-blue-400"
            >
              {!isSidebarOpen ? (
                <PanelRightClose size={20} />
              ) : (
                <PanelLeftClose size={20} />
              )}
            </Button>
          </div>

          <div className="max-h-[calc(100vh-12rem)] flex-1 space-y-2 overflow-y-auto">
            {users.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No users yet
              </p>
            ) : (
              users.map((user, index) => (
                <div
                  key={user.peerId}
                  className="flex items-center gap-2 rounded-lg p-2 text-sm text-neutral-700 dark:text-neutral-300"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${generateGradientClasses(user.username)}`}
                  >
                    {user.username.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="truncate">{user.username}</span>
                  {index === 0 && <Badge>Owner</Badge>}
                </div>
              ))
            )}
          </div>
          <Button
            onClick={createNewRoom}
            variant={"outline"}
            className="mt-auto flex items-center justify-center gap-1"
          >
            <Plus size={20} />
            New Room
          </Button>
        </div>
      ) : null}

      <div
        className={`grids grids-dark flex flex-1 flex-col bg-white px-4 pb-1 pt-3 transition-all duration-300 dark:bg-neutral-800 ${
          isMobile || !isSidebarOpen ? "w-full" : ""
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="mr-auto flex items-center gap-2">
            <Button
              variant={"ghost"}
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="h-5 p-0 text-neutral-600 hover:text-blue-500 dark:text-neutral-400 dark:hover:text-blue-400"
            >
              {!isSidebarOpen && <PanelRightClose size={20} />}
            </Button>
            <Link
              href={"/chat"}
              className="text-2xl font-bold text-neutral-800 dark:text-neutral-100"
              style={{ fontFamily: "Bahamas Bold" }}
            >
              WRoom
            </Link>
            <Badge>Beta</Badge>
          </div>

          {!isMobile && (
            <>
              <Link
                className="text-sm hover:underline"
                href={"/docs/wroom"}
                target="_blank"
              >
                About
              </Link>
              <Link
                className="text-sm hover:underline"
                href={"/dashboard"}
                target="_blank"
              >
                Dashboard
              </Link>
            </>
          )}
          <div className="flex items-center gap-2">
            <Badge className="flex items-center gap-1 text-xs text-green-300 dark:text-green-700">
              <Icons.users className="size-3" /> Online: {connectedCount}
            </Badge>
          </div>
          <ModeToggle />
        </div>

        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Your&nbsp;&nbsp;&nbsp;ID:
            </span>
            <Input
              type="text"
              value={peerId}
              readOnly
              className="flex-1 rounded border border-neutral-200 bg-neutral-100 p-2 text-sm text-neutral-800 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
            />
            <Button
              variant={"default"}
              onClick={shareRoom}
              className="flex items-center gap-2"
              title="Share Room"
              size={"sm"}
              disabled={!peerId}
            >
              {!peerId ? (
                "Creating Room"
              ) : (
                <>
                  {isShareCopied ? <Check size={16} /> : <Share2 size={16} />}
                  {!isMobile && "Share Room"}
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Room ID:
            </span>
            {!isInvited && isConnected ? (
              <Input
                type="text"
                placeholder="You are the room owner"
                readOnly
                disabled
                className="flex-1 rounded border bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
              />
            ) : (
              <Input
                type="text"
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                placeholder="Enter a room id"
                readOnly={isConnected}
                disabled={isConnected}
                className="flex-1 rounded border bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:placeholder:text-neutral-400"
              />
            )}
            <Button
              variant={"secondary"}
              onClick={connectToPeer}
              disabled={!peerId || !remotePeerId || isConnected}
              size={"sm"}
              className={cn(
                "flex items-center gap-2 rounded bg-blue-500 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-neutral-400 dark:bg-blue-600 dark:hover:bg-blue-700",
                isConnected &&
                  "bg-green-500 disabled:bg-green-600 dark:bg-green-600",
              )}
            >
              <Icons.unplug size={16} />
              {isConnected ? "Connected" : "Connect"}
            </Button>
          </div>
        </div>

        <div className="h-full min-h-[100px] overflow-y-auto rounded-md rounded-b-none border border-neutral-200 bg-white p-4 dark:border-neutral-600 dark:bg-neutral-700">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`mb-3 ${
                msg.isSystem
                  ? "flex justify-center"
                  : `flex items-start gap-2 ${msg.isSelf ? "justify-end" : "justify-start"}`
              }`}
            >
              {!msg.isSystem ? (
                <>
                  {!msg.isSelf && (
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${generateGradientClasses(
                        msg.username,
                      )}`}
                    >
                      {msg.username.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex max-w-[70%] flex-col">
                    <div
                      className={`mb-1 text-sm font-medium ${
                        msg.isSelf
                          ? "text-right text-blue-600 dark:text-blue-400"
                          : "text-left text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      {msg.username}
                    </div>
                    <div
                      className={`rounded-lg px-2 pb-1 pt-2 ${
                        msg.isSelf
                          ? "bg-blue-500 text-white dark:bg-blue-600"
                          : "bg-neutral-200 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-200"
                      }`}
                    >
                      {msg.text && <p className="text-sm">{msg.text}</p>}
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="Sent image"
                          className="max-w-full rounded-md"
                          style={{ maxHeight: "200px" }}
                        />
                      )}
                      <span
                        className={cn(
                          "mt-1 block text-xs opacity-70",
                          !msg.isSelf && "text-right",
                        )}
                      >
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                  {msg.isSelf && (
                    <div
                      className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${avatarClasses}`}
                    >
                      {username?.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm italic text-neutral-500 dark:text-neutral-400">
                  {msg.text}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="relative rounded-b-md">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Hi ${username || "Loading..."}, send a message to start...`}
            className="min-h-20 flex-1 rounded-md rounded-t-none border border-t-0 bg-neutral-50 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-neutral-600 dark:bg-neutral-600 dark:text-neutral-200 dark:placeholder:text-neutral-400"
            onKeyPress={(e) =>
              e.key === "Enter" && !e.shiftKey && sendMessage()
            }
            disabled={!isConnected}
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!isConnected || isSending}
              title="Send Image"
            >
              <ImageIcon size={16} />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <Button
              onClick={sendMessage}
              disabled={
                !isConnected || (!message && !selectedImage) || isSending
              }
              size={"sm"}
            >
              {isSending ? (
                <span className="animate-spin">⌛</span>
              ) : (
                <Icons.send className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <footer className="mt-2 py-2 text-center text-sm font-semibold text-neutral-600 dark:text-neutral-300">
          Powered by{" "}
          <Link
            className="hover:underline"
            href={"https://wr.do"}
            target="_blank"
            style={{ fontFamily: "Bahamas Bold" }}
          >
            {siteConfig.name}
          </Link>
        </footer>
      </div>
    </div>
  );
}
