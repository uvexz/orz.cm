import darkPreview from "@/public/_static/images/dark-preview.png";
import lightPreview from "@/public/_static/images/light-preview.png";

import BlurImage from "@/components/shared/blur-image";
import MaxWidthWrapper from "@/components/shared/max-width-wrapper";

export default function PreviewLanding() {
  return (
    <div className="pb-4 sm:pb-8">
      <MaxWidthWrapper>
        <div className="h-auto rounded-2xl border border-border/70 bg-muted/20 p-2 sm:p-3">
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-background">
            <BlurImage
              src={lightPreview}
              alt="Dashboard overview in light mode"
              className="flex size-full object-contain object-center dark:hidden"
              width={1500}
              height={750}
              priority
              placeholder="blur"
            />
            <BlurImage
              src={darkPreview}
              alt="Dashboard overview in dark mode"
              className="hidden size-full object-contain object-center dark:flex"
              width={1500}
              height={750}
              priority
              placeholder="blur"
            />
          </div>
        </div>
      </MaxWidthWrapper>
    </div>
  );
}
