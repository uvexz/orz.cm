import { siteConfig } from "@/config/site";
import { constructMetadata } from "@/lib/utils";

export const metadata = constructMetadata({
  title: `${siteConfig.name} - 短链接及临时邮箱`,
  description: `${siteConfig.name} 提供短链接及临时邮箱服务`,
});

export default function IndexPage() {
  return (
    <section className="flex min-h-[calc(100vh-10rem)] items-center">
      <div className="container flex max-w-screen-lg flex-col items-center gap-5 py-24 text-center">
        <h1 className="max-w-4xl break-words text-balance font-satoshi text-[40px] font-black leading-[1.15] tracking-tight sm:text-5xl md:text-6xl md:leading-[1.15]">
          {siteConfig.name}
          <span className="mt-2 block text-foreground/72">
            {" 短链接及临时邮箱"}
          </span>
        </h1>
        <p className="max-w-2xl text-balance break-words text-sm text-muted-foreground sm:text-base">
          {siteConfig.description}
        </p>
      </div>
    </section>
  );
}
