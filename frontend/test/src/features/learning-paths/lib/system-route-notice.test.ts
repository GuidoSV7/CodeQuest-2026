import { describe, expect, it, vi } from "vitest";
import {
  deliverSystemNotice,
  type SystemNoticeChannel,
} from "@/features/learning-paths/lib/system-route-notice";

function channel(permission: SystemNoticeChannel["permission"]): SystemNoticeChannel & {
  requestPermission: ReturnType<typeof vi.fn>;
  show: ReturnType<typeof vi.fn>;
} {
  return {
    permission,
    requestPermission: vi.fn(async () => "granted" as const),
    show: vi.fn(),
  };
}

describe("deliverSystemNotice", () => {
  it("shows an app-style notice when the browser already allowed it", async () => {
    const notices = channel("granted");
    await deliverSystemNotice("Se armó la ruta Ruta React.", notices);
    expect(notices.requestPermission).not.toHaveBeenCalled();
    expect(notices.show).toHaveBeenCalledWith("CodeQuest", "Se armó la ruta Ruta React.");
  });

  it("asks once when permission is still undecided", async () => {
    const notices = channel("default");
    await deliverSystemNotice("Se armó una ruta.", notices);
    expect(notices.requestPermission).toHaveBeenCalledOnce();
    expect(notices.show).toHaveBeenCalledWith("CodeQuest", "Se armó una ruta.");
  });

  it("keeps quiet when the person denied notices or the browser has none", async () => {
    const denied = channel("denied");
    await deliverSystemNotice("Se armó una ruta.", denied);
    expect(denied.show).not.toHaveBeenCalled();

    const missing = channel("unsupported");
    await deliverSystemNotice("Se armó una ruta.", missing);
    expect(missing.show).not.toHaveBeenCalled();
    expect(missing.requestPermission).not.toHaveBeenCalled();
  });
});
