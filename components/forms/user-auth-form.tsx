"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod";

import { authClient } from "@/lib/auth-client";
import { cn, fetcher } from "@/lib/utils";
import { userPasswordAuthSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Icons } from "@/components/shared/icons";

import { Skeleton } from "../ui/skeleton";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

type FormData2 = z.infer<typeof userPasswordAuthSchema>;

interface AuthFeatureFlags {
  google: boolean;
  github: boolean;
  linuxdo: boolean;
  resend: boolean;
  credentials: boolean;
  registration: boolean;
  enableSuffixLimit: boolean;
  suffixWhiteList: string;
}

function getAuthErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code?: unknown }).code || "Unknown");
  }

  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message || "Unknown");
  }

  return "Unknown";
}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const form = useForm<FormData2>({
    resolver: zodResolver(userPasswordAuthSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const [isLoading, startTransition] = React.useTransition();
  const [isGoogleLoading, setIsGoogleLoading] = React.useState<boolean>(false);
  const [isGithubLoading, setIsGithubLoading] = React.useState<boolean>(false);
  const [isLinuxDoLoading, setIsLinuxDoLoading] =
    React.useState<boolean>(false);
  const [suffixWhiteList, setSuffixWhiteList] = React.useState<string[]>([]);
  const searchParams = useSearchParams();

  const t = useTranslations("Auth");
  const callbackURL = searchParams?.get("from") || "/dashboard";

  const { data: loginMethod, isLoading: isLoadingMethod } = useSWR<AuthFeatureFlags>(
    "/api/feature",
    fetcher,
    {
    revalidateOnFocus: false,
  });

  React.useEffect(() => {
    if (
      loginMethod &&
      loginMethod.enableSuffixLimit &&
      loginMethod.suffixWhiteList.length > 0
    ) {
      setSuffixWhiteList(loginMethod.suffixWhiteList.split(","));
    }
  }, [loginMethod]);

  const checkEmailSuffix = (email: string) => {
    if (suffixWhiteList.length > 0) {
      const suffix = email.split("@")[1];
      if (!suffixWhiteList.includes(suffix)) {
        toast.warning(
          t("Email domain not supported, Please use one of the following:"),
          {
            description: suffixWhiteList.join(", "),
          },
        );
        return false;
      }
    }
    return true;
  };

  async function onSubmitPwd(data: FormData2) {
    if (!checkEmailSuffix(data.email)) return;
    startTransition(async () => {
      const email = data.email.toLowerCase();

      const signInResult = await authClient.signIn.email({
        email,
        password: data.password,
        callbackURL,
        rememberMe: true,
      });
      let authError: unknown = signInResult.error;

      if (authError) {
        const bootstrapResponse = await fetch("/api/auth/credentials", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: data.name,
            email,
            password: data.password,
          }),
        });

        if (bootstrapResponse.ok) {
          const retryResult = await authClient.signIn.email({
            email,
            password: data.password,
            callbackURL,
            rememberMe: true,
          });

          authError = retryResult.error;
        } else {
          authError = await bootstrapResponse.text();
        }
      }

      if (authError) {
        const errorMaps = {
          Configuration: t("Auth configuration error"),
          CredentialsSignin: t("Incorrect email or password"),
          INVALID_EMAIL_OR_PASSWORD: t("Incorrect email or password"),
          "User registration is disabled": t(
            "Administrator has disabled new user registration",
          ),
        };
        const errorCode =
          typeof authError === "string"
            ? authError
            : getAuthErrorCode(authError);
        const errorMessage =
          errorMaps[errorCode] || t("Unknown error");
        toast.error(t("Something went wrong"), {
          description: `[${errorCode}] ${errorMessage}.`,
        });
      } else {
        toast.success(t("Welcome back!"));
        window.location.href = callbackURL;
      }
    });
  }

  const rendeSeparator = () => {
    return (
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t("Or continue with")}
          </span>
        </div>
      </div>
    );
  };

  if (isLoadingMethod || !loginMethod) {
    return (
      <div className={cn("grid gap-3", className)} {...props}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        {rendeSeparator()}
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const rendeCredentials = () =>
    loginMethod.credentials && (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmitPwd)}>
          <div className="grid gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="sr-only">Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="email@example.com"
                      type="email"
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect="off"
                      disabled={isLoading || isGoogleLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="px-1 text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="sr-only">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      autoCapitalize="none"
                      autoComplete="current-password"
                      autoCorrect="off"
                      disabled={isLoading || isGoogleLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="px-1 text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="my-2"
              disabled={isLoading || isGoogleLoading || isGithubLoading}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 size-4 animate-spin" />
              )}
              {t("Sign In / Sign Up")}
            </Button>

            {/* <p className="rounded-md border border-dashed bg-muted px-3 py-2 text-xs text-muted-foreground">
              📢 {t("Unregistered users will automatically create an account")}.
            </p> */}
          </div>
        </form>
      </Form>
    );

  return (
    <div className={cn("grid gap-3", className)} {...props}>
      {!loginMethod.registration && (
        <p className="rounded-md border border-dashed bg-muted p-3 text-sm text-muted-foreground">
          📢 {t("Administrator has disabled new user registration")}.
        </p>
      )}

      {loginMethod.credentials && <>{rendeCredentials()}</>}

      {(loginMethod.google ||
        loginMethod.github ||
        loginMethod.linuxdo) &&
        (loginMethod.resend || loginMethod.credentials) &&
        rendeSeparator()}

      {loginMethod.google && (
        <Button
          variant="outline"
          type="button"
          onClick={async () => {
            setIsGoogleLoading(true);
            const { error } = await authClient.signIn.social({
              provider: "google",
              callbackURL,
            });

            if (error) {
              setIsGoogleLoading(false);
              toast.error(t("Something went wrong"), {
                description: `[${getAuthErrorCode(error)}] ${t("Unknown error")}.`,
              });
            }
          }}
          disabled={
            !loginMethod.registration ||
            isLoading ||
            isGoogleLoading ||
            isGithubLoading ||
            isLinuxDoLoading
          }
        >
          {isGoogleLoading ? (
            <Icons.spinner className="mr-2 size-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 size-4" />
          )}{" "}
          Google
        </Button>
      )}
      {loginMethod.github && (
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            setIsGithubLoading(true);
            const { error } = await authClient.signIn.social({
              provider: "github",
              callbackURL,
            });

            if (error) {
              setIsGithubLoading(false);
              toast.error(t("Something went wrong"), {
                description: `[${getAuthErrorCode(error)}] ${t("Unknown error")}.`,
              });
            }
          }}
          disabled={
            !loginMethod.registration ||
            isLoading ||
            isGithubLoading ||
            isGoogleLoading ||
            isLinuxDoLoading
          }
        >
          {isGithubLoading ? (
            <Icons.spinner className="mr-2 size-4 animate-spin" />
          ) : (
            <Icons.github className="mr-2 size-4" />
          )}{" "}
          Github
        </Button>
      )}
      {loginMethod.linuxdo && (
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            setIsLinuxDoLoading(true);
            const { error } = await authClient.signIn.oauth2({
              providerId: "linuxdo",
              callbackURL,
            });

            if (error) {
              setIsLinuxDoLoading(false);
              toast.error(t("Something went wrong"), {
                description: `[${getAuthErrorCode(error)}] ${t("Unknown error")}.`,
              });
            }
          }}
          disabled={
            !loginMethod.registration ||
            isLoading ||
            isGithubLoading ||
            isGoogleLoading ||
            isLinuxDoLoading
          }
        >
          {isLinuxDoLoading ? (
            <Icons.spinner className="mr-2 size-4 animate-spin" />
          ) : (
            <img
              src="/_static/images/linuxdo.webp"
              alt="linuxdo"
              className="mr-2 size-4"
            />
          )}{" "}
          LinuxDo
        </Button>
      )}

      {/* {loginMethod["resend"] && loginMethod["credentials"] ? (
        <Tabs defaultValue="resend">
          <TabsList className="mb-2 w-full justify-center">
            <TabsTrigger value="resend">{t("Email Code")}</TabsTrigger>
            <TabsTrigger value="password">{t("Password")}</TabsTrigger>
          </TabsList>
          <TabsContent value="resend">{rendeResend()}</TabsContent>
          <TabsContent value="password">{rendeCredentials()}</TabsContent>
        </Tabs>
      ) : (
        <>
          {rendeResend()}
          {rendeCredentials()}
        </>
      )} */}
    </div>
  );
}
