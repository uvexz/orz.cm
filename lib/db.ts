import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient | undefined;
}

// detect if we're in the Next.js build phase
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

function createRecursiveProxy(): any {
  return new Proxy(() => {}, {
    get: (target, prop) => {
      if (prop === "then") return undefined;
      return createRecursiveProxy();
    },
    apply: () => createRecursiveProxy(),
  });
}

export const prisma: PrismaClient =
  global.cachedPrisma ||
  new Proxy({} as PrismaClient, {
    get(target, prop, receiver) {
      if (isBuild) {
        return createRecursiveProxy();
      }
      if (!global.cachedPrisma) {
        global.cachedPrisma = new PrismaClient();
      }
      return Reflect.get(global.cachedPrisma, prop, receiver);
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.cachedPrisma = prisma;
}



