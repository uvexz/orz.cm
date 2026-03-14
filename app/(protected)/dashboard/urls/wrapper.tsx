"use client";

import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ApiReference from "@/components/shared/api-reference";

import Globe from "./globe";
import LiveLog from "./live-logs";
import UserUrlsList from "./url-list";
import type { UrlListViewer } from "./url-list.types";

export function Wrapper({
  user,
}: {
  user: UrlListViewer;
}) {
  const [tab, setTab] = useState("Links");
  return (
    <Tabs
      value={tab}
      onChangeCapture={(e) => console.log(e)}
      defaultValue={tab}
    >
      <TabsList>
        <TabsTrigger value="Links" onClick={() => setTab("Links")}>
          Links
        </TabsTrigger>
        <TabsTrigger value="Realtime" onClick={() => setTab("Realtime")}>
          Realtime
        </TabsTrigger>
      </TabsList>
      <TabsContent className="space-y-3" value="Links">
        <UserUrlsList
          user={{
            id: user.id,
            name: user.name || "",
            apiKey: user.apiKey || "",
            role: user.role,
            team: user.team || "",
          }}
          action="/api/url"
        />
        <LiveLog admin={false} />
        <ApiReference
          badge="POST /api/v1/short"
          target="creating short urls"
        />
      </TabsContent>
      <TabsContent value="Realtime">
        <Globe />
      </TabsContent>
    </Tabs>
  );
}
