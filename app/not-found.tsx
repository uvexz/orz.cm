import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-5xl font-bold sm:text-6xl">404</h1>
      <Image
        src="/_static/illustrations/rocket-crashed.svg"
        alt="404"
        width={300}
        height={300}
        className="pointer-events-none mb-5 mt-6 size-64 sm:size-auto sm:w-96 sm:h-96 dark:invert"
      />
      <p className="text-balance px-4 text-center text-lg font-medium sm:text-xl md:text-2xl">
        Page not found. Back to{" "}
        <Link
          href="/"
          className="text-muted-foreground underline underline-offset-4 hover:text-blue-500"
        >
          Homepage
        </Link>
        .
      </p>
    </div>
  );
}
