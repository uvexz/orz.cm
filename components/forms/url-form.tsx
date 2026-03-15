"use client";

import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "@/lib/db/types";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";

import { ShortUrlFormData } from "@/lib/dto/short-urls";
import { EXPIRATION_ENUMS } from "@/lib/enums";
import { fetcher, generateUrlSuffix } from "@/lib/utils";
import { createUrlSchema } from "@/lib/validations/url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icons } from "@/components/shared/icons";

import { FormSectionColumns } from "../dashboard/form-section-columns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Skeleton } from "../ui/skeleton";

export type FormType = "add" | "edit";

export type FormData = ShortUrlFormData;

export interface RecordFormProps {
  user: Pick<User, "id" | "name" | "role">;
  isShowForm: boolean;
  setShowForm: Dispatch<SetStateAction<boolean>>;
  type: FormType;
  initData?: ShortUrlFormData | null;
  action: string;
  onRefresh: (id?: string) => void;
}

export function UrlForm({
  user,
  setShowForm,
  type,
  initData,
  action,
  onRefresh,
}: RecordFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [currentPrefix, setCurrentPrefix] = useState(initData?.prefix || "");
  const [limitLen, setLimitLen] = useState(3);
  const t = useTranslations("List");
  const isAdmin = user.role === "ADMIN";
  const [email, setEmail] = useState(initData?.user?.email);
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback;

  const {
    handleSubmit,
    register,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(createUrlSchema),
    defaultValues: {
      id: initData?.id || "",
      target: initData?.target || "",
      url: initData?.url || "",
      active: initData?.active || 1,
      prefix: initData?.prefix || "",
      visible: initData?.visible || 0,
      expiration: initData?.expiration || "-1",
      password: initData?.password || "",
    },
  });

  const { data: shortDomains, isLoading } = useSWR<
    { domain_name: string; min_url_length: number }[]
  >("/api/domain?feature=short", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  const hasShortDomains = (shortDomains?.length ?? 0) > 0;

  const validDefaultDomain = useMemo(() => {
    if (!shortDomains?.length) return undefined;

    if (
      initData?.prefix &&
      shortDomains.some((d) => d.domain_name === initData.prefix)
    ) {
      return initData.prefix;
    }

    return shortDomains[0].domain_name;
  }, [shortDomains, initData?.prefix]);

  useEffect(() => {
    if (validDefaultDomain) {
      setValue("prefix", validDefaultDomain);
      setCurrentPrefix(validDefaultDomain);
      return;
    }

    setValue("prefix", "");
    setCurrentPrefix("");
  }, [setValue, validDefaultDomain]);

  useEffect(() => {
    setLimitLen(
      shortDomains?.find((d) => d.domain_name === currentPrefix)
        ?.min_url_length || 3,
    );
  }, [currentPrefix, shortDomains]);

  const onSubmit = handleSubmit((data) => {
    if (type === "add") {
      handleCreateUrl(data);
    } else if (type === "edit") {
      handleUpdateUrl(data);
    }
  });

  const handleCreateUrl = async (data: ShortUrlFormData) => {
    const normalizedData = {
      ...data,
      target: data.target.trim(),
      url: data.url.trim(),
      prefix: data.prefix.trim(),
      password: data.password.trim(),
    };

    if (!hasShortDomains || !normalizedData.prefix) {
      toast.error(t("No domains configured"));
      return;
    }

    if (
      normalizedData.password !== "" &&
      normalizedData.password.length !== 6
    ) {
      toast.error("Password must be 6 characters!");
      return;
    }
    startTransition(async () => {
      try {
        const response = await fetch(`${action}/add`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: normalizedData,
          }),
        });
        if (!response.ok || response.status !== 200) {
          toast.error(t("Create failed"), {
            description: (await response.text()) || t("Please try again"),
          });
        } else {
          const res = await response.json();
          toast.success(t("Created successfully"));
          setShowForm(false);
          onRefresh(res.id);
        }
      } catch (error: unknown) {
        toast.error(t("Create failed"), {
          description: getErrorMessage(error, t("Please try again")),
        });
      }
    });
  };

  const handleUpdateUrl = async (data: ShortUrlFormData) => {
    const normalizedData = {
      ...data,
      target: data.target.trim(),
      url: data.url.trim(),
      prefix: data.prefix.trim(),
      password: data.password.trim(),
    };

    if (!hasShortDomains || !normalizedData.prefix) {
      toast.error(t("No domains configured"));
      return;
    }

    if (
      normalizedData.password !== "" &&
      normalizedData.password.length !== 6
    ) {
      toast.error("Password must be 6 characters!");
      return;
    }
    startTransition(async () => {
      if (type === "edit") {
        try {
          const response = await fetch(`${action}/update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: normalizedData,
              userId: initData?.userId,
              email: email?.trim(),
            }),
          });
          if (!response.ok || response.status !== 200) {
            toast.error(t("Update failed"), {
              description: (await response.text()) || t("Please try again"),
            });
          } else {
            await response.json();
            toast.success(t("Updated successfully"));
            setShowForm(false);
            onRefresh();
          }
        } catch (error: unknown) {
          toast.error(t("Update failed"), {
            description: getErrorMessage(error, t("Please try again")),
          });
        }
      }
    });
  };

  const handleDeleteUrl = async () => {
    if (type === "edit") {
      startDeleteTransition(async () => {
        try {
          const response = await fetch(`${action}/delete`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              url_id: initData?.id,
              userId: initData?.userId,
            }),
          });
          if (!response.ok || response.status !== 200) {
            toast.error(t("Delete failed"), {
              description: (await response.text()) || t("Please try again"),
            });
          } else {
            await response.json();
            toast.success(t("Deleted successfully"));
            setShowForm(false);
            onRefresh();
          }
        } catch (error: unknown) {
          toast.error(t("Delete failed"), {
            description: getErrorMessage(error, t("Please try again")),
          });
        }
      });
    }
  };

  return (
    <div>
      <div className="rounded-t-lg bg-muted px-4 py-2 text-lg font-semibold">
        {type === "add" ? t("Create short link") : t("Edit short link")}
      </div>
      <form className="p-4" onSubmit={onSubmit}>
        {isAdmin && type === "edit" && (
          <div className="items-center justify-start gap-4 md:flex">
            <FormSectionColumns required title={t("User email")}>
              <div className="flex w-full items-center gap-2">
                <Label className="sr-only" htmlFor="content">
                  {t("User email")}
                </Label>
                <Input
                  id="email"
                  className="flex-1 shadow-inner"
                  size={32}
                  type="email"
                  value={email || ""}
                  onChange={(e) => setEmail(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </FormSectionColumns>
          </div>
        )}
        <div className="items-center justify-start gap-4 md:flex">
          <FormSectionColumns title={t("Target URL")} required>
            <div className="flex w-full items-center gap-2">
              <Label className="sr-only" htmlFor="target">
                {t("Target")}
              </Label>
              <Input
                id="target"
                className="flex-1 shadow-inner"
                size={32}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                {...register("target")}
              />
            </div>
            <div className="flex flex-col justify-between p-1">
              {errors?.target ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.target.message}
                </p>
              ) : (
                <p className="pb-0.5 text-[13px] text-muted-foreground">
                  {t("Required")}. https://your-origin-url
                </p>
              )}
            </div>
          </FormSectionColumns>
          <FormSectionColumns title={t("Short Link")} required>
            <div className="flex w-full items-center gap-2">
              <Label className="sr-only" htmlFor="url">
                Url
              </Label>

              <div className="relative flex w-full items-center">
                {isLoading ? (
                  <Skeleton className="h-9 w-1/3 rounded-r-none border-r-0 shadow-inner" />
                ) : (
                  <Select
                    onValueChange={(value: string) => {
                      setValue("prefix", value);
                      setCurrentPrefix(value);
                    }}
                    name="prefix"
                    defaultValue={validDefaultDomain}
                    disabled={type === "edit" || !hasShortDomains}
                  >
                    <SelectTrigger className="w-1/3 rounded-r-none border-r-0 shadow-inner">
                      <SelectValue placeholder="Select a domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {shortDomains && shortDomains.length > 0 ? (
                        shortDomains.map((v) => (
                          <SelectItem key={v.domain_name} value={v.domain_name}>
                            {v.domain_name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {t("No domains configured")}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
                <Input
                  id="url"
                  className="w-full rounded-none pl-[8px] shadow-inner"
                  size={20}
                  minLength={limitLen}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  {...register("url")}
                  disabled={type === "edit" || !hasShortDomains}
                />
                <Button
                  className="rounded-l-none border-l-0"
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={type === "edit" || !hasShortDomains}
                  onClick={() => {
                    setValue("url", generateUrlSuffix(6));
                  }}
                >
                  <Sparkles className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
            </div>
            <div className="flex flex-col justify-between p-1">
              {errors?.url ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.url.message}
                </p>
              ) : !hasShortDomains ? (
                <p className="pb-0.5 text-[13px] text-amber-600">
                  {t("Short link domains missing description")}
                </p>
              ) : (
                <p className="pb-0.5 text-[13px] text-muted-foreground">
                  {t("A random url suffix")} ({t("Minimum")} {limitLen}).{" "}
                  {t("Final url like")}
                  「orz.cm/suffix」
                </p>
              )}
            </div>
          </FormSectionColumns>
        </div>

        <div className="items-center justify-start gap-4 md:flex">
          <FormSectionColumns title={`${t("Password")} (${t("Optional")})`}>
            <div className="flex w-full items-center gap-2">
              <Label className="sr-only" htmlFor="password">
                {t("Password")}
              </Label>
              <Input
                id="password"
                className="flex-1 shadow-inner"
                size={32}
                maxLength={6}
                type="password"
                placeholder={t("Enter 6 character password")}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                {...register("password")}
              />
            </div>
            <div className="flex flex-col justify-between p-1">
              {errors?.password ? (
                <p className="pb-0.5 text-[13px] text-red-600">
                  {errors.password.message}
                </p>
              ) : (
                <p className="pb-0.5 text-[13px] text-muted-foreground">
                  {t("Optional")}. {t("If you want to protect your link")}.
                </p>
              )}
            </div>
          </FormSectionColumns>
          <FormSectionColumns title={t("Expiration")} required>
            <Select
              onValueChange={(value: string) => {
                setValue("expiration", value);
              }}
              name="expiration"
              defaultValue={initData?.expiration || "-1"}
            >
              <SelectTrigger className="w-full shadow-inner">
                <SelectValue placeholder="Select a time range" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_ENUMS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="p-1 text-[13px] text-muted-foreground">
              {t("Expiration time, default for never")}.
            </p>
          </FormSectionColumns>
        </div>

        {/* Action buttons */}
        <div className="mt-3 flex justify-end gap-3">
          {type === "edit" && (
            <Button
              type="button"
              variant="destructive"
              className="mr-auto w-[80px] px-0"
              onClick={() => handleDeleteUrl()}
              disabled={isDeleting || isPending}
            >
              {isDeleting ? (
                <Icons.spinner className="size-4 animate-spin" />
              ) : (
                <p>{t("Delete")}</p>
              )}
            </Button>
          )}
          <Button
            type="reset"
            variant="outline"
            className="w-[80px] px-0"
            onClick={() => setShowForm(false)}
            disabled={isDeleting || isPending}
          >
            {t("Cancel")}
          </Button>
          <Button
            type="submit"
            variant="blue"
            disabled={isPending || isDeleting || !hasShortDomains}
            className="w-[80px] shrink-0 px-0"
          >
            {isPending ? (
              <Icons.spinner className="size-4 animate-spin" />
            ) : (
              <p>{type === "edit" ? t("Update") : t("Save")}</p>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
