export const shouldHideWatchHeader=(pathname,scrollY)=>pathname.startsWith('/watch/')&&Number(scrollY)>64;
