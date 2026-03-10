import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LevelUpModal } from "./level-up-modal";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

vi.mock("@/utils/orpc", () => ({
  orpc: { gamification: { getProfile: { queryOptions: vi.fn(() => ({ queryKey: ["profile"] })) } } }
}));

// Mock canvas-confetti
vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

// Mock next-intl
vi.mock("next-intl", async () => {
  const actual = await vi.importActual("next-intl");
  return {
    ...actual,
    useTranslations: () => (key: string, params?: any) => {
      if (key === "levelLabel") return `Level ${params.level}`;
      return key;
    },
    useLocale: () => "en",
  };
});

// Mock level-utils
vi.mock("@/lib/level-utils", () => ({
  getLevelInfo: (level: number) => ({
    nameEn: "The Growing Sprout",
    nameVi: "Mầm non đang lớn",
  }),
}));

const messages = {
  levelUp: {
    title: "Level Up!",
    description: "You've reached a new milestone!",
    levelLabel: "Level {level}",
    awesome: "Awesome!",
  },
};

describe("LevelUpModal", () => {
  it("renders correctly when level is provided", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <LevelUpModal level={5} onClose={() => {}} />
        </NextIntlClientProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Level 5")).toBeInTheDocument();
    expect(screen.getByText("The Growing Sprout")).toBeInTheDocument();
    expect(screen.getByText("awesome")).toBeInTheDocument();
  });

  it("calls onClose when button is clicked", () => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <LevelUpModal level={5} onClose={onClose} />
        </NextIntlClientProvider>
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByText("awesome"));
    expect(onClose).toHaveBeenCalled();
  });

  it("returns null when level is null", () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <NextIntlClientProvider locale="en" messages={messages}>
          <LevelUpModal level={null} onClose={() => {}} />
        </NextIntlClientProvider>
      </QueryClientProvider>
    );

    expect(container.firstChild).toBeNull();
  });
});
