import { useLocale } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";

export function TimeAgoIntl({ date }: { date: Date }) {
  const locale = useLocale();

  return (
    <span className="text-nowrap">
      {formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: locale === "zh" ? zhCN : enUS,
      })}
    </span>
  );
}
