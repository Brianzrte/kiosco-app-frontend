"use client";

import { useRouter } from "next/navigation";

const PENDING_EVENT = "mini-moni:navigation-pending";
const CANCEL_EVENT = "mini-moni:navigation-cancel";

function announcePending(href: string) {
  window.dispatchEvent(
    new CustomEvent(PENDING_EVENT, { detail: { href } }),
  );
}

function cancelPending() {
  window.dispatchEvent(new Event(CANCEL_EVENT));
}

/**
 * Router facade for UI-initiated navigation. It announces before handing the
 * route to Next, so slow destinations provide feedback from the click/row
 * activation onward without treating ordinary in-page pending work as route
 * work.
 */
export function useNavigationRouter() {
  const router = useRouter();

  return {
    push(href: string) {
      announcePending(href);
      try {
        router.push(href);
      } catch (error) {
        cancelPending();
        throw error;
      }
    },
    replace(href: string) {
      announcePending(href);
      try {
        router.replace(href);
      } catch (error) {
        cancelPending();
        throw error;
      }
    },
    refresh: router.refresh,
  };
}

export { CANCEL_EVENT, PENDING_EVENT };
